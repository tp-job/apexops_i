import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ChatMessage, TypingEvent } from '@/types/chat';

interface UseChatOptions {
    currentUserId: number | null;
    currentUserName: string;
    currentUserAvatar?: string;
    /** Conversation to join — from `utils/chatApi.ts`'s `getDirectRoomId`. `null` while no chat is open. */
    roomId: string | null;
}

export interface UseChatResult {
    messages: ChatMessage[];
    connected: boolean;
    /** Other participants currently typing in this room. */
    typingUserIds: string[];
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
 * not survive the 2026-07-24 UI reset. See `.agents/docs/frontend/user-flow.md`
 * Finding 3.
 *
 * Messages are **not persisted** — the server only relays (`io.to('chat-users')
 * .emit(...)`, no `ChatMessage` Prisma model, no history endpoint). Sent messages
 * are added to local state from the server's own echo, not optimistically, since
 * the server broadcasts to the whole room including the sender.
 */
export function useChat({
    currentUserId,
    currentUserName,
    currentUserAvatar,
    roomId,
}: UseChatOptions): UseChatResult {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [connected, setConnected] = useState(false);
    const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
    const socketRef = useRef<Socket | null>(null);
    const typingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    // The socket connection is kept alive across room switches (see below); the
    // listeners registered once in the effect below read this ref rather than
    // closing over `roomId`, which would otherwise go stale after the first render.
    const roomIdRef = useRef(roomId);
    roomIdRef.current = roomId;

    // Switching conversations starts with a clean pane — there's no history to fetch.
    useEffect(() => {
        setMessages([]);
        setTypingUserIds([]);
    }, [roomId]);

    useEffect(() => {
        if (!currentUserId) return;

        const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:8081';
        const socket = io(wsUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            setConnected(true);
            socket.emit('register', { clientType: 'chat', userId: String(currentUserId) });
        });

        socket.on('disconnect', () => setConnected(false));
        socket.on('connect_error', () => setConnected(false));

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
            const msg: ChatMessage = {
                id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                roomId,
                senderId: String(currentUserId),
                senderName: currentUserName,
                senderAvatar: currentUserAvatar,
                content: trimmed,
                createdAt: new Date().toISOString(),
            };
            socketRef.current.emit('chat-message', msg);
        },
        [roomId, currentUserId, currentUserName, currentUserAvatar],
    );

    const notifyTyping = useCallback(() => {
        if (!roomId || !currentUserId || !socketRef.current) return;
        socketRef.current.emit('user-typing', { roomId, userId: String(currentUserId) } satisfies TypingEvent);
    }, [roomId, currentUserId]);

    return { messages, connected, typingUserIds, sendMessage, notifyTyping };
}
