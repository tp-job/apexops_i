/**
 * What should happen to a presented refresh token, given the row it names?
 *
 * Pure, and separate from `api/auth.ts`, for the reason `lib/sessionAdmit.ts`
 * and `lib/loginAdmit.ts` are. This one exists specifically because the phase-2
 * lesson mattered here: a decision type has to be able to REPRESENT the failure
 * it is guarding against, or a mutation on it can pass when it should fail.
 * `loginAdmit.ts`'s `{ok: boolean}` could not represent a status-code
 * divergence; this type's whole job is telling **reuse** apart from **live**
 * apart from **never existed**, so those three are three different values, not
 * one boolean collapsing two of them together by accident.
 */

export interface RefreshRow {
    /** Null: this row is the current end of its family. Set: a rotation already
     *  consumed it — a SECOND presentation of this token is a replay. */
    rotatedAt: Date | null;
    /** The sliding idle window. */
    expiresAt: Date;
    /** The hard cap, carried forward through every rotation. Null on rows that
     *  predate the column, meaning uncapped. */
    absoluteExpiresAt: Date | null;
}

export type RefreshOutcome =
    | { kind: 'not-found' }
    /** The signal this phase exists to catch: an already-rotated token turned
     *  up again. The caller gets the SAME response as `not-found` — see
     *  `api/auth.ts` — but the route revokes the whole family and alerts. */
    | { kind: 'reuse' }
    /** A tombstone presented moments after its rotation — two tabs racing on
     *  one shared refresh token, not a replay. Refused like `not-found`, but
     *  nothing is revoked: the winning tab's fresh token is the session. */
    | { kind: 'concurrent-rotation' }
    | { kind: 'idle-expired' }
    | { kind: 'absolute-expired' }
    | { kind: 'rotate' };

/**
 * How long after a rotation a second presentation of the same token counts as
 * a benign race rather than a replay.
 *
 * The client (`app/client/src/lib/authSession.ts`) shares one refresh token
 * across tabs through `localStorage` and handles the race explicitly: the
 * losing tab takes a 401 and adopts the winner's token. Without this window
 * that ordinary multi-tab event would revoke the whole family — every tab
 * signed out, plus an email telling the user their credential was copied.
 *
 * The cost: an attacker who rotates a stolen token first, and whose victim
 * happens to present the same token within this window, is not caught. The
 * victim's next refresh lands at an arbitrary later time, so the window is
 * kept short. The race it covers happens within milliseconds, because every
 * tab reaches the same access-token expiry together.
 */
export const REUSE_GRACE_MS = parseInt(process.env.REFRESH_REUSE_GRACE_MS || '10000', 10);

export function decideRefreshOutcome(input: {
    row: RefreshRow | null;
    now: Date;
    graceMs?: number;
}): RefreshOutcome {
    if (!input.row) return { kind: 'not-found' };

    // Checked FIRST, before either expiry. A tombstoned row's own `expiresAt`
    // was stamped while it was still live, so an expiry check run first would
    // let an old, reused token slip through the same branch as an ordinary
    // idle timeout — silently discarding the one distinction this file exists
    // to make.
    if (input.row.rotatedAt !== null) {
        const sinceRotation = input.now.getTime() - input.row.rotatedAt.getTime();
        return sinceRotation < (input.graceMs ?? REUSE_GRACE_MS)
            ? { kind: 'concurrent-rotation' }
            : { kind: 'reuse' };
    }

    if (input.row.expiresAt <= input.now) return { kind: 'idle-expired' };
    if (input.row.absoluteExpiresAt && input.row.absoluteExpiresAt <= input.now) {
        return { kind: 'absolute-expired' };
    }

    return { kind: 'rotate' };
}
