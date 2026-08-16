import { useCallback, useEffect, useRef, useState } from 'react';
import type { AssistantError, AssistantMessage, StoredKeyInfo } from '@/types/assistant';
import {
    AssistantRequestError,
    MAX_HISTORY_MESSAGES,
    deleteKey,
    fetchStoredKey,
    saveKey,
    sendMessage,
} from '@/services/assistant';

/**
 * The stateful half of the assistant panel (spec F009).
 *
 * **One thread, in memory, for this tab only** (D5). There is no message model
 * on the server and none is planned for v1, so persistence stops at
 * `sessionStorage`: a reload keeps your conversation, a new tab starts clean,
 * and nothing outlives the browser session. `localStorage` would quietly
 * accumulate other people's conversations on a shared machine.
 *
 * The thread is capped at the same `MAX_HISTORY_MESSAGES` the server enforces,
 * so what you see is what gets sent.
 */

const STORAGE_KEY = 'apexops.assistant.thread';

interface StoredMessage {
    id: string;
    role: AssistantMessage['role'];
    text: string;
    at: string;
}

/** `crypto.randomUUID` is unavailable on insecure origins; fall back rather than throw. */
const newId = (): string =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function readThread(): AssistantMessage[] {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as StoredMessage[];
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((m) => m && typeof m.text === 'string' && (m.role === 'user' || m.role === 'assistant'))
            .map((m) => ({ id: m.id || newId(), role: m.role, text: m.text, at: new Date(m.at) }));
    } catch {
        // Corrupt or unavailable storage must not stop the panel from opening.
        return [];
    }
}

function writeThread(messages: AssistantMessage[]): void {
    try {
        // An empty thread REMOVES the entry rather than storing `[]`.
        //
        // `clear()` deletes the key, but this effect runs immediately afterwards
        // on the new empty state and would write an empty array straight back —
        // so "new chat" left a storage artifact behind that nothing ever cleaned
        // up. Behaviourally harmless, but it meant the stored state and "there is
        // no conversation" disagreed, and storage that lies is how the next bug
        // gets built.
        if (messages.length === 0) sessionStorage.removeItem(STORAGE_KEY);
        else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
        /* over quota or disabled — the thread simply does not survive reload */
    }
}

export interface UseAssistant {
    messages: AssistantMessage[];
    sending: boolean;
    error: AssistantError | null;
    storedKey: StoredKeyInfo | null;
    keyLoading: boolean;
    send: (prompt: string) => Promise<void>;
    retryLast: () => Promise<void>;
    clear: () => void;
    dismissError: () => void;
    refreshKey: () => Promise<void>;
    submitKey: (apiKey: string) => Promise<void>;
    removeKey: () => Promise<void>;
}

export function useAssistant(enabled: boolean): UseAssistant {
    const [messages, setMessages] = useState<AssistantMessage[]>(readThread);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<AssistantError | null>(null);
    const [storedKey, setStoredKey] = useState<StoredKeyInfo | null>(null);
    const [keyLoading, setKeyLoading] = useState(false);

    /** Guards against a second send while one is in flight (REQ: one at a time). */
    const inFlight = useRef(false);
    /** The last prompt, so `retryLast` re-sends without the failed turn in history. */
    const lastPrompt = useRef<string | null>(null);

    useEffect(() => writeThread(messages), [messages]);

    const refreshKey = useCallback(async () => {
        setKeyLoading(true);
        try {
            setStoredKey(await fetchStoredKey());
        } catch {
            // Not fatal: the panel still works on the org key. The send path will
            // report NO_KEY if there genuinely is none.
            setStoredKey(null);
        } finally {
            setKeyLoading(false);
        }
    }, []);

    // Only once the panel is actually opened — mounting the shell should not
    // cost a request on every page load.
    useEffect(() => {
        if (enabled) void refreshKey();
    }, [enabled, refreshKey]);

    const runSend = useCallback(async (prompt: string, history: AssistantMessage[]) => {
        if (inFlight.current) return;
        inFlight.current = true;
        setSending(true);
        setError(null);
        lastPrompt.current = prompt;

        try {
            const reply = await sendMessage(prompt, history);
            setMessages((prev) => [
                ...prev,
                { id: newId(), role: 'assistant', text: reply.text, at: new Date() },
            ]);
        } catch (err) {
            setError(
                err instanceof AssistantRequestError
                    ? err.detail
                    : { code: 'UNKNOWN', message: 'Something went wrong' },
            );
        } finally {
            inFlight.current = false;
            setSending(false);
        }
    }, []);

    const send = useCallback(
        async (prompt: string) => {
            const text = prompt.trim();
            if (!text || inFlight.current) return;

            // The user's turn is appended optimistically so the thread reads
            // correctly while the reply is pending; the history handed to the
            // request is the state *before* it, since the prompt travels
            // separately.
            const history = messages.slice(-MAX_HISTORY_MESSAGES);
            setMessages((prev) => [...prev, { id: newId(), role: 'user', text, at: new Date() }]);
            await runSend(text, history);
        },
        [messages, runSend],
    );

    /**
     * Re-send the last prompt and replace the reply it produced.
     *
     * Two things here were learned the hard way:
     *
     * **The prompt is recovered from the thread, not only from a ref.**
     * `lastPrompt` lives in memory, so after a reload restored the conversation
     * from `sessionStorage` it was `null` and Retry silently did nothing — a
     * visible control that performs no action, which is the failure this
     * codebase explicitly refuses elsewhere. The thread is the durable source;
     * the ref is just the fast path.
     *
     * **The stale reply is dropped before re-sending.** The button says "retry
     * this reply", so leaving the old one and appending a second is not what it
     * claims to do — and it would send the failed answer back as context on the
     * next turn.
     */
    const retryLast = useCallback(async () => {
        if (inFlight.current) return;

        // Index of the newest user turn — the prompt to re-send.
        let promptIdx = -1;
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'user') {
                promptIdx = i;
                break;
            }
        }

        const prompt = promptIdx >= 0 ? messages[promptIdx].text : lastPrompt.current;
        if (!prompt) return;

        // Everything before the prompt is the context; the prompt travels
        // separately, and anything after it is the reply being replaced.
        const priorHistory = (promptIdx >= 0 ? messages.slice(0, promptIdx) : messages).slice(-MAX_HISTORY_MESSAGES);

        if (promptIdx >= 0) setMessages(messages.slice(0, promptIdx + 1));
        await runSend(prompt, priorHistory);
    }, [messages, runSend]);

    const clear = useCallback(() => {
        setMessages([]);
        setError(null);
        lastPrompt.current = null;
        try {
            sessionStorage.removeItem(STORAGE_KEY);
        } catch {
            /* nothing to clean up */
        }
    }, []);

    const dismissError = useCallback(() => setError(null), []);

    const submitKey = useCallback(async (apiKey: string) => {
        setKeyLoading(true);
        try {
            setStoredKey(await saveKey(apiKey));
            setError(null);
        } catch (err) {
            const detail =
                err instanceof AssistantRequestError ? err.detail : { code: 'UNKNOWN' as const, message: 'Could not save the key' };
            setError(detail);
            throw err; // the dialog needs to know it failed and stay open
        } finally {
            setKeyLoading(false);
        }
    }, []);

    const removeKey = useCallback(async () => {
        setKeyLoading(true);
        try {
            await deleteKey();
            setStoredKey(null);
        } finally {
            setKeyLoading(false);
        }
    }, []);

    return {
        messages,
        sending,
        error,
        storedKey,
        keyLoading,
        send,
        retryLast,
        clear,
        dismissError,
        refreshKey,
        submitKey,
        removeKey,
    };
}
