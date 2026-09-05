import { describe, it, expect } from 'vitest';
import { decideSessionAdmit, type SessionRow } from './sessionAdmit';

const NOW = new Date('2026-09-06T12:00:00.000Z');
const LATER = new Date('2026-09-06T20:00:00.000Z');
const EARLIER = new Date('2026-09-06T04:00:00.000Z');

const session = (over: Partial<SessionRow> = {}): SessionRow => ({
    userId: 7,
    expiresAt: LATER,
    absoluteExpiresAt: new Date('2026-09-13T12:00:00.000Z'),
    user: { role: 'user', isActive: true },
    ...over,
});

const admit = (over: Partial<Parameters<typeof decideSessionAdmit>[0]> = {}) =>
    decideSessionAdmit({ sid: 42, tokenUserId: 7, session: session(), now: NOW, ...over });

describe('decideSessionAdmit — the happy path', () => {
    it('admits a live session and returns the role from the row', () => {
        expect(admit()).toEqual({ ok: true, role: 'user' });
    });

    it('returns the CURRENT role, which is what lets authorize skip its own query', () => {
        expect(admit({ session: session({ user: { role: 'admin', isActive: true } }) })).toEqual({
            ok: true,
            role: 'admin',
        });
    });

    it('defaults a null role to user rather than admitting a roleless account', () => {
        expect(admit({ session: session({ user: { role: null, isActive: true } }) })).toEqual({
            ok: true,
            role: 'user',
        });
    });

    it('admits a row that predates the absolute cap instead of locking it out', () => {
        expect(admit({ session: session({ absoluteExpiresAt: null }) }).ok).toBe(true);
    });

    it('treats a null isActive as active — the column is newer than the rows', () => {
        expect(admit({ session: session({ user: { role: 'user', isActive: null } }) }).ok).toBe(true);
    });
});

describe('decideSessionAdmit — refusals', () => {
    // THE failure case. Every revocation path deletes this row, and before
    // 2026-09-06 the access token kept working for up to eight hours regardless.
    it('refuses a revoked session — the row is gone', () => {
        expect(admit({ session: null })).toEqual({ ok: false, reason: 'revoked' });
    });

    it('refuses a token that names no session at all', () => {
        expect(admit({ sid: undefined })).toEqual({ ok: false, reason: 'no-session-claim' });
    });

    it('refuses a session belonging to a different user', () => {
        expect(admit({ tokenUserId: 8 })).toEqual({ ok: false, reason: 'wrong-owner' });
    });

    it('refuses a session past its idle window', () => {
        expect(admit({ session: session({ expiresAt: EARLIER }) })).toEqual({ ok: false, reason: 'expired' });
    });

    it('refuses a session past its absolute cap, however fresh the idle window', () => {
        expect(admit({ session: session({ expiresAt: LATER, absoluteExpiresAt: EARLIER }) })).toEqual({
            ok: false,
            reason: 'expired',
        });
    });

    it('refuses a deactivated account immediately, not when its token expires', () => {
        expect(admit({ session: session({ user: { role: 'admin', isActive: false } }) })).toEqual({
            ok: false,
            reason: 'deactivated',
        });
    });

    // Boundary: `<=`, not `<`. A session expiring exactly now is over.
    it('treats an expiry exactly equal to now as expired', () => {
        expect(admit({ session: session({ expiresAt: NOW }) })).toEqual({ ok: false, reason: 'expired' });
    });

    it('checks ownership before expiry, so a foreign session never reports as merely stale', () => {
        const r = admit({ tokenUserId: 8, session: session({ expiresAt: EARLIER }) });
        expect(r).toEqual({ ok: false, reason: 'wrong-owner' });
    });
});
