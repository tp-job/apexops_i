/**
 * Direct-conversation room identity and authorisation.
 *
 * A DM room id is the two participants' user ids, ascending, joined by `_`
 * (`"3_7"`) — the same value the client derives in `utils/chatApi.ts`'s
 * `getDirectRoomId`. Because the id *is* the participant list, membership is
 * checkable from the id alone, with no `Conversation` table and no lookup.
 *
 * That property is what lets the socket be authorised now, while message
 * persistence stays deferred (see `.agents/docs/features/chat.md`).
 */

const DIRECT_ROOM = /^(\d+)_(\d+)$/;

export interface DirectRoom {
    id: string;
    participants: [number, number];
}

/** Parses a room id, rejecting malformed or non-canonical (unsorted) values. */
export function parseDirectRoom(roomId: unknown): DirectRoom | null {
    if (typeof roomId !== 'string') return null;

    const match = DIRECT_ROOM.exec(roomId);
    if (!match) return null;

    const a = Number(match[1]);
    const b = Number(match[2]);
    if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b) || a <= 0 || b <= 0) return null;

    // Canonical form only. Accepting both `3_7` and `7_3` would split one
    // conversation across two rooms, and each side would silently talk past
    // the other.
    if (a >= b) return null;

    return { id: roomId, participants: [a, b] };
}

/** True when `userId` is one of the room's two participants. */
export function isParticipant(room: DirectRoom, userId: number): boolean {
    return room.participants[0] === userId || room.participants[1] === userId;
}

/** The canonical room id for a pair of users. Mirrors the client's derivation. */
export function directRoomId(a: number, b: number): string {
    return [a, b].sort((x, y) => x - y).join('_');
}

export const MAX_MESSAGE_LENGTH = 4000;

/** Normalises inbound message text, or null when it isn't usable. */
export function sanitizeMessageContent(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    return trimmed.slice(0, MAX_MESSAGE_LENGTH);
}

/**
 * Fixed-window counter, one per socket. Cheap enough to run on every event and
 * enough to stop a runaway client or a trivial flood; it is not a substitute for
 * an edge rate limiter.
 */
export class RateLimiter {
    private count = 0;
    private windowStart = Date.now();

    constructor(
        private readonly limit: number,
        private readonly windowMs: number,
    ) {}

    /** True when the caller is within budget. */
    allow(): boolean {
        const now = Date.now();
        if (now - this.windowStart >= this.windowMs) {
            this.windowStart = now;
            this.count = 0;
        }
        this.count += 1;
        return this.count <= this.limit;
    }
}
