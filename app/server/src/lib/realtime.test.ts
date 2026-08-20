import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { Server as SocketIOServer } from 'socket.io';
import { registerRealtime, emitToRoom, __resetRealtime } from './realtime';

/** Minimal stand-in for the two methods this module actually uses. */
function fakeIO() {
    const emit = vi.fn();
    const to = vi.fn(() => ({ emit }));
    return { io: { to } as unknown as SocketIOServer, to, emit };
}

describe('realtime registry', () => {
    beforeEach(() => __resetRealtime());
    afterEach(() => vi.restoreAllMocks());

    it('is a no-op before boot rather than a crash', () => {
        expect(() => emitToRoom('project:1', 'issue-activity', { a: 1 })).not.toThrow();
        expect(emitToRoom('project:1', 'issue-activity', { a: 1 })).toBe(false);
    });

    it('emits to the named room once registered', () => {
        const { io, to, emit } = fakeIO();
        registerRealtime(io);

        expect(emitToRoom('project:7', 'issue-activity', { issueId: 3 })).toBe(true);
        expect(to).toHaveBeenCalledWith('project:7');
        expect(emit).toHaveBeenCalledWith('issue-activity', { issueId: 3 });
    });

    // FAILURE CASE: the caller is on the ingest hot path. A throwing transport
    // must never become a failed ingest.
    it('swallows a throwing transport and reports the failure', () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const io = {
            to: () => {
                throw new Error('transport is gone');
            },
        } as unknown as SocketIOServer;
        registerRealtime(io);

        expect(() => emitToRoom('project:7', 'issue-activity', {})).not.toThrow();
        expect(emitToRoom('project:7', 'issue-activity', {})).toBe(false);
    });

    it('re-registering replaces the instance instead of stacking listeners', () => {
        const first = fakeIO();
        const second = fakeIO();
        registerRealtime(first.io);
        registerRealtime(second.io);

        emitToRoom('project:2', 'issue-activity', {});
        expect(first.emit).not.toHaveBeenCalled();
        expect(second.emit).toHaveBeenCalledOnce();
    });
});
