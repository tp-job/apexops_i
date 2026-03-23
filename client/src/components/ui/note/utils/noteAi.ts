import { getApiBaseUrl, getAuthHeaders } from '@/api/config';
import { isMockEnabled, isNetworkFailure } from '@/utils/offlineMock';
import { mockAiReply } from '@/utils/mockData';

export interface AiMessagePayload {
    role: 'user' | 'model';
    text: string;
}

export async function generateAiReply(history: AiMessagePayload[], prompt: string): Promise<string> {
    try {
        const response = await fetch(`${getApiBaseUrl()}/api/ai/chat`, {
            method: 'POST',
            headers: getAuthHeaders(true),
            body: JSON.stringify({ prompt, history: history.map((m) => ({ role: m.role, text: m.text })) }),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({})) as { error?: string };
            if (response.status === 429) return 'Rate limit exceeded. Please wait.';
            if (response.status === 403) return 'AI service access denied.';
            return err.error ?? 'Sorry, an error occurred.';
        }
        const data = (await response.json()) as { text?: string };
        return data.text ?? "I couldn't generate a response.";
    } catch (error: unknown) {
        console.error('AI generation failed', error);
        if (isMockEnabled() && isNetworkFailure(error)) return mockAiReply(prompt);
        return "Couldn't connect to the AI service. Check if the server is running.";
    }
}
