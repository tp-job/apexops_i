import { describe, expect, it, vi, beforeEach } from 'vitest';

/**
 * Session timeout clamping (spec E-D2).
 *
 * `resolveSessionTimeoutMinutes` reads a value from the database and hands it to
 * `jwt.sign` as `expiresIn`. The Zod schema bounds what the *API* accepts, but a
 * value written straight to Postgres — a migration, a console, a seed script —
 * reaches this function unchecked. `expiresIn: 0` mints a token that is expired
 * on arrival, which presents as "login is broken", not "bad setting".
 *
 * Prisma is mocked rather than reached: this is a clamping function, and a test
 * that needs a database to prove `Math.min` would not survive CI.
 */

const findUnique = vi.fn();
vi.mock('./prisma', () => ({ default: { userSettings: { findUnique: () => findUnique() } } }));

const load = async () => (await import('./sessions')).resolveSessionTimeoutMinutes;

describe('resolveSessionTimeoutMinutes', () => {
    beforeEach(() => findUnique.mockReset());

    it('returns a stored in-range value unchanged', async () => {
        findUnique.mockResolvedValue({ sessionTimeout: 60 });
        expect(await (await load())(1)).toBe(60);
    });

    it('clamps a value written below the floor directly to the database', async () => {
        findUnique.mockResolvedValue({ sessionTimeout: 1 });
        expect(await (await load())(1)).toBe(5);
    });

    it('clamps a value written above the ceiling', async () => {
        findUnique.mockResolvedValue({ sessionTimeout: 100_000 });
        expect(await (await load())(1)).toBe(480);
    });

    it('never returns zero, which would mint an already-expired token', async () => {
        findUnique.mockResolvedValue({ sessionTimeout: 0 });
        expect(await (await load())(1)).toBeGreaterThanOrEqual(5);
    });

    it('handles a negative value', async () => {
        findUnique.mockResolvedValue({ sessionTimeout: -30 });
        expect(await (await load())(1)).toBe(5);
    });

    it('falls back to the default when the settings row is missing', async () => {
        // A user created before user_settings existed, or a failed create.
        findUnique.mockResolvedValue(null);
        expect(await (await load())(1)).toBe(480);
    });

    it('falls back rather than propagating a non-finite value', async () => {
        findUnique.mockResolvedValue({ sessionTimeout: Number.NaN });
        expect(await (await load())(1)).toBe(480);
    });
});
