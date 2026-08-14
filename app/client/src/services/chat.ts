/**
 * REST half of chat: the user picker. Message send/receive is realtime-only via
 * `hooks/useChat.ts` — the backend has no message-persistence model or history
 * endpoint (see `GET /api/chat/users` in `app/server/src/api/chat.ts`, the only
 * chat route that exists).
 */

import { getAuthToken } from '@/api/config';
import { fetchWithAuth } from '@/api/client';
import type { ChatUser } from '@/types/chat';

/** Users available to start a direct conversation with. Empty (not throwing) if logged out or offline. */
export async function fetchChatUsers(query?: string): Promise<ChatUser[]> {
    const token = getAuthToken();
    if (!token) return [];

    const qs = query?.trim() ? `?q=${encodeURIComponent(query.trim())}` : '';
    try {
        const res = await fetchWithAuth(`/api/chat/users${qs}`);
        if (!res.ok) return [];
        const data = (await res.json()) as { users: ChatUser[] };
        return data.users ?? [];
    } catch (err) {
        console.error('Failed to load chat users', err);
        return [];
    }
}

/**
 * Stable 1:1 room id derived from both participants, sorted so either side
 * computes the same value independently — there is no server-side room concept
 * to fetch it from.
 */
export function getDirectRoomId(userIdA: number, userIdB: number): string {
    return [userIdA, userIdB].sort((a, b) => a - b).join('_');
}
