import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAuthToken } from '@/api/config';
import type { ChatMessage, TypingEvent } from '@/types/chat';

interface UseChatOptions {
    /** Only used to decide whether to connect and to label own messages — the
     *  server derives the real sender identity from the access token. */
    currentUserId: number | null;
    /** Conversation to join — from `services/chat.ts`'s `getDirectRoomId`. `null` while no chat is open. */
    roomId: string | null;
}

export interface UseChatResult {
    messages: ChatMessage[];
    connected: boolean;
    /** Other participants currently typing in this room. */
    typingUserIds: string[];
    /** Server-side rejection (auth, room membership, rate limit), or null. */
    error: string | null;
    sendMessage: (content: string) => void;
    notifyTyping: () => void;
}

const TYPING_TIMEOUT_MS = 3000;

/**
 * Realtime 1:1 chat over the same Socket.IO server `useBugTrackerSocket` already
 * connects to (`VITE_WS_URL`, default `http://localhost:8081` — see
 * `app/server/src/server.ts`), registering as `clientType: 'chat'` instead of
 * `'monitor'`.
 *
 * Rebuilt from scratch: the previous chat logic (`components/ui/chat/logic/
 * useChatController.ts`) lived inside a UI folder rather than `hooks/`, so it did
 * not survive the 2026-07-24 UI reset. See `.agents/docs/product/user-flow.md`
 * Finding 3.
 *
 * **Authorisation lives on the server.** The handshake carries the access token;
 * the server verifies it, derives the sender from it, and emits only into the
 * conversation's own room after checking the caller is one of its two
 * participants. The `roomId` comparisons below are a *display* concern (ignore
 * echoes for a room you've since navigated away from) — they are no longer what
 * keeps one user's messages away from another. Do not reintroduce a global room.
 *
 * Messages are still **not persisted** — the server relays, there is no
 * `ChatMessage` model and no history endpoint. Sent messages appear from the
 * server's own echo rather than optimistically, so what you see is what was
 * actually accepted.
 */
export function useChat({ currentUserId, roomId }: UseChatOptions): UseChatResult {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [connected, setConnected] = useState(false);
    const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const socketRef = useRef<Socket | null>(null);
    const typingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    // The socket connection is kept alive across room switches (see below); the
    // listeners registered once in the effect below read this ref rather than
    // closing over `roomId`, which would otherwise go stale after the first render.
    const roomIdRef = useRef(roomId);
    roomIdRef.current = roomId;

    // Switching conversations starts with a clean pane — there's no history to fetch.
    // The server is told too, so the socket leaves the old room instead of
    // lingering in it.
    useEffect(() => {
        setMessages([]);
        setTypingUserIds([]);
        if (roomId && socketRef.current?.connected) {
            socketRef.current.emit('chat-join', { roomId });
        }
    }, [roomId]);

    useEffect(() => {
        if (!currentUserId) return;

        const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:8081';
        const socket = io(wsUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            // Verified server-side on every connect, including reconnects.
            auth: { token: getAuthToken() },
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            setConnected(true);
            setError(null);
            socket.emit('register', { clientType: 'chat' });
            // Re-join after a reconnect, otherwise the socket is authenticated
            // but sitting in no conversation.
            if (roomIdRef.current) socket.emit('chat-join', { roomId: roomIdRef.current });
        });

        socket.on('disconnect', () => setConnected(false));
        socket.on('connect_error', (err: Error) => {
            setConnected(false);
            setError(err.message === 'Unauthorized' ? 'Your session has expired. Sign in again.' : null);
        });
        socket.on('chat-error', (payload: { error?: string }) => {
            setError(payload?.error ?? 'The server rejected that.');
        });

        socket.on('chat-message', (msg: ChatMessage) => {
            if (msg.roomId !== roomIdRef.current) return;
            setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        });

        socket.on('user-typing', (data: TypingEvent) => {
            if (data.roomId !== roomIdRef.current) return;
            setTypingUserIds((prev) => (prev.includes(data.userId) ? prev : [...prev, data.userId]));
            clearTimeout(typingTimeouts.current[data.userId]);
            typingTimeouts.current[data.userId] = setTimeout(() => {
                setTypingUserIds((prev) => prev.filter((id) => id !== data.userId));
            }, TYPING_TIMEOUT_MS);
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
        // `roomId` is intentionally excluded: it's read via `roomIdRef` above so
        // switching conversations re-scopes the listeners without tearing down
        // and reconnecting the socket.
    }, [currentUserId]);

    const sendMessage = useCallback(
        (content: string) => {
            const trimmed = content.trim();
            if (!trimmed || !roomId || !currentUserId || !socketRef.current) return;
            // Only the room and the text are sent. Identity and message id are
            // assigned server-side from the verified token — anything this client
            // claimed about the sender would be discarded anyway.
            socketRef.current.emit('chat-message', { roomId, content: trimmed });
        },
        [roomId, currentUserId],
    );

    const notifyTyping = useCallback(() => {
        if (!roomId || !currentUserId || !socketRef.current) return;
        socketRef.current.emit('user-typing', { roomId });
    }, [roomId, currentUserId]);

    return { messages, connected, typingUserIds, error, sendMessage, notifyTyping };
}
