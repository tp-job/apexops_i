import { describe, it, expect } from 'vitest';
import { decideLoginAdmit } from './loginAdmit';

describe('decideLoginAdmit — the happy path', () => {
    it('admits a found user with a matching password on an active account', () => {
        expect(decideLoginAdmit({ userFound: true, passwordMatches: true, isActive: true })).toEqual({
            ok: true,
        });
    });

    it('admits a row predating the isActive column — null means not deactivated', () => {
        expect(decideLoginAdmit({ userFound: true, passwordMatches: true, isActive: null })).toEqual({
            ok: true,
        });
    });
});

describe('decideLoginAdmit — every refusal reads the same to the caller', () => {
    it('refuses when no user was found', () => {
        expect(decideLoginAdmit({ userFound: false, passwordMatches: false, isActive: null }).ok).toBe(false);
    });

    it('refuses a wrong password on an active, existing account', () => {
        expect(decideLoginAdmit({ userFound: true, passwordMatches: false, isActive: true }).ok).toBe(false);
    });

    // THE case phase 2 exists for. Before 2026-09-06 this combination answered a
    // DIFFERENT status (403, pre-password-check) from a wrong password (401) —
    // telling an unauthenticated caller the account exists and is disabled.
    it('refuses a deactivated account with the CORRECT password — same outcome as a wrong one', () => {
        const correct = decideLoginAdmit({ userFound: true, passwordMatches: true, isActive: false });
        const wrong = decideLoginAdmit({ userFound: true, passwordMatches: false, isActive: true });
        expect(correct).toEqual({ ok: false });
        expect(correct).toEqual(wrong);
    });

    it('refuses a deactivated account with a WRONG password too — not a third distinguishable case', () => {
        expect(decideLoginAdmit({ userFound: true, passwordMatches: false, isActive: false })).toEqual({
            ok: false,
        });
    });

    it('never admits a deactivated account regardless of the password check', () => {
        expect(decideLoginAdmit({ userFound: true, passwordMatches: true, isActive: false }).ok).toBe(false);
    });
});
