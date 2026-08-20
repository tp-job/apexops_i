import { describe, it, expect } from 'vitest';
import {
    reconcileIssueFrame,
    isIssueActivityFrame,
    advanceConnection,
    initialConnection,
    OFFLINE_AFTER_ATTEMPTS,
    type IssueActivityFrame,
    type IssueListState,
    type StreamEvent,
} from './issueStream';
import type { Issue } from '@/types/projects';

const issue = (over: Partial<Issue> & { id: number }): Issue => ({
    projectId: 1,
    fingerprint: `fp${over.id}`,
    level: 'error',
    title: `Issue ${over.id}`,
    culprit: null,
    status: 'unresolved',
    count: 1,
    firstSeen: '2026-08-20T10:00:00.000Z',
    lastSeen: '2026-08-20T10:00:00.000Z',
    ticketId: null,
    reopenCount: 0,
    lastReopenedAt: null,
    ...over,
});

const state = (over: Partial<IssueListState> = {}): IssueListState => ({
    issues: [issue({ id: 1 }), issue({ id: 2 }), issue({ id: 3 })],
    total: 3,
    pageSize: 3,
    projectId: 1,
    filtered: false,
    page: 1,
    ...over,
});

const frame = (over: Partial<IssueActivityFrame> = {}): IssueActivityFrame => ({
    issueId: 2,
    projectId: 1,
    fingerprint: 'fp2',
    level: 'error',
    status: 'unresolved',
    count: 9,
    lastSeen: '2026-08-20T11:00:00.000Z',
    ticketId: null,
    isNew: false,
    ...over,
});

describe('reconcileIssueFrame — a row already on screen', () => {
    it('patches count, lastSeen and status in place', () => {
        const r = reconcileIssueFrame(state(), frame());
        expect(r.kind).toBe('patched');
        if (r.kind !== 'patched') return;
        expect(r.issues[1]).toMatchObject({ id: 2, count: 9, lastSeen: '2026-08-20T11:00:00.000Z' });
        expect(r.issues.map((i) => i.id)).toEqual([1, 2, 3]);
    });

    it('does not reorder and does not change the length', () => {
        const s = state();
        const r = reconcileIssueFrame(s, frame({ issueId: 3, count: 99 }));
        if (r.kind !== 'patched') throw new Error('expected patched');
        expect(r.issues.map((i) => i.id)).toEqual([1, 2, 3]);
        expect(r.issues).toHaveLength(3);
        // The other rows are untouched objects, so React re-renders one row.
        expect(r.issues[0]).toBe(s.issues[0]);
    });

    // F006 / criterion 5 — the pre-mortem's top failure. An optimistic local
    // update and the echoed push both land on this row.
    it('is idempotent: the same frame applied twice leaves the same count', () => {
        const once = reconcileIssueFrame(state(), frame({ count: 9 }));
        if (once.kind !== 'patched') throw new Error('expected patched');
        const twice = reconcileIssueFrame(state({ issues: once.issues }), frame({ count: 9 }));
        expect(twice.kind).toBe('ignored');
        expect(once.issues[1].count).toBe(9);
    });

    // F006 — a promote in one window has to reach the others, or two people work
    // the same bug and the second gets a 409 from a button that should be gone.
    it('carries a promote done in another window through as a ticket link', () => {
        const r = reconcileIssueFrame(state(), frame({ ticketId: 31 }));
        if (r.kind !== 'patched') throw new Error('expected patched');
        expect(r.issues[1].ticketId).toBe(31);
    });

    it('carries a resolve done in another window through as a status change', () => {
        const r = reconcileIssueFrame(state(), frame({ status: 'resolved' }));
        if (r.kind !== 'patched') throw new Error('expected patched');
        expect(r.issues[1].status).toBe('resolved');
    });

    // A row already held is patched even when the server called it new — which is
    // what makes the server's same-millisecond ambiguity harmless.
    it('patches rather than duplicating when isNew is set for a row already held', () => {
        const r = reconcileIssueFrame(state(), frame({ isNew: true, count: 4 }));
        if (r.kind !== 'patched') throw new Error('expected patched');
        expect(r.issues.filter((i) => i.id === 2)).toHaveLength(1);
    });
});

describe('reconcileIssueFrame — a brand-new issue', () => {
    it('prepends on page 1 with no filters and holds the list at pageSize', () => {
        const r = reconcileIssueFrame(state(), frame({ issueId: 77, fingerprint: 'fp77', isNew: true, count: 1 }));
        expect(r.kind).toBe('prepended');
        if (r.kind !== 'prepended') return;
        expect(r.issues).toHaveLength(3);
        expect(r.issues.map((i) => i.id)).toEqual([77, 1, 2]);
        expect(r.total).toBe(4);
    });

    // FAILURE CASE — criterion 4. Injecting a row that does not match the active
    // filter makes the filter look broken.
    it('does NOT insert while a filter is active', () => {
        const r = reconcileIssueFrame(state({ filtered: true }), frame({ issueId: 77, isNew: true }));
        expect(r).toEqual({ kind: 'deferred' });
    });

    it('does NOT insert on page 2', () => {
        const r = reconcileIssueFrame(state({ page: 2 }), frame({ issueId: 77, isNew: true }));
        expect(r).toEqual({ kind: 'deferred' });
    });
});

describe('reconcileIssueFrame — frames that must change nothing', () => {
    // FAILURE CASE — criterion for F005: a push for a project the client is not
    // viewing is ignored outright.
    it('ignores a frame for another project even when the id collides', () => {
        const r = reconcileIssueFrame(state(), frame({ projectId: 2, issueId: 2, count: 500 }));
        expect(r).toEqual({ kind: 'ignored' });
    });

    it('ignores every frame while no project is being viewed', () => {
        expect(reconcileIssueFrame(state({ projectId: null }), frame({ isNew: true }))).toEqual({ kind: 'ignored' });
    });

    it('ignores a repeat of an issue that is not on this page', () => {
        expect(reconcileIssueFrame(state(), frame({ issueId: 404, isNew: false }))).toEqual({ kind: 'ignored' });
    });

    it('ignores a replayed frame that changes nothing', () => {
        const s = state({ issues: [issue({ id: 2, count: 9, lastSeen: '2026-08-20T11:00:00.000Z' })], total: 1 });
        expect(reconcileIssueFrame(s, frame())).toEqual({ kind: 'ignored' });
    });
});

describe('isIssueActivityFrame', () => {
    it('accepts a well-formed frame', () => {
        expect(isIssueActivityFrame(frame())).toBe(true);
    });

    it('rejects junk off the wire', () => {
        expect(isIssueActivityFrame(null)).toBe(false);
        expect(isIssueActivityFrame('issue')).toBe(false);
        expect(isIssueActivityFrame({ ...frame(), count: '9' })).toBe(false);
        expect(isIssueActivityFrame({ ...frame(), isNew: undefined })).toBe(false);
        expect(isIssueActivityFrame({ ...frame(), ticketId: 'TICK-1' })).toBe(false);
    });
});

describe('advanceConnection — the badge never lies about the feed', () => {
    it('starts at reconnecting, not live: nothing has connected yet', () => {
        expect(initialConnection.status).toBe('reconnecting');
    });

    it('goes live on connect', () => {
        expect(advanceConnection(initialConnection, { type: 'connected' })).toEqual({
            status: 'live',
            failedAttempts: 0,
        });
    });

    it('leaves live the moment the socket drops', () => {
        const live = advanceConnection(initialConnection, { type: 'connected' });
        expect(advanceConnection(live, { type: 'disconnected' }).status).toBe('reconnecting');
    });

    it('reads reconnecting while retries are still plausible, then offline', () => {
        let s = advanceConnection(initialConnection, { type: 'connected' });
        s = advanceConnection(s, { type: 'disconnected' });
        for (let i = 1; i < OFFLINE_AFTER_ATTEMPTS; i += 1) {
            s = advanceConnection(s, { type: 'attempt-failed' });
            expect(s.status).toBe('reconnecting');
        }
        s = advanceConnection(s, { type: 'attempt-failed' });
        expect(s.status).toBe('offline');
    });

    // FAILURE CASE — criterion 9. No sequence that lacks a connect may produce
    // `live`, or the page claims to be current over a dead feed.
    it('never reaches live without a connect, however long the sequence', () => {
        const events: StreamEvent[] = [{ type: 'disconnected' }, { type: 'attempt-failed' }];
        let s = initialConnection;
        for (let i = 0; i < 50; i += 1) {
            s = advanceConnection(s, events[i % events.length]);
            expect(s.status).not.toBe('live');
        }
    });

    it('recovers to live and forgets the failure count after a reconnect', () => {
        let s = initialConnection;
        for (let i = 0; i < 10; i += 1) s = advanceConnection(s, { type: 'attempt-failed' });
        expect(s.status).toBe('offline');
        expect(advanceConnection(s, { type: 'connected' })).toEqual({ status: 'live', failedAttempts: 0 });
    });
});
