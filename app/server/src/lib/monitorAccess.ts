/**
 * Who may join the `monitors` room.
 *
 * The `monitors` room carries **every** connected target app's console output —
 * messages, stack traces and URLs from applications this workspace does not
 * necessarily own. Until Sprint 9 the room refused anonymous sockets and admitted
 * any signed-in user, which made the hidden sidebar link the only thing between a
 * regular user and all of it. `components/layouts/Sidebar.tsx` says it plainly:
 * hiding a link is presentation, not access control.
 *
 * This is the third time the same defect has surfaced in this feature — it deleted
 * the `:8082` native relay (spec D6) and forced the room to gate itself at all.
 * So the decision lives here as a **pure function** rather than inline in the
 * socket handler, for two reasons:
 *
 * 1. It can be tested exhaustively. The server suite is deliberately
 *    database-free and server-free (`vitest.config.ts`), so a rule embedded in an
 *    `io.on('connection')` closure is a rule that cannot be covered at all.
 * 2. It states the whole policy in one readable place, instead of as a chain of
 *    early returns that a later edit can quietly shorten.
 *
 * Decision S9-D5. Mirrors `middleware/auth.ts#authorize` on purpose: same role
 * source, same `isActive` check, same fail-closed posture — a socket and an HTTP
 * request should not disagree about what "admin" means.
 */

export const MONITOR_ROLE = 'admin';

/**
 * The caller's identity as read **fresh from the database** at join time.
 *
 * Deliberately not the JWT claim. `authorize()` documents why at length: a claim
 * is a snapshot from issue time, so a demoted or deactivated admin would keep
 * their powers until the token expired. `role` in a token is display only.
 */
export interface MonitorPrincipal {
    /** `false` when the user row no longer exists — a token for a deleted user is not a user. */
    exists: boolean;
    role: string | null;
    isActive: boolean | null;
}

export type MonitorAdmit =
    | { ok: true }
    | { ok: false; error: string };

/** What an unauthenticated socket is told. Deliberately distinct from the role refusal. */
export const MONITOR_ERR_UNAUTHENTICATED = 'Authentication required to monitor';
/** What every *other* refusal is told — no reason, so the response cannot be used to probe roles. */
export const MONITOR_ERR_FORBIDDEN = 'Insufficient permissions';

/**
 * Decide whether a socket may join `monitors`.
 *
 * `null` means the socket presented no token, or a token that did not verify.
 *
 * Every non-authentication refusal returns the **same** message. Distinguishing
 * "you are not an admin" from "your account is deactivated" would let any
 * signed-in user probe the shape of the user table one socket at a time, and
 * neither answer changes what the caller can do about it.
 */
export function decideMonitorAdmit(principal: MonitorPrincipal | null): MonitorAdmit {
    if (!principal) return { ok: false, error: MONITOR_ERR_UNAUTHENTICATED };

    // A token for a user who no longer exists is not a user. Falling back to the
    // token's claim here is exactly how a deleted admin stays an admin forever.
    if (!principal.exists) return { ok: false, error: MONITOR_ERR_FORBIDDEN };

    // A deactivated account keeping its admin powers until a token expired would
    // be the same bug wearing a different hat (see `authorize()`).
    if (principal.isActive === false) return { ok: false, error: MONITOR_ERR_FORBIDDEN };

    // `null` role means "never set", which is a normal user — not an admin. The
    // default has to be the restrictive one; a missing value must never widen access.
    if ((principal.role || 'user') !== MONITOR_ROLE) {
        return { ok: false, error: MONITOR_ERR_FORBIDDEN };
    }

    return { ok: true };
}
