/**
 * Chat domain types — kept in sync with `app/server/src/utils/chat.ts`'s `ChatMessage`
 * so messages relayed over Socket.IO need no mapping on the way in or out.
 */

export interface ChatUser {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string | null;
}

export interface ChatMessage {
    id: string;
    roomId: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    content: string;
    createdAt: string;
    isSystem?: boolean;
}

export interface TypingEvent {
    roomId: string;
    userId: string;
}
