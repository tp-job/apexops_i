import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Note } from '@/components/ui/note/utils/noteTypes';
import { createNote, fetchNotes, updateNote } from '@/components/ui/note/utils/noteApi';
import {
    DAILY_TAG,
    dailyNoteTitle,
    dayAnchorIso,
    findDailyNote,
    normalizeTodos,
    serializeTodos,
    todoProgress,
    type DailyTodo,
    type TodoProgress,
} from '@/lib/dailyTodos';

/**
 * The stateful half of `/daily` — one day's note and its todos.
 *
 * Two behaviours are worth knowing before changing anything here:
 *
 * **Writes are optimistic.** A checkbox that waits for a round trip feels
 * broken, and a todo list is the surface where that is most obvious. The new
 * list renders immediately and the request follows; a failure restores the
 * previous list and surfaces the reason, so the UI never claims a save that
 * did not happen.
 *
 * **The day's note is created lazily.** Navigating across a week must not
 * litter the database with seven empty notes, so the note is only written when
 * the user first adds a todo or types a body.
 */

export interface UseDailyTodosResult {
    dayKey: string;
    note: Note | null;
    todos: DailyTodo[];
    body: string;
    progress: TodoProgress;
    loading: boolean;
    saving: boolean;
    /** Set when the day could not be loaded at all — the page goes read-only. */
    error: string | null;
    /** Set when one write failed. Clears on the next successful write. */
    notice: string | null;
    dismissNotice: () => void;
    refetch: () => Promise<void>;
    /** Applies a pure transform from `lib/dailyTodos` and persists the result. */
    commitTodos: (next: DailyTodo[]) => Promise<void>;
    saveBody: (text: string) => Promise<void>;
}

export function useDailyTodos(dayKey: string): UseDailyTodosResult {
    const [notes, setNotes] = useState<Note[]>([]);
    const [todos, setTodos] = useState<DailyTodo[]>([]);
    const [body, setBody] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    /**
     * Guards against a slow response for a day the user has already navigated
     * away from overwriting the day now on screen.
     */
    const activeDay = useRef(dayKey);
    activeDay.current = dayKey;

    const note = useMemo(() => findDailyNote(notes, dayKey), [notes, dayKey]);

    const refetch = useCallback(async () => {
        const requested = dayKey;
        setLoading(true);
        setError(null);
        try {
            const res = await fetchNotes();
            if (activeDay.current !== requested) return;
            if (res.success && res.data) setNotes(res.data);
            else setError(res.error ?? 'Failed to load your day.');
        } catch {
            if (activeDay.current === requested) setError('Failed to load your day.');
        } finally {
            if (activeDay.current === requested) setLoading(false);
        }
    }, [dayKey]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    // The note list is the source of truth; local todo/body state mirrors whichever
    // note the current day resolves to, and is replaced whenever that changes.
    useEffect(() => {
        setTodos(normalizeTodos(note?.checklistItems));
        setBody(note?.content ?? '');
    }, [note]);

    /** Folds a saved note back into the list so `findDailyNote` sees it next render. */
    const mergeNote = useCallback((saved: Note) => {
        setNotes((prev) => {
            const at = prev.findIndex((n) => String(n.id) === String(saved.id));
            if (at === -1) return [saved, ...prev];
            const next = prev.slice();
            next[at] = saved;
            return next;
        });
    }, []);

    /**
     * Writes to the day's note, creating it on first use.
     *
     * `patch` carries only what changed; the other half is read from current
     * state so a todo write never clobbers a body edit and vice versa.
     */
    const persist = useCallback(
        async (patch: { todos?: DailyTodo[]; content?: string }): Promise<boolean> => {
            const nextTodos = patch.todos ?? todos;
            const nextBody = patch.content ?? body;

            setSaving(true);
            try {
                if (note) {
                    const res = await updateNote(note.id, {
                        ...(patch.todos !== undefined && { checklistItems: serializeTodos(nextTodos) }),
                        ...(patch.content !== undefined && { content: nextBody }),
                    });
                    if (!res.success || !res.data) {
                        setNotice(res.error ?? 'Could not save that change.');
                        return false;
                    }
                    mergeNote(res.data);
                } else {
                    // Nothing to create a note *for* yet — an empty edit on an empty
                    // day should leave no trace.
                    if (nextTodos.length === 0 && !nextBody.trim()) return true;

                    const res = await createNote({
                        title: dailyNoteTitle(dayKey),
                        content: nextBody,
                        type: 'list',
                        tags: [DAILY_TAG],
                        checklistItems: serializeTodos(nextTodos),
                        scheduledFor: dayAnchorIso(dayKey),
                    });
                    if (!res.success || !res.data) {
                        setNotice(res.error ?? 'Could not start this day.');
                        return false;
                    }
                    mergeNote(res.data);
                }
                setNotice(null);
                return true;
            } catch {
                setNotice('Could not save that change.');
                return false;
            } finally {
                setSaving(false);
            }
        },
        [note, todos, body, dayKey, mergeNote],
    );

    const commitTodos = useCallback(
        async (next: DailyTodo[]) => {
            const previous = todos;
            setTodos(next);
            const ok = await persist({ todos: next });
            if (!ok) setTodos(previous);
        },
        [todos, persist],
    );

    const saveBody = useCallback(
        async (text: string) => {
            if (text === (note?.content ?? '')) return;
            const previous = body;
            setBody(text);
            const ok = await persist({ content: text });
            if (!ok) setBody(previous);
        },
        [note, body, persist],
    );

    return {
        dayKey,
        note,
        todos,
        body,
        progress: todoProgress(todos),
        loading,
        saving,
        error,
        notice,
        dismissNotice: () => setNotice(null),
        refetch,
        commitTodos,
        saveBody,
    };
}
