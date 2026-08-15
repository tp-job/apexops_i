import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { encrypt, isConfigured, mask } from '../lib/crypto';

/**
 * BYOK provider-key management (spec F004, F005).
 *
 * ## The one rule this file exists to enforce
 *
 * **A plaintext key enters here and never leaves.** It is encrypted before it
 * touches the database and only `maskedKey` is ever returned. Every `select`
 * below names its columns explicitly rather than taking Prisma's default, which
 * would return `ciphertext` — a default that would be silently wrong the day
 * someone adds a field.
 *
 * ## Validate before you write, and probe cheaply
 *
 * `PUT` proves the key against the provider *before* storing it, so a typo is
 * caught while the user is still looking at the dialog rather than on their
 * first message. The probe is a **list-models** call, not a generation call:
 * it proves the credential without spending a token of the user's quota.
 *
 * The write happens only after the probe passes. A rejected key must leave the
 * table exactly as it found it — F004 verifies that with a row count.
 *
 * ## The key travels in a header, never a query parameter
 *
 * `api/ai.ts` documents the hazard: a `fetch` failure's `err.message` can carry
 * the request URL, and Google's documented `?key=` form puts the credential in
 * that URL. `x-goog-api-key` removes the whole leak class — the key cannot end
 * up in an error string, a redirect, or a proxy access log that only records
 * paths. Same result, one fewer way to lose the secret.
 */
const router = express.Router();

/** Same host and version `api/ai.ts` talks to. */
const MODELS_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/** v1 constrains this to one value; the column exists for the next one (D3). */
const SUPPORTED_PROVIDERS = ['gemini'] as const;
type Provider = (typeof SUPPORTED_PROVIDERS)[number];

/**
 * Cheap structural rejects, before the network call.
 *
 * Deliberately loose — this catches a pasted sentence or a truncated key, not a
 * revoked one. Being strict about a vendor's key format is how you reject a
 * valid key the day they change it, so the provider stays the real authority.
 */
function looksLikeGeminiKey(value: unknown): value is string {
    return typeof value === 'string' && value.length >= 20 && value.length <= 200 && !/\s/.test(value);
}

/** The only shape allowed out of this module. */
const publicShape = (row: { provider: string; maskedKey: string; verifiedAt: Date | null; updatedAt: Date }) => ({
    provider: row.provider,
    maskedKey: row.maskedKey,
    verifiedAt: row.verifiedAt,
    updatedAt: row.updatedAt,
});

/**
 * Ask the provider whether this credential is real.
 *
 * Returns a plain boolean rather than the provider's message: the caller must
 * not be able to leak vendor text to the client by accident, and "is this key
 * good" is genuinely all we need to decide.
 */
async function probeGeminiKey(apiKey: string): Promise<{ ok: true } | { ok: false; reason: string }> {
    try {
        const res = await fetch(MODELS_URL, {
            method: 'GET',
            headers: { 'x-goog-api-key': apiKey },
            signal: AbortSignal.timeout(10_000),
        });

        if (res.ok) return { ok: true };

        // 400/401/403 all mean "not a usable key" from our point of view.
        const body: any = await res.json().catch(() => ({}));
        // Logged, never returned. Vendor text has told callers more than we want
        // before — see the 401 handling in `api/ai.ts`.
        console.warn('[ai-key] provider rejected a key during validation:', res.status, body?.error?.status);
        return { ok: false, reason: 'rejected' };
    } catch (err) {
        // A timeout or a network failure is NOT proof the key is bad, and must
        // not be reported as such — the user would delete a perfectly good key.
        console.error('[ai-key] provider unreachable during validation:', (err as Error).name);
        return { ok: false, reason: 'unreachable' };
    }
}

// ── GET /key ─────────────────────────────────────────────────
/**
 * Absence is a normal state, so this answers `200` with `null` rather than 404.
 * A 404 here would make "you have not added a key" indistinguishable from "this
 * endpoint is missing" in the client's error handling.
 */
router.get('/key', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const row = await prisma.userAiKey.findUnique({
            where: { userId: req.user!.id },
            // Explicit. `ciphertext`, `iv` and `authTag` are deliberately absent
            // and must stay absent.
            select: { provider: true, maskedKey: true, verifiedAt: true, updatedAt: true },
        });

        res.json({ key: row ? publicShape(row) : null });
    } catch (err) {
        console.error('[ai-key] GET failed:', err);
        res.status(500).json({ error: 'Failed to read the stored key', code: 'READ_FAILED' });
    }
});

// ── PUT /key ─────────────────────────────────────────────────
router.put('/key', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        if (!isConfigured()) {
            // 503, not 500: correctly-formed request, server not set up. There is
            // no fallback that stores the key unencrypted — that is the point.
            res.status(503).json({
                error: 'Key storage is not configured on this server',
                code: 'NOT_CONFIGURED',
            });
            return;
        }

        const { provider = 'gemini', apiKey } = (req.body ?? {}) as { provider?: unknown; apiKey?: unknown };

        if (typeof provider !== 'string' || !SUPPORTED_PROVIDERS.includes(provider as Provider)) {
            res.status(400).json({
                error: `Unsupported provider. Supported: ${SUPPORTED_PROVIDERS.join(', ')}`,
                code: 'INVALID_PROVIDER',
            });
            return;
        }

        if (!looksLikeGeminiKey(apiKey)) {
            res.status(400).json({ error: 'That does not look like an API key', code: 'INVALID_KEY' });
            return;
        }

        const probe = await probeGeminiKey(apiKey);
        if (!probe.ok) {
            if (probe.reason === 'unreachable') {
                // Explicitly NOT 400. The key may be perfectly good; we could not
                // ask. Telling the user it is invalid would be a lie that costs
                // them a working credential.
                res.status(503).json({
                    error: 'Could not reach the AI provider to verify the key. Try again shortly.',
                    code: 'PROVIDER_UNREACHABLE',
                });
                return;
            }
            res.status(400).json({ error: 'The provider rejected that API key', code: 'INVALID_KEY' });
            return;
        }

        // Only now does anything get written.
        const sealed = encrypt(apiKey);
        const row = await prisma.userAiKey.upsert({
            where: { userId: req.user!.id },
            create: {
                userId: req.user!.id,
                provider,
                ...sealed,
                maskedKey: mask(apiKey),
                verifiedAt: new Date(),
            },
            update: {
                provider,
                ...sealed,
                maskedKey: mask(apiKey),
                verifiedAt: new Date(),
            },
            select: { provider: true, maskedKey: true, verifiedAt: true, updatedAt: true },
        });

        res.json({ key: publicShape(row) });
    } catch (err) {
        // Never echo: an encryption or Prisma error can carry parameter values,
        // and one of those parameters is the key.
        console.error('[ai-key] PUT failed:', (err as Error).message);
        res.status(500).json({ error: 'Failed to store the key', code: 'WRITE_FAILED' });
    }
});

// ── DELETE /key ──────────────────────────────────────────────
/**
 * Idempotent: deleting a key you do not have is a success, not a 404. The caller
 * wanted "no key stored", and that is the state they end in either way.
 */
router.delete('/key', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        await prisma.userAiKey.deleteMany({ where: { userId: req.user!.id } });
        res.json({ key: null });
    } catch (err) {
        console.error('[ai-key] DELETE failed:', err);
        res.status(500).json({ error: 'Failed to delete the key', code: 'DELETE_FAILED' });
    }
});

export default router;
