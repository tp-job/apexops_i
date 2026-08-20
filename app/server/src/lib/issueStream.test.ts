import { describe, it, expect } from 'vitest';
import {
    buildIssueFrame,
    projectRoom,
    isProjectRoom,
    decideIssueStreamJoin,
    STREAM_ERR_REFUSED,
} from './issueStream';

describe('projectRoom / isProjectRoom', () => {
    it('names one room per project', () => {
        expect(projectRoom(7)).toBe('project:7');
        expect(isProjectRoom('project:7')).toBe(true);
    });

    it('does not mistake a socket id or a chat room for a project room', () => {
        expect(isProjectRoom('monitors')).toBe(false);
        expect(isProjectRoom('direct:3:9')).toBe(false);
        expect(isProjectRoom('project:')).toBe(false);
        expect(isProjectRoom('project:0')).toBe(false);
        expect(isProjectRoom('project:1x')).toBe(false);
        expect(isProjectRoom('xkPq7-abc')).toBe(false);
    });
});

describe('decideIssueStreamJoin', () => {
    it('admits a member to their project room', () => {
        const d = decideIssueStreamJoin({ userId: 4, membership: { project: { id: 7 } } });
        expect(d).toEqual({ ok: true, room: 'project:7' });
    });

    // FAILURE CASE: authenticated is not authorized. A signed-in non-member is
    // the cross-project leak this room exists to prevent.
    it('refuses a signed-in NON-member', () => {
        const d = decideIssueStreamJoin({ userId: 4, membership: null });
        expect(d).toEqual({ ok: false, error: STREAM_ERR_REFUSED });
    });

    it("refuses the SDK's anonymous socket", () => {
        const d = decideIssueStreamJoin({ userId: null, membership: null });
        expect(d.ok).toBe(false);
    });

    // Anonymity is refused BEFORE membership is consulted, so a token-less socket
    // can never be admitted by a caller that resolved membership loosely.
    it('refuses an anonymous socket even when a membership row is handed in', () => {
        const d = decideIssueStreamJoin({ userId: null, membership: { project: { id: 7 } } });
        expect(d).toEqual({ ok: false, error: STREAM_ERR_REFUSED });
    });

    // Refusals are indistinguishable on purpose: "no such project" and "not
    // yours" must not be tellable apart, or the socket becomes a slug oracle.
    it('gives the same refusal for a missing project and a foreign one', () => {
        const missing = decideIssueStreamJoin({ userId: 4, membership: null });
        const foreign = decideIssueStreamJoin({ userId: 9, membership: null });
        expect(missing).toEqual(foreign);
    });
});

describe('buildIssueFrame', () => {
    const base = {
        projectId: 7,
        fingerprint: 'abc123',
        level: 'error',
        issue: {
            id: 42,
            status: 'unresolved',
            count: 9,
            firstSeen: new Date('2026-08-20T10:00:00.000Z'),
            lastSeen: new Date('2026-08-20T10:05:00.000Z'),
        },
    };

    it('carries the absolute total, not a delta', () => {
        expect(buildIssueFrame(base).count).toBe(9);
    });

    // FAILURE CASE, and the one this whole design is shaped around. A frame whose
    // count is a delta cannot be told from an absolute one by its type, so the
    // assertion is on the value: applying the same frame twice must not move it.
    it('is idempotent by construction — applying it twice lands on the same count', () => {
        const frame = buildIssueFrame(base);
        const applyOnce = (row: { count: number }) => ({ ...row, count: frame.count });
        expect(applyOnce(applyOnce({ count: 1 })).count).toBe(9);
    });

    it('marks a first sighting as new and a repeat as not new', () => {
        const at = new Date('2026-08-20T10:00:00.000Z');
        expect(buildIssueFrame({ ...base, issue: { ...base.issue, firstSeen: at, lastSeen: at } }).isNew).toBe(true);
        expect(buildIssueFrame(base).isNew).toBe(false);
    });

    it('carries the post-flip status so a regression arrives as unresolved', () => {
        const frame = buildIssueFrame({ ...base, issue: { ...base.issue, status: 'unresolved' } });
        expect(frame.status).toBe('unresolved');
    });

    it('serialises lastSeen as ISO 8601 and carries no issue body', () => {
        const frame = buildIssueFrame(base);
        expect(frame.lastSeen).toBe('2026-08-20T10:05:00.000Z');
        expect(Object.keys(frame).sort()).toEqual(
            ['count', 'fingerprint', 'isNew', 'issueId', 'lastSeen', 'level', 'projectId', 'status'].sort()
        );
    });
});
