/**
 * Should this request's session be admitted?
 *
 * Pure, and separate from `middleware/auth.ts`, for the same reason
 * `lib/monitorAccess.ts` and `lib/issueStream.ts` are: the decision is the part
 * worth testing, and it cannot be tested while it is tangled with Prisma and an
 * Express response. The middleware fetches and responds; this decides.
 *
 * Every refusal is one reason, named. The middleware maps the reason to a status
 * — deliberately not the other way round, so a new reason cannot silently
 * inherit a status that flatters it.
 */

export interface SessionRow {
    userId: number;
    /** Sliding idle window (spec D1). */
    expiresAt: Date;
    /** Hard end of the session (spec D2). Null on rows that predate the column. */
    absoluteExpiresAt: Date | null;
    user: { role: string | null; isActive: boolean | null };
}

export type SessionAdmit =
    | { ok: true; role: string }
    | { ok: false; reason: 'no-session-claim' | 'revoked' | 'wrong-owner' | 'expired' | 'deactivated' };

export function decideSessionAdmit(input: {
    /** `sid` from the access token. Undefined for tokens minted before Sprint 5. */
    sid: number | undefined;
    /** `id` from the access token, i.e. who the token claims to be. */
    tokenUserId: number;
    /** The row `sid` names, or null when it is gone. */
    session: SessionRow | null;
    now: Date;
}): SessionAdmit {
    // A token naming no session cannot be revoked by any of the four paths that
    // exist to revoke sessions, so it is refused rather than carried forever.
    if (typeof input.sid !== 'number') return { ok: false, reason: 'no-session-claim' };

    // The row is gone: logout, revoke-one, revoke-all, or an admin deactivating
    // or demoting the account. This is the case the whole check exists for.
    if (!input.session) return { ok: false, reason: 'revoked' };

    // Only reachable by forging a `sid` into an otherwise valid token — which the
    // signature already prevents. Checked because the cost is a comparison and
    // the failure is acting as somebody else.
    if (input.session.userId !== input.tokenUserId) return { ok: false, reason: 'wrong-owner' };

    // Both windows. `/auth/refresh` enforces these when rotating; an access token
    // that outlived either would be the way around them.
    if (input.session.expiresAt <= input.now) return { ok: false, reason: 'expired' };
    if (input.session.absoluteExpiresAt && input.session.absoluteExpiresAt <= input.now) {
        return { ok: false, reason: 'expired' };
    }

    // `false` only. A null `isActive` is a row predating the column, which means
    // "not deactivated" — treating null as inactive would lock out every legacy
    // account on deploy.
    if (input.session.user.isActive === false) return { ok: false, reason: 'deactivated' };

    // The CURRENT role, straight from the row just read. This is what lets
    // `authorize()` skip a second identical query without giving up freshness.
    return { ok: true, role: input.session.user.role || 'user' };
}
