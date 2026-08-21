import type { Server as SocketIOServer } from 'socket.io';

/**
 * The seam that lets a route push over sockets (R-D4).
 *
 * `io` is constructed in `server.ts` and deliberately not exported: importing
 * `server.ts` from `api/ingest.ts` is a cycle — the router is mounted *by*
 * `server.ts` — and requiring it would re-enter a half-initialised module.
 * A registry set once at boot inverts that. This module imports nothing but a
 * type, so nothing can import a cycle *through* it either.
 *
 * The contract that matters: **emitting is best-effort and can never throw.**
 * Ingest is the hot path. An event that was recorded but not broadcast is a
 * cosmetic problem; an event lost because a broadcast threw is data loss. Same
 * rule as `lib/alerts.ts`, for the same reason.
 */

let registered: SocketIOServer | null = null;

/** Called once, from `server.ts`, after the Socket.IO server is constructed. */
export function registerRealtime(io: SocketIOServer): void {
    registered = io;
}

/**
 * Emit to one room, or do nothing.
 *
 * Returns whether the frame was handed to Socket.IO — useful to a test and to a
 * caller that wants to log, and ignorable by everyone else. It is **not** a
 * delivery receipt: nobody may be in the room, and there is no buffer for the
 * ones who are disconnected (R-D5).
 *
 * Before boot — scripts, `ts-node -T` one-offs, and the test suite all import
 * routes without ever constructing an `io` — this is a no-op rather than a
 * crash. A broadcast is not worth taking a CLI script down for.
 */
export function emitToRoom(room: string, event: string, payload: unknown): boolean {
    if (!registered) return false;
    try {
        registered.to(room).emit(event, payload);
        return true;
    } catch (err) {
        // Swallowed on purpose. The caller is mid-request on the ingest path and
        // there is nothing useful it could do with this.
        console.error(`realtime emit failed (${event} → ${room}):`, err);
        return false;
    }
}

/** Test seam — clears the registry. Not used by application code. */
export function __resetRealtime(): void {
    registered = null;
}
