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
    | { kind: 'idle-expired' }
    | { kind: 'absolute-expired' }
    | { kind: 'rotate' };

export function decideRefreshOutcome(input: { row: RefreshRow | null; now: Date }): RefreshOutcome {
    if (!input.row) return { kind: 'not-found' };

    // Checked FIRST, before either expiry. A tombstoned row's own `expiresAt`
    // was stamped while it was still live, so an expiry check run first would
    // let an old, reused token slip through the same branch as an ordinary
    // idle timeout — silently discarding the one distinction this file exists
    // to make.
    if (input.row.rotatedAt !== null) return { kind: 'reuse' };

    if (input.row.expiresAt <= input.now) return { kind: 'idle-expired' };
    if (input.row.absoluteExpiresAt && input.row.absoluteExpiresAt <= input.now) {
        return { kind: 'absolute-expired' };
    }

    return { kind: 'rotate' };
}
