import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from '@/context/AuthContext';
import type { ChatMessage, ChatRoom } from '../utils/chatTypes';
import {
    createMessage,
    sortMessagesByDate,
    formatRelativeTime,
    updateRoomLastMessage,
    clearUnread,
    incrementUnread,
    getCurrentUser,
    DEMO_ROOMS,
    DEMO_MESSAGES,
    type ChatUserSummary,
} from '../utils/chatApi';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:8081';

export interface UseChatControllerOptions {
    /** Optional: prefer a specific room when mounting (e.g. from /chat/new) */
    initialRoomId?: string;
    /** Optional: start a new DM with this user on mount */
    startChatWith?: ChatUserSummary | null;
}

export interface UseChatControllerResult {
    rooms: ChatRoom[];
    selectedRoomId: string | null;
    setSelectedRoomId: (roomId: string) => void;
    currentUser: { id: string; name: string };
    currentMessages: ChatMessage[];
    inputValue: string;
    setInputValue: (value: string) => void;
    handleSend: () => void;
    isTyping: boolean;
    socketConnected: boolean;
    startChatWithUser: (user: ChatUserSummary) => void;
}

export function useChatController(options: UseChatControllerOptions = {}): UseChatControllerResult {
    const { user } = useAuth();

    const authUser = useMemo(
        () =>
            user
                ? { id: String(user.id), name: `${user.firstName} ${user.lastName}` }
                : getCurrentUser(),
        [user],
    );

    const [rooms, setRooms] = useState<ChatRoom[]>(DEMO_ROOMS);

    const [allMessages, setAllMessages] = useState<Record<string, ChatMessage[]>>(DEMO_MESSAGES);

    const [selectedRoomId, setSelectedRoomIdState] = useState<string | null>(
        options.initialRoomId ?? 'room_1',
    );
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [socketConnected, setSocketConnected] = useState(false);

    const socketRef = useRef<Socket | null>(null);
    const selectedRoomIdRef = useRef<string | null>(selectedRoomId);
    const typingThrottleRef = useRef<number>(0);

    useEffect(() => {
        selectedRoomIdRef.current = selectedRoomId;
    }, [selectedRoomId]);

    const currentMessages = useMemo(
        () =>
            selectedRoomId
                ? sortMessagesByDate(allMessages[selectedRoomId] ?? [])
                : [],
        [allMessages, selectedRoomId],
    );

    // ── Socket.IO connection & handlers ─────────────────────────
    useEffect(() => {
        const socket = io(WS_URL, {
            transports: ['websocket', 'polling'],
            autoConnect: true,
            auth: (() => {
                const token = localStorage.getItem('accessToken');
                return token ? { token } : undefined;
            })(),
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            setSocketConnected(true);
            socket.emit('register', { clientType: 'chat', userId: authUser.id });
        });

        socket.on('disconnect', () => setSocketConnected(false));

        socket.on('chat-message', (msg: ChatMessage) => {
            // De-dupe: sender may already have optimistic message locally,
            // and some servers broadcast back to the sender.
            setAllMessages((prev) => {
                const existing = prev[msg.roomId] || [];
                if (existing.some((m) => m.id === msg.id)) return prev;
                return {
                    ...prev,
                    [msg.roomId]: [...existing, msg],
                };
            });

            setRooms((prev) =>
                updateRoomLastMessage(prev, msg.roomId, msg.content, formatRelativeTime(msg.createdAt)),
            );

            const currentSelected = selectedRoomIdRef.current;
            if (msg.roomId !== currentSelected && msg.senderId !== authUser.id) {
                setRooms((prev) => incrementUnread(prev, msg.roomId));
            }
        });

        socket.on('user-typing', (data: { roomId: string; userId: string }) => {
            const currentSelected = selectedRoomIdRef.current;
            if (data.roomId === currentSelected && data.userId !== authUser.id) {
                setIsTyping(true);
                setTimeout(() => setIsTyping(false), 3000);
            }
        });

        return () => {
            socket.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authUser.id]);

    // ── Public actions ──────────────────────────────────────────
    const setSelectedRoomId = useCallback((roomId: string) => {
        setSelectedRoomIdState(roomId);
        setRooms((prev) => clearUnread(prev, roomId));
    }, []);

    const handleSend = useCallback(() => {
        const text = inputValue.trim();
        if (!text || !selectedRoomId) return;

        const msg = createMessage({
            roomId: selectedRoomId,
            senderId: authUser.id,
            senderName: authUser.name,
            content: text,
        });

        setAllMessages((prev) => ({
            ...prev,
            [selectedRoomId]: [...(prev[selectedRoomId] || []), msg],
        }));

        setRooms((prev) =>
            updateRoomLastMessage(prev, selectedRoomId, text, 'now'),
        );

        if (socketRef.current?.connected) {
            socketRef.current.emit('chat-message', msg);
        }

        setInputValue('');
    }, [authUser.id, authUser.name, inputValue, selectedRoomId]);

    const startChatWithUser = useCallback((target: ChatUserSummary) => {
        const roomId = `dm_${authUser.id}_${target.id}`;
        setRooms((prev) => {
            if (prev.some((r) => r.id === roomId)) return prev;
            const displayName = `${target.firstName} ${target.lastName}`;
            const newRoom: ChatRoom = {
                id: roomId,
                name: displayName,
                avatar: target.avatarUrl,
                lastMessage: '',
                lastMessageTime: '',
                unreadCount: 0,
                isOnline: false,
            };
            return [newRoom, ...prev];
        });
        setSelectedRoomId(roomId);
    }, [authUser.id, setSelectedRoomId]);

    // Emit typing events with simple throttle
    useEffect(() => {
        if (!socketRef.current?.connected || !selectedRoomId) return;
        const now = Date.now();
        if (now - typingThrottleRef.current < 1500) return;
        typingThrottleRef.current = now;
        socketRef.current.emit('user-typing', {
            roomId: selectedRoomId,
            userId: authUser.id,
        });
    }, [inputValue, selectedRoomId, authUser.id]);

    // Optional: start chat with user on mount (used by /chat/new)
    useEffect(() => {
        if (!options.startChatWith) return;
        startChatWithUser(options.startChatWith);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [options.startChatWith]);

    return {
        rooms,
        selectedRoomId,
        setSelectedRoomId,
        currentUser: authUser,
        currentMessages,
        inputValue,
        setInputValue,
        handleSend,
        isTyping,
        socketConnected,
        startChatWithUser,
    };
}

