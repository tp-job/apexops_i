import { describe, it, expect } from 'vitest';
import {
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
