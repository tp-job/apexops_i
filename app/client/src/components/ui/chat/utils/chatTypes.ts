/**
 * Chat Type Definitions
 * 
 * Shared type definitions for the chat system.
 * Mirrors the pattern from server/src/utils/chat.ts
 */

export interface ChatMessage {
    id: string;
    roomId: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    content: string;
    createdAt: Date;
    updatedAt?: Date;
    isSystem?: boolean;
}

export interface ChatRoom {
    id: string;
    name: string;
    avatar?: string;
    initials?: string;
    initialsColor?: string;
    lastMessage?: string;
    lastMessageTime?: string;
    unreadCount: number;
    isOnline?: boolean;
    isGroup?: boolean;
    members?: ChatUser[];
}

export interface ChatUser {
    id: string;
    name: string;
    avatar?: string;
    isOnline: boolean;
    lastActive?: string;
}

export type MessageType = 'text' | 'image' | 'file' | 'system';
export type ToastType = 'success' | 'error' | 'info';
