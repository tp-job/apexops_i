import { useEffect, useRef, useState } from 'react';
import { updateNote } from './noteApi';
import { emitNoteUpdated } from './noteRealtime';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseNoteAutosaveOptions {
    noteId?: string | null;
    enabled: boolean;
    delay?: number;
    title: string;
    content: string;
}

export const useNoteAutosave = ({
    noteId,
    enabled,
    delay = 800,
    title,
    content,
}: UseNoteAutosaveOptions): AutosaveStatus => {
    const [status, setStatus] = useState<AutosaveStatus>('idle');
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        if (!enabled || !noteId) return;
        if (!title && !content) return;

        if (timerRef.current) {
            window.clearTimeout(timerRef.current);
        }

        setStatus('saving');

        timerRef.current = window.setTimeout(async () => {
            try {
                const result = await updateNote(noteId, { title, content });
                if (result.success) {
                    emitNoteUpdated(noteId, { title, content });
                    setStatus('saved');
                } else {
                    setStatus('error');
                }
            } catch (err) {
                console.error('Autosave error:', err);
                setStatus('error');
            }
        }, delay);

        return () => {
            if (timerRef.current) {
                window.clearTimeout(timerRef.current);
            }
        };
    }, [noteId, enabled, delay, title, content]);

    return status;
};

