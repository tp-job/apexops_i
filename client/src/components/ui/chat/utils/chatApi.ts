/**
 * Chat API Utilities
 * 
 * Client-side utility functions for the chat system.
 * Pattern mirrors server/src/utils/chat.ts with additional socket.io integration.
 */

import type { ChatMessage, ChatRoom, ChatUser } from './chatTypes';
import { isMockEnabled, isNetworkFailure } from '@/utils/offlineMock';
import { mockChatUsers } from '@/utils/mockData';

// ============================================================================
// ID GENERATION
// ============================================================================

let _idCounter = 0;

/**
 * Generate a unique ID for messages
 */
export const generateId = (): string => {
    _idCounter++;
    return `msg_${Date.now()}_${_idCounter}_${Math.random().toString(36).slice(2, 7)}`;
};

// ============================================================================
// MESSAGE OPERATIONS (mirrors server/src/utils/chat.ts)
// ============================================================================

/**
 * Create a new chat message object
 */
export const createMessage = (params: {
    roomId: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    content: string;
    isSystem?: boolean;
}): ChatMessage => ({
    id: generateId(),
    roomId: params.roomId,
    senderId: params.senderId,
    senderName: params.senderName,
    senderAvatar: params.senderAvatar,
    content: params.content,
    createdAt: new Date(),
    isSystem: params.isSystem || false,
});

/**
 * Edit a message in a list by ID
 */
export const editMessage = (
    messages: ChatMessage[],
    messageId: string,
    newContent: string
): ChatMessage[] =>
    messages.map((msg) =>
        msg.id === messageId
            ? { ...msg, content: newContent, updatedAt: new Date() }
            : msg
    );

/**
 * Delete a message from a list by ID
 */
export const deleteMessage = (
    messages: ChatMessage[],
    messageId: string
): ChatMessage[] =>
    messages.filter((msg) => msg.id !== messageId);

/**
 * Group messages by room
 */
export const groupMessagesByRoom = (
    messages: ChatMessage[]
): Record<string, ChatMessage[]> => {
    return messages.reduce((acc, message) => {
        if (!acc[message.roomId]) {
            acc[message.roomId] = [];
        }
        acc[message.roomId].push(message);
        return acc;
    }, {} as Record<string, ChatMessage[]>);
};

/**
 * Sort messages by date (ascending)
 */
export const sortMessagesByDate = (
    messages: ChatMessage[]
): ChatMessage[] => {
    return [...messages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
};

// ============================================================================
// ROOM OPERATIONS
// ============================================================================

/**
 * Update a room's last message info
 */
export const updateRoomLastMessage = (
    rooms: ChatRoom[],
    roomId: string,
    message: string,
    time: string
): ChatRoom[] =>
    rooms.map((room) =>
        room.id === roomId
            ? { ...room, lastMessage: message, lastMessageTime: time }
            : room
    );

/**
 * Increment unread count for a room
 */
export const incrementUnread = (
    rooms: ChatRoom[],
    roomId: string
): ChatRoom[] =>
    rooms.map((room) =>
        room.id === roomId
            ? { ...room, unreadCount: room.unreadCount + 1 }
            : room
    );

/**
 * Clear unread count for a room
 */
export const clearUnread = (
    rooms: ChatRoom[],
    roomId: string
): ChatRoom[] =>
    rooms.map((room) =>
        room.id === roomId
            ? { ...room, unreadCount: 0 }
            : room
    );

// ============================================================================
// TIME FORMATTING
// ============================================================================

/**
 * Format a relative time string
 */
export const formatRelativeTime = (date: Date | string): string => {
    const now = new Date();
    const target = new Date(date);
    const diffMs = now.getTime() - target.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return 'now';
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHr < 24) return `${diffHr}h`;
    if (diffDay < 7) return `${diffDay}d`;
    return target.toLocaleDateString();
};

/**
 * Format a message timestamp
 */
export const formatMessageTime = (date: Date | string): string => {
    const target = new Date(date);
    return target.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Format a date separator string
 */
export const formatDateSeparator = (date: Date | string): string => {
    const target = new Date(date);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    if (target.toDateString() === now.toDateString()) return 'Today';
    if (target.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return target.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
};

// ============================================================================
// SAMPLE DATA (for demo purposes)
// ============================================================================

// NOTE: CURRENT_USER is a fallback for when AuthContext is not available.
// The Chat page should prefer the authenticated user from AuthContext.
const CURRENT_USER: ChatUser = {
    id: 'user_self',
    name: 'j_doe_tech',
    isOnline: true,
};

export const DEMO_ROOMS: ChatRoom[] = [
    {
        id: 'room_1',
        name: 'Sarah Jenkins',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAlqvGOPd0yO9iKPIb4ACXmCRTPWfAKV0r8JC-Sv4EqhFvB_SWVeA4l9NGSwaSfIra0G7Kfii9z1zs6H-hlJzaJU6iGYPpE8HlgFpnSltJdpBUZ3FoJran1YshYnyVCABXCcPL7FqNSPmXGqtB9S_80WzzDZg8BZOMjJLIyMb-X5i_eCEtuu3HQ-kGaMiC2syu181KX2GlRpaEEXGGLbslvU9zKGRXcylZkNtmKqJIljw4VQVeiTzbpplKLzXyluQMKhJkSEunMSaNo',
        lastMessage: 'Active now',
        lastMessageTime: '10m',
        unreadCount: 0,
        isOnline: true,
    },
    {
        id: 'room_2',
        name: 'Team DevOps',
        initials: 'TD',
        initialsColor: 'bg-purple-900/40 text-purple-400',
        lastMessage: 'Sent an attachment',
        lastMessageTime: '2m',
        unreadCount: 1,
        isGroup: true,
    },
    {
        id: 'room_3',
        name: 'Server Alerts',
        initials: '⚡',
        initialsColor: 'bg-orange-900/40 text-orange-400',
        lastMessage: 'CPU usage at 90%',
        lastMessageTime: '1h',
        unreadCount: 0,
    },
];

export const DEMO_MESSAGES: Record<string, ChatMessage[]> = {
    room_1: [
        {
            id: 'msg_1',
            roomId: 'room_1',
            senderId: 'sarah',
            senderName: 'Sarah Jenkins',
            senderAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDswSld_B8ZcheUODCF551qZqp_sQpG2fpb4W6QzvlMC5dczLL0Qd0O2-QR2Od4cHoFnsXYMZ_NCkGEssnVqjVRdACOujvF9pWjo5zCbtRoFc4YsvgwioVy-28z9p0Pxgi-LF4vnU7KyQUhOwekBMBIyAubUgRt2O1JhuOC6kzM4wWF38AUJ4TAxXEUhgASt9KQbhC69e2TIJh9kmzEyZimWdp9jy3faPuZn02fKJRhvqZCyA9Qvu3_wz3DpR8iRMGOSkVibxdUMJlo',
            content: 'Hi! I noticed the staging server seems a bit unresponsive. Is there maintenance going on?',
            createdAt: new Date(Date.now() - 600000),
        },
        {
            id: 'msg_2',
            roomId: 'room_1',
            senderId: 'user_self',
            senderName: 'j_doe_tech',
            content: 'Hey Sarah! Yes, I was just running some updates on the database.',
            createdAt: new Date(Date.now() - 500000),
        },
        {
            id: 'msg_3',
            roomId: 'room_1',
            senderId: 'user_self',
            senderName: 'j_doe_tech',
            content: 'It should be back up in about 2 minutes. Let me double check the logs real quick.',
            createdAt: new Date(Date.now() - 400000),
        },
        {
            id: 'msg_4',
            roomId: 'room_1',
            senderId: 'sarah',
            senderName: 'Sarah Jenkins',
            senderAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCDjDfvDf7Nwxyq0cHjZYFuwXskTjHm1qgQHgC63PQp5PrmX4ubBhp4nL7DWcunjmlbDrqs7s5maMuZMMqyZMzqh_Mlcc-UC1A4A6-d53K5SbreZSfE9JBSgKl2pJyB1i_D8n7ZUfj_LwYb3JW6l5mvi3EEVlVRDjLThXTQEOiz_NWFcHAXay1bgr5m3BCOS1E-gbFVGTLggKTnKqG0uD5dLYu8Xj5xf3_1B8H_y5pAVXsCffu4aNZ5qswWEEPq8IKQnYpZkHheIkw5',
            content: 'Okay, perfect. I was seeing this error on the login endpoint.',
            createdAt: new Date(Date.now() - 300000),
        },
    ],
    room_2: [
        {
            id: 'msg_td_1',
            roomId: 'room_2',
            senderId: 'system',
            senderName: 'System',
            content: 'Deployment pipeline completed successfully.',
            createdAt: new Date(Date.now() - 120000),
            isSystem: true,
        },
    ],
    room_3: [
        {
            id: 'msg_sa_1',
            roomId: 'room_3',
            senderId: 'system',
            senderName: 'Alert Bot',
            content: '⚠️ CPU usage at 90% on prod-server-01',
            createdAt: new Date(Date.now() - 3600000),
            isSystem: true,
        },
    ],
};

export const getCurrentUser = (): ChatUser => CURRENT_USER;

// Fetch chat-capable users from backend (users in database)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface ChatUserSummary {
    id: number;
    firstName: string;
    lastName: string;
    email?: string;
    avatarUrl?: string;
}

export const fetchChatUsers = async (query: string = ''): Promise<ChatUserSummary[]> => {
    const token = localStorage.getItem('accessToken');
    if (!token) return [];

    const url = new URL('/api/chat/users', API_BASE_URL);
    if (query.trim()) url.searchParams.set('q', query.trim());

    try {
        const res = await fetch(url.toString(), {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!res.ok) {
            console.error('Failed to fetch chat users');
            return [];
        }

        const data = await res.json();
        return data.users as ChatUserSummary[];
    } catch (err) {
        if (isMockEnabled() && isNetworkFailure(err)) {
            const q = query.trim().toLowerCase();
            const rows = (mockChatUsers as ChatUserSummary[]).slice();
            if (!q) return rows;
            return rows.filter((u) => {
                const hay = `${u.firstName} ${u.lastName} ${u.email ?? ''}`.toLowerCase();
                return hay.includes(q);
            });
        }
        console.error('Failed to fetch chat users', err);
        return [];
    }
};
