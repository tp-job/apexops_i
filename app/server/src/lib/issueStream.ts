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
