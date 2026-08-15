import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

/**
 * Envelope encryption for user-supplied provider API keys (BYOK, spec F001).
 *
 * ## Why this file exists
 *
 * Sprint 11 lets each user spend their own Gemini key instead of the one org-wide
 * `GEMINI_API_KEY`. That key is a bearer credential for someone else's paid
 * account, so it cannot sit in a column in the clear — a database dump would be a
 * billing incident for every user at once.
 *
 * **This is the only module in the server that ever holds plaintext key
 * material.** `api/ai-key.ts` hands it in and never keeps it; `api/ai.ts` gets it
 * back for exactly the length of one outbound call. Nothing else should import
 * `encrypt`/`decrypt`. If a second call site appears, that is the review moment.
 *
 * ## Why not just hash it
 *
 * The usual advice — never store a secret you can reverse — assumes you only need
 * to *check* the secret later. We need to *send* it to Google. Reversible
 * encryption is therefore the requirement, not a shortcut, and the honest framing
 * is: this moves the secret from "readable by anyone with the database" to
 * "readable by anyone with the database **and** `AI_KEY_SECRET`". That is a real
 * reduction and it is not the same as safety. It is why the secret is separate
 * from `JWT_SECRET` (below), and why there is no admin path that reads a key.
 *
 * ## AES-256-GCM, not CBC
 *
 * GCM is authenticated: the tag proves the ciphertext was not altered. With CBC a
 * tampered row decrypts to *something*, and that something gets sent to a
 * provider as if the user had typed it. Here a tampered row throws, and the
 * caller treats it as "no key" (see `api/ai.ts` `resolveKey`).
 *
 * A fresh 12-byte IV per write is mandatory, not incidental: reusing an IV under
 * the same key breaks GCM catastrophically — it leaks the XOR of two plaintexts
 * and can expose the authentication subkey. `randomBytes(12)` on every `encrypt`
 * is the whole defense, so never "optimise" it into a constant.
 */

const ALGORITHM = 'aes-256-gcm';
/** AES-256 takes a 32-byte key. Not negotiable. */
const KEY_BYTES = 32;
/** 96 bits is the GCM-recommended IV size — the only one with proven bounds. */
const IV_BYTES = 12;

/** Matches `lib/jwtSecrets.ts`, so operators meet one rule, not two. */
const MIN_SECRET_LENGTH = 32;

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Development-only default, deliberately obvious rather than random.
 *
 * A per-boot random secret would make every key stored yesterday undecryptable
 * today, so local work would be a permanent "re-enter your key" loop. This is
 * safe *only* because production cannot reach this branch — same argument, same
 * shape, as `DEV_FALLBACKS` in `lib/jwtSecrets.ts`.
 */
const DEV_FALLBACK = 'dev-only-ai-key-encryption-secret-not-for-production';

/**
 * Read per call, not captured at import.
 *
 * Copied deliberately from `api/ai.ts`'s `apiKey()`. Capturing at import makes
 * the module untestable without module-registry surgery, and lets a process
 * report a configuration it no longer has.
 */
function resolveSecret(): string {
    const value = process.env.AI_KEY_SECRET;

    if (isProduction) {
        if (!value) {
            throw new Error(
                '[startup] AI_KEY_SECRET is not set. Refusing to encrypt in production: ' +
                    'without it, user API keys would be protected by a value committed to this repository.'
            );
        }
        if (value.length < MIN_SECRET_LENGTH) {
            throw new Error(
                `[startup] AI_KEY_SECRET must be at least ${MIN_SECRET_LENGTH} characters ` +
                    `(got ${value.length}). Refusing to encrypt in production.`
            );
        }
        if (value === process.env.JWT_SECRET) {
            // Not merely untidy. One secret protecting both session forgery and
            // stored credentials means a single leak costs both, and rotating
            // for one reason silently destroys the other.
            throw new Error(
                '[startup] AI_KEY_SECRET must differ from JWT_SECRET. ' +
                    'Sharing one secret across signing and encryption means one leak compromises both.'
            );
        }
        return value;
    }

    if (!value) {
        console.warn(
            '[startup] AI_KEY_SECRET is not set — using a development default. ' +
                'This will refuse to encrypt when NODE_ENV=production.'
        );
        return DEV_FALLBACK;
    }
    if (value === process.env.JWT_SECRET) {
        console.warn('[startup] AI_KEY_SECRET matches JWT_SECRET. Use a separate secret before deploying.');
    }
    return value;
}

/**
 * Fixed salt, and the reason is worth stating because a constant salt is usually
 * a bug.
 *
 * scrypt's salt exists to stop one rainbow table covering every user of a *low*
 * entropy input — a password. The input here is a 32+ character server secret
 * that no table covers, so the salt is doing domain separation, not
 * anti-precomputation. A per-record salt would have to be stored next to the
 * ciphertext and would buy nothing, because every record already has its own IV.
 */
const KDF_SALT = Buffer.from('apexops.ai-key.v1');

/**
 * Derivation is deterministic and scrypt is deliberately expensive (~100 ms), so
 * doing it per request would put that cost on every AI message. Cached against
 * the secret that produced it, so a test — or a rotation — that changes the env
 * re-derives instead of silently using the old key.
 */
let cached: { secret: string; key: Buffer } | null = null;

function derivedKey(): Buffer {
    const secret = resolveSecret();
    if (cached && cached.secret === secret) return cached.key;

    const key = scryptSync(secret, KDF_SALT, KEY_BYTES);
    cached = { secret, key };
    return key;
}

/**
 * What gets persisted. All three are base64 — chosen once, here, because Node's
 * default for `Buffer.toString()` is hex and mixing the two produces a value that
 * round-trips in a test and fails in production.
 */
export interface SealedKey {
    ciphertext: string;
    iv: string;
    authTag: string;
}

/** True when a real (non-fallback) secret is configured — drives the 503 path. */
export function isConfigured(): boolean {
    return typeof process.env.AI_KEY_SECRET === 'string' && process.env.AI_KEY_SECRET.length >= MIN_SECRET_LENGTH;
}

export function encrypt(plaintext: string): SealedKey {
    if (typeof plaintext !== 'string' || plaintext.length === 0) {
        throw new Error('encrypt() requires a non-empty string');
    }

    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, derivedKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

    return {
        ciphertext: ciphertext.toString('base64'),
        iv: iv.toString('base64'),
        authTag: cipher.getAuthTag().toString('base64'),
    };
}

/**
 * Throws on any tampering, wrong secret, or malformed input.
 *
 * Callers must treat a throw as "there is no usable key" and fall through —
 * never as a fatal error. A user whose row was corrupted, or whose key was
 * encrypted under a rotated secret, should land on "add your API key", not on a
 * 500.
 */
export function decrypt(sealed: SealedKey): string {
    const { ciphertext, iv, authTag } = sealed ?? ({} as SealedKey);
    if (!ciphertext || !iv || !authTag) {
        throw new Error('decrypt() requires ciphertext, iv and authTag');
    }

    const decipher = createDecipheriv(ALGORITHM, derivedKey(), Buffer.from(iv, 'base64'));
    // Set before `final()`: this is what makes `final()` throw on a tampered
    // payload rather than returning plausible garbage.
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));

    return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8');
}

/**
 * The only form of a key that may leave the server.
 *
 * Four characters at each end is enough for a human to recognise which key they
 * pasted and far too little to reconstruct it. Short inputs are masked whole
 * rather than partially — a 10-character "key" revealing 8 of its characters is
 * the failure this guard exists for.
 */
export function mask(apiKey: string): string {
    if (typeof apiKey !== 'string' || apiKey.length < 12) return '••••••••';
    return `${apiKey.slice(0, 4)}…${apiKey.slice(-4)}`;
}
