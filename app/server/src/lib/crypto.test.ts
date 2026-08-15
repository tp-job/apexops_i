import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { decrypt, encrypt, isConfigured, mask, type SealedKey } from './crypto';

/**
 * Envelope encryption for BYOK provider keys (F001).
 *
 * These are the six verification steps from the ledger, and the tamper case is
 * the one that matters: it is the difference between AES-GCM and a mode that
 * hands a caller plausible garbage. An assertion that has never been seen to
 * fail has proven nothing, so `decrypt` is exercised against a payload that was
 * altered in each of its three parts independently.
 */

const REAL_SECRET = 'test-secret-that-is-long-enough-to-pass-32';
const OTHER_SECRET = 'a-completely-different-secret-of-sufficient-length';
const SAMPLE_KEY = 'AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ0123456';

let savedSecret: string | undefined;

beforeEach(() => {
    savedSecret = process.env.AI_KEY_SECRET;
    process.env.AI_KEY_SECRET = REAL_SECRET;
});

afterEach(() => {
    if (savedSecret === undefined) delete process.env.AI_KEY_SECRET;
    else process.env.AI_KEY_SECRET = savedSecret;
});

describe('encrypt / decrypt round trip', () => {
    it('returns the exact original string', () => {
        expect(decrypt(encrypt(SAMPLE_KEY))).toBe(SAMPLE_KEY);
    });

    it('survives unicode and long input', () => {
        const awkward = 'ключ-🔐-ทดสอบ-' + 'x'.repeat(4000);
        expect(decrypt(encrypt(awkward))).toBe(awkward);
    });

    it('never emits the plaintext inside the sealed payload', () => {
        const sealed = encrypt(SAMPLE_KEY);
        // The point of the exercise. If any encoding step were a no-op, the key
        // would sit in the column in the clear and every other test would pass.
        expect(JSON.stringify(sealed)).not.toContain(SAMPLE_KEY);
        expect(JSON.stringify(sealed)).not.toContain(SAMPLE_KEY.slice(8, 24));
    });

    it('encodes all three parts as base64, not hex', () => {
        const sealed = encrypt(SAMPLE_KEY);
        const base64 = /^[A-Za-z0-9+/]+={0,2}$/;
        expect(sealed.ciphertext).toMatch(base64);
        expect(sealed.iv).toMatch(base64);
        expect(sealed.authTag).toMatch(base64);
        // 12 raw bytes -> 16 base64 characters. Hex would be 24, and a mismatch
        // here is the defect that round-trips locally and fails in production.
        expect(sealed.iv).toHaveLength(16);
        expect(Buffer.from(sealed.iv, 'base64')).toHaveLength(12);
    });
});

describe('IV freshness', () => {
    it('produces a different iv and ciphertext for identical input', () => {
        const a = encrypt(SAMPLE_KEY);
        const b = encrypt(SAMPLE_KEY);
        // Reusing an IV under one key breaks GCM catastrophically. This is the
        // assertion guarding against someone "optimising" randomBytes away.
        expect(a.iv).not.toBe(b.iv);
        expect(a.ciphertext).not.toBe(b.ciphertext);
        expect(decrypt(a)).toBe(decrypt(b));
    });

    it('produces no duplicate ivs across many encrypts', () => {
        const ivs = new Set(Array.from({ length: 200 }, () => encrypt(SAMPLE_KEY).iv));
        expect(ivs.size).toBe(200);
    });
});

describe('tamper detection (FAILURE CASES)', () => {
    /** Flip one base64 character so the value stays well-formed but differs. */
    const corrupt = (value: string): string => {
        const i = value.length - 2;
        const swap = value[i] === 'A' ? 'B' : 'A';
        return value.slice(0, i) + swap + value.slice(i + 1);
    };

    it('throws when the authTag is altered', () => {
        const sealed = encrypt(SAMPLE_KEY);
        expect(() => decrypt({ ...sealed, authTag: corrupt(sealed.authTag) })).toThrow();
    });

    it('throws when the ciphertext is altered', () => {
        const sealed = encrypt(SAMPLE_KEY);
        expect(() => decrypt({ ...sealed, ciphertext: corrupt(sealed.ciphertext) })).toThrow();
    });

    it('throws when the iv is altered', () => {
        const sealed = encrypt(SAMPLE_KEY);
        expect(() => decrypt({ ...sealed, iv: corrupt(sealed.iv) })).toThrow();
    });

    it('throws when decrypted under a different secret', () => {
        const sealed = encrypt(SAMPLE_KEY);
        process.env.AI_KEY_SECRET = OTHER_SECRET;
        // Rotation makes stored keys unreadable. Callers must treat this as
        // "no key" and fall through, never as a 500.
        expect(() => decrypt(sealed)).toThrow();
    });

    it('throws on a missing or malformed payload', () => {
        expect(() => decrypt({} as SealedKey)).toThrow();
        expect(() => decrypt({ ciphertext: 'x', iv: '', authTag: 'y' } as SealedKey)).toThrow();
        expect(() => decrypt(null as unknown as SealedKey)).toThrow();
    });

    it('refuses to encrypt empty input rather than sealing nothing', () => {
        expect(() => encrypt('')).toThrow();
        expect(() => encrypt(undefined as unknown as string)).toThrow();
    });
});

describe('isConfigured', () => {
    it('is false when the secret is absent or too short', () => {
        delete process.env.AI_KEY_SECRET;
        expect(isConfigured()).toBe(false);

        process.env.AI_KEY_SECRET = 'too-short';
        expect(isConfigured()).toBe(false);
    });

    it('is true for a secret of sufficient length', () => {
        expect(isConfigured()).toBe(true);
    });

    it('does not fall back to storing plaintext when unconfigured', () => {
        // The invariant behind acceptance criterion 2: a missing secret must
        // degrade to encrypt-with-dev-default (outside production) or throw —
        // never to "store it as-is".
        delete process.env.AI_KEY_SECRET;
        const sealed = encrypt(SAMPLE_KEY);
        expect(sealed.ciphertext).not.toContain(SAMPLE_KEY);
        expect(decrypt(sealed)).toBe(SAMPLE_KEY);
    });
});

describe('mask', () => {
    it('reveals four characters at each end and nothing between', () => {
        expect(mask(SAMPLE_KEY)).toBe('AIza…3456');
        expect(mask(SAMPLE_KEY)).not.toContain(SAMPLE_KEY.slice(4, -4));
    });

    it('masks short input entirely', () => {
        // A 10-character value revealing 8 of its characters is the failure this
        // guard exists for.
        expect(mask('short')).toBe('••••••••');
        expect(mask('elevenchars')).toBe('••••••••');
    });

    it('does not throw on non-string input', () => {
        expect(mask(undefined as unknown as string)).toBe('••••••••');
        expect(mask(null as unknown as string)).toBe('••••••••');
    });
});
