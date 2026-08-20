import type { Issue, IssueStatus } from '@/types/projects';

/**
 * Reconciling a live issue push against the list currently on screen (R-D2).
 *
 * **Why the client decides and not the server.** The list is server-filtered,
 * server-sorted and paged. The `project:<id>` room has no idea what filter a
 * given socket is on, so it cannot know whether a row belongs in that client's
 * view. The decision has to live where the query state lives — here.
 *
 * A pure function so the rules can be tested without a socket, a server or a
 * render: these four cases *are* the feature, and the hook around them is
 * plumbing.
 */

/** Mirrors the server's `IssueActivityFrame` (`server/src/lib/issueStream.ts`). */
export interface IssueActivityFrame {
    issueId: number;
    projectId: number;
    fingerprint: string;
    level: string;
    status: string;
    /** Absolute total, never a delta (R-D1). */
    count: number;
    lastSeen: string;
    isNew: boolean;
}

export interface IssueListState {
    issues: Issue[];
    total: number;
    pageSize: number;
    /** The project the user is actually looking at. */
    projectId: number | null;
    /** True when any filter is active — a filtered list must not be injected into. */
    filtered: boolean;
    page: number;
}

export type Reconciliation =
    /** Not our project, or nothing to do. The list is untouched. */
    | { kind: 'ignored' }
    /** The row is on screen: absolute values written in place, order preserved. */
    | { kind: 'patched'; issues: Issue[] }
    /** A brand-new issue on an unfiltered page 1. */
    | { kind: 'prepended'; issues: Issue[]; total: number; placeholder: true }
    /** A brand-new issue that must NOT be injected — the banner counts it instead. */
    | { kind: 'deferred' };

/** Frames are JSON off a socket: nothing about their shape is guaranteed. */
export function isIssueActivityFrame(value: unknown): value is IssueActivityFrame {
    if (typeof value !== 'object' || value === null) return false;
    const f = value as Record<string, unknown>;
    return (
        typeof f.issueId === 'number' &&
        typeof f.projectId === 'number' &&
        typeof f.count === 'number' &&
        typeof f.lastSeen === 'string' &&
        typeof f.status === 'string' &&
        typeof f.isNew === 'boolean'
    );
}

/**
 * Apply one frame to one list.
 *
 * | Case | Result |
 * |---|---|
 * | Frame for another project | `ignored` |
 * | Issue already on screen | `patched` — count, lastSeen and status, in place |
 * | `isNew`, page 1, no filters | `prepended`, list held at `pageSize` |
 * | `isNew`, filtered or page > 1 | `deferred` — the banner counts it |
 * | Not new and not on screen | `ignored` |
 *
 * **Patching wins over `isNew`.** A row already held is updated, never inserted
 * a second time — which is what makes the `isNew` heuristic on the server side
 * (two writes inside one millisecond) harmless rather than a duplicate row.
 *
 * **No reordering.** `sort=lastSeen` means a patched row is arguably in the
 * wrong place until the next fetch. That is deliberate: re-sorting a list under
 * a reading cursor is the thing that makes people close the tab, and the banner
 * plus the refetch is the honest way to resync. Do not "fix" this by sorting.
 *
 * **Absolute assignment, never `+=`.** Two applications of one frame land on the
 * same value, so an optimistic local update and the echoed push cannot compound
 * (R-D1, and the top item in the pre-mortem).
 */
export function reconcileIssueFrame(state: IssueListState, frame: IssueActivityFrame): Reconciliation {
    if (state.projectId === null || frame.projectId !== state.projectId) return { kind: 'ignored' };

    const index = state.issues.findIndex((i) => i.id === frame.issueId);
    if (index !== -1) {
        const current = state.issues[index];
        const patched: Issue = {
            ...current,
            count: frame.count,
            lastSeen: frame.lastSeen,
            status: frame.status as IssueStatus,
        };
        // Untouched if nothing actually changed, so a replayed frame after a
        // reconnect does not re-render the list for no reason.
        if (
            current.count === patched.count &&
            current.lastSeen === patched.lastSeen &&
            current.status === patched.status
        ) {
            return { kind: 'ignored' };
        }
        const issues = state.issues.slice();
        issues[index] = patched;
        return { kind: 'patched', issues };
    }

    if (!frame.isNew) return { kind: 'ignored' };
    if (state.filtered || state.page > 1) return { kind: 'deferred' };

    // A placeholder, not a fetched row: the frame deliberately does not carry the
    // issue body (R-D1). Title and culprit arrive on the next refetch; the
    // consumer renders this as the pending row it is.
    const placeholder: Issue = {
        id: frame.issueId,
        projectId: frame.projectId,
        fingerprint: frame.fingerprint,
        level: frame.level,
        title: 'New issue',
        culprit: null,
        status: frame.status as IssueStatus,
        count: frame.count,
        firstSeen: frame.lastSeen,
        lastSeen: frame.lastSeen,
        ticketId: null,
        reopenCount: 0,
        lastReopenedAt: null,
    };

    return {
        kind: 'prepended',
        // Held at exactly pageSize: the page is a window on a server-side query,
        // and growing it here would make the pager disagree with the list.
        issues: [placeholder, ...state.issues].slice(0, state.pageSize),
        total: state.total + 1,
        placeholder: true,
    };
}

// ── The connection badge (R-D5) ──────────────────────────────

/**
 * `live` is a claim about the feed, so it is only ever reachable from an actual
 * connect.
 *
 * A boolean cannot express the difference between "nothing is happening" and
 * "the page stopped listening", and that pair is the worst failure a monitoring
 * view has — it is the same shape as the Sprint 1 defect where a signed-out
 * session kept rendering a signed-in shell.
 */
export type StreamStatus = 'live' | 'reconnecting' | 'offline';

export interface StreamConnection {
    status: StreamStatus;
    /** Consecutive failed attempts since the last successful connect. */
    failedAttempts: number;
}

export type StreamEvent =
    | { type: 'connected' }
    | { type: 'disconnected' }
    | { type: 'attempt-failed' };

/**
 * How many consecutive failures before the feed is called dead rather than
 * flaky. Socket.IO retries roughly every second at first, so this is a few
 * seconds of silence — long enough not to flicker on a laptop waking up, short
 * enough that a killed server does not sit on `reconnecting` indefinitely.
 */
export const OFFLINE_AFTER_ATTEMPTS = 4;

export const initialConnection: StreamConnection = { status: 'reconnecting', failedAttempts: 0 };

export function advanceConnection(current: StreamConnection, event: StreamEvent): StreamConnection {
    switch (event.type) {
        case 'connected':
            return { status: 'live', failedAttempts: 0 };
        case 'disconnected':
            // A drop is not yet a dead feed, but it is definitely not live.
            return { status: 'reconnecting', failedAttempts: 0 };
        case 'attempt-failed': {
            const failedAttempts = current.failedAttempts + 1;
            return {
                status: failedAttempts >= OFFLINE_AFTER_ATTEMPTS ? 'offline' : 'reconnecting',
                failedAttempts,
            };
        }
    }
}
