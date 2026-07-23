/**
 * Chat message model used by the backend.
 *
 * IMPORTANT: This interface is intentionally kept in sync with
 * `client/src/components/ui/chat/utils/chatTypes.ts` so that the
 * Chat page (`client/src/pages/Chat.tsx`) can consume messages
 * from the server over Socket.IO without additional mapping.
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

// ---------- ID GENERATION ----------

let idCounter = 0;

const generateId = (): string => {
    idCounter++;
    return `msg_${Date.now()}_${idCounter}_${Math.random().toString(36).slice(2, 7)}`;
};

// ---------- CREATE MESSAGE ----------

export const createMessage = (
    params: {
        roomId: string;
        senderId: string;
        senderName: string;
        senderAvatar?: string;
        content: string;
        isSystem?: boolean;
    }
): ChatMessage => ({
    id: generateId(),
    roomId: params.roomId,
    senderId: params.senderId,
    senderName: params.senderName,
    senderAvatar: params.senderAvatar,
    content: params.content,
    createdAt: new Date(),
    isSystem: params.isSystem || false,
});

// ---------- UPDATE MESSAGE ----------

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

// ---------- DELETE MESSAGE ----------

export const deleteMessage = (
    messages: ChatMessage[],
    messageId: string
): ChatMessage[] =>
    messages.filter((msg) => msg.id !== messageId);

// ---------- GROUP BY ROOM ----------

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

// ---------- SORT MESSAGES ----------

export const sortMessagesByDate = (
    messages: ChatMessage[]
): ChatMessage[] => {
    return [...messages].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
};