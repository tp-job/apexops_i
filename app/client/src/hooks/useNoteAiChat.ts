import { useState, useCallback } from 'react';
import { generateAiReply } from '@/components/ui/note/utils/noteAi';

export interface AiMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: number;
}

export interface UseNoteAiChatResult {
    messages: AiMessage[];
    input: string;
    setInput: (value: string) => void;
    loading: boolean;
    sendMessage: () => Promise<void>;
    reset: () => void;
}

export function useNoteAiChat(): UseNoteAiChatResult {
    const [messages, setMessages] = useState<AiMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const sendMessage = useCallback(async () => {
        const text = input.trim();
        if (!text) return;

        const userMsg: AiMessage = {
            id: String(Date.now()),
            role: 'user',
            text,
            timestamp: Date.now(),
        };
        const historyWithUser = [...messages, userMsg];
        setMessages(historyWithUser);
        setInput('');
        setLoading(true);

        const replyText = await generateAiReply(
            historyWithUser.map((m) => ({ role: m.role, text: m.text })),
            text
        );
        const replyMsg: AiMessage = {
            id: String(Date.now() + 1),
            role: 'model',
            text: replyText,
            timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, replyMsg]);
        setLoading(false);
    }, [input, messages]);

    const reset = useCallback(() => {
        setMessages([]);
        setInput('');
        setLoading(false);
    }, []);

    return { messages, input, setInput, loading, sendMessage, reset };
}
