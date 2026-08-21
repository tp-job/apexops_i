import type { Socket } from 'socket.io';
import { decideIssueStreamJoin, isProjectRoom } from './issueStream';

/**
 * The `issues-join` handler, taken out of `server.ts` so it can be driven by a
 * real socket in a test without a database (R-D3).
 *
 * `server.ts` supplies the two things this needs from the process — who the
 * socket authenticated as, and the same `resolveMembership` the HTTP routes use.
 * Nothing else about the decision lives here; `decideIssueStreamJoin` owns it.
 */
export interface IssueStreamDeps {
    /** The verified user for this socket, or undefined for an anonymous one. */
    getUser: (socketId: string) => { id: number } | undefined;
    /** `lib/projectAccess.ts`'s `resolveMembership`, injected rather than imported. */
    resolveMembership: (
        slug: string,
        userId: number
    ) => Promise<{ project: { id: number } } | null>;
}

export function attachIssueStream(socket: Socket, deps: IssueStreamDeps): void {
    socket.on('issues-join', async (data: { slug?: unknown }) => {
        const user = deps.getUser(socket.id);
        const slug = typeof data?.slug === 'string' ? data.slug : null;

        let membership: { project: { id: number } } | null = null;
        if (user && slug) {
            try {
                membership = await deps.resolveMembership(slug, user.id);
            } catch (err) {
                // Fail CLOSED, exactly as the monitor admit does. If membership
                // cannot be read the answer is "no" — never "the handshake was
                // good enough".
                console.error('issue stream membership lookup failed:', err);
                membership = null;
            }
        }

        const decision = decideIssueStreamJoin({ userId: user?.id ?? null, membership });
        if (!decision.ok) {
            socket.emit('issues-error', { error: decision.error });
            return;
        }

        // Re-checked after the await: joining a disconnected socket leaves a dead
        // member in the room.
        if (!socket.connected) return;

        // One project at a time. The client views one issue list; a socket left
        // in a previous project's room keeps receiving that project's activity.
        socket.rooms.forEach((r) => {
            if (r !== socket.id && isProjectRoom(r) && r !== decision.room) socket.leave(r);
        });
        socket.join(decision.room);
        socket.emit('issues-joined', { slug });
    });
}
