/**
 * Should this login attempt succeed — and does the answer leak anything to a
 * caller who does not yet hold a valid credential?
 *
 * Pure, and separate from `api/auth.ts`, for the reason `lib/sessionAdmit.ts`
 * is: the decision is what phase 2 (A07 #8, A3) exists to fix, and it cannot be
 * regression-tested while it is tangled with bcrypt and an Express response.
 *
 * The one rule this file enforces: **"no such user"**, **"wrong password"** and
 * **"deactivated account"** are one outcome to anyone who does not already hold
 * a valid session. Before 2026-09-06 the deactivated case ran before the
 * password check and answered a distinct `403` — telling an unauthenticated
 * caller an account exists and is disabled without ever proving they knew its
 * password.
 */

export interface LoginAdmit {
    ok: boolean;
}

export function decideLoginAdmit(input: {
    /** Whether a user row was found for the submitted email. */
    userFound: boolean;
    /** Result of comparing the submitted password against the row's hash — or
     *  against a dummy hash of equal cost when no row was found, so this
     *  function's caller pays the same bcrypt cost either way. */
    passwordMatches: boolean;
    /** `null` for a row predating the column, which means "not deactivated". */
    isActive: boolean | null;
}): LoginAdmit {
    // FAILURE CASE this exists to prevent: checking `isActive` before
    // `passwordMatches` (or returning early on it) reopens the enumeration
    // oracle this function was written to close, even though the message at
    // the call site never changes — the *order* is what used to matter, and
    // collapsing it into one expression is what makes it not matter anymore.
    return { ok: input.userFound && input.passwordMatches && input.isActive !== false };
}
