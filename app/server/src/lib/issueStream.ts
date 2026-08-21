/**
 * The issue stream's two decisions, kept out of the socket handler and the
 * ingest route so they can be tested — the same split `lib/monitorAccess.ts`
 * uses, for the same reason: `socket.join` and `io.to().emit()` are not things a
 * unit test can watch, but the choice of *whether* and *what* is.
 *
 * Decisions live in `.agents/docs/features/realtime-issue-stream.md` (R-D1, R-D3).
 */

/** Room name. One room per project — never a global issue room (R-D3). */
export const projectRoom = (projectId: number): string => `project:${projectId}`;

/** True for `project:<positive int>` and nothing else. Used to leave stale rooms. */
export const isProjectRoom = (room: string): boolean => /^project:[1-9]\d*$/.test(room);

export const STREAM_ERR_REFUSED = 'Not a member of that project';

export type JoinDecision =
    | { ok: true; room: string }
    | { ok: false; error: string };

/**
 * May this socket join this project's room?
 *
 * Membership, not authentication (R-D3). An authenticated-only room is a
 * cross-project leak — the defect that got the `:8082` relay deleted and that
 * the `monitors` room had to gate itself against afterwards. This would be its
 * third occurrence.
 *
 * `membership` is what `resolveMembership()` returned: `null` covers both "no
 * such project" and "not yours", and both get the **same** refusal string for
 * the same reason the HTTP routes answer 404 rather than 403 — a distinguishable
 * answer enumerates other people's project slugs one guess at a time.
 *
 * The SDK's anonymous socket arrives with `userId: null` and is refused here,
 * before any lookup. It is the *source* of pushes, never a subscriber.
 */
export function decideIssueStreamJoin(input: {
    userId: number | null;
    membership: { project: { id: number } } | null;
}): JoinDecision {
    if (input.userId === null) return { ok: false, error: STREAM_ERR_REFUSED };
    if (!input.membership) return { ok: false, error: STREAM_ERR_REFUSED };
    return { ok: true, room: projectRoom(input.membership.project.id) };
}

// ── The frame (R-D1) ─────────────────────────────────────────

/**
 * What ingest pushes into `project:<id>`.
 *
 * Small and **absolute-valued**: `count` is the new total, never `+1`. Sockets
 * drop, reconnect and replay, and an increment over an unreliable transport is
 * how a counting tool starts lying — this product's whole credibility is its
 * counts. Applied twice, an absolute value is the same value, so double
 * application is harmless by construction rather than by care.
 *
 * Not the issue object: the list is server-filtered, server-sorted and paged,
 * and the room has no idea what filter a given client is on. Whether a row
 * belongs in a view is decided where the query state lives (R-D2).
 */
export interface IssueActivityFrame {
    issueId: number;
    projectId: number;
    fingerprint: string;
    level: string;
    status: string;
    /** Absolute total after this batch. Never a delta. */
    count: number;
    /** ISO 8601. */
    lastSeen: string;
    /**
     * Non-null once promoted, so a second window stops offering "Create ticket"
     * for work that already has one.
     *
     * **This field is an amendment to R-D1**, which listed the frame's contents
     * without it. Added because acceptance criterion 5 and ledger item F006 both
     * require a promote in one window to reach another, and status alone cannot
     * express it. It keeps every property R-D1 was protecting: absolute, small,
     * and not the issue body. Recorded in the decisions doc rather than changed
     * quietly.
     */
    ticketId: number | null;
    /** First time this fingerprint has been seen — the client may prepend it. */
    isNew: boolean;
}

/**
 * Was this issue created by the batch that just ran, or updated?
 *
 * Prisma's `upsert` does not say which branch it took, and both branches write
 * the same `now`. Equal timestamps therefore mean "created", with one benign
 * ambiguity: an issue created and hit again inside the same millisecond by a
 * *second* request reads as new. That costs nothing, because the client checks
 * "already on screen" before it checks `isNew` (R-D2) — a row it already holds
 * is patched, never prepended twice.
 */
export const isNewIssue = (firstSeen: Date, lastSeen: Date): boolean =>
    firstSeen.getTime() === lastSeen.getTime();

export function buildIssueFrame(input: {
    projectId: number;
    fingerprint: string;
    level: string;
    issue: {
        id: number;
        status: string;
        count: number;
        firstSeen: Date;
        lastSeen: Date;
        ticketId?: number | null;
    };
    /**
     * Override for callers that know better than the timestamps — a status change
     * or a promote is never a first sighting, whatever the clock says.
     */
    isNew?: boolean;
}): IssueActivityFrame {
    return {
        issueId: input.issue.id,
        projectId: input.projectId,
        fingerprint: input.fingerprint,
        level: input.level,
        status: input.issue.status,
        count: input.issue.count,
        lastSeen: input.issue.lastSeen.toISOString(),
        ticketId: input.issue.ticketId ?? null,
        isNew: input.isNew ?? isNewIssue(input.issue.firstSeen, input.issue.lastSeen),
    };
}
