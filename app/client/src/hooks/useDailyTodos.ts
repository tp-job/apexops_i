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
import { isEmptyRichDoc, isRichDocTooLarge } from '@/lib/richText';

/**
 * The stateful half of `/daily` — one day's note, its todos, and its document.
 *
 * Three behaviours are worth knowing before changing anything here:
 *
 * **Writes are optimistic.** A checkbox that waits for a round trip feels
 * broken, and a todo list is the surface where that is most obvious. The new
 * list renders immediately and the request follows; a failure restores the
 * previous list and surfaces the reason, so the UI never claims a save that
 * did not happen.
 *
 * **The day's note is created lazily.** Navigating across a week must not
 * litter the database with seven empty notes, so the note is only written when
 * the user first adds a todo or types into the document.
 *
 * **The document autosaves; todos do not.** A todo is one atomic act and saves
 * on the spot. A document is typed continuously, so it is debounced — but it is
 * also the thing whose loss would hurt, so the debounce has a *ceiling* as well
 * as an idle delay, and every exit path (day change, unmount, tab close) flushes.
 * `saveState` reports what actually happened, never what was attempted.
 */

/** Quiet period before an edit is written. */
const AUTOSAVE_IDLE_MS = 1500;
/** Hard ceiling — continuous typing still saves this often. */
const AUTOSAVE_MAX_MS = 10_000;

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export interface UseDailyTodosResult {
    dayKey: string;
    note: Note | null;
    todos: DailyTodo[];
    /** Plain-text projection of the document — what search and card previews read. */
    body: string;
    /** The TipTap document, or null for a day whose note predates rich text. */
    richDoc: unknown | null;
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
    /** Records a document edit and schedules the autosave. */
    queueDocument: (doc: unknown, plainText: string) => void;
    /** Writes any pending document edit right now. */
    flushDocument: () => Promise<void>;
    saveState: SaveState;
    /** When the last successful document write landed. */
    savedAt: number | null;
}

export function useDailyTodos(dayKey: string): UseDailyTodosResult {
    const [notes, setNotes] = useState<Note[]>([]);
    const [todos, setTodos] = useState<DailyTodo[]>([]);
    const [body, setBody] = useState('');
    const [richDoc, setRichDoc] = useState<unknown | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const [savedAt, setSavedAt] = useState<number | null>(null);

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

    // The note list is the source of truth; local todo/document state mirrors
    // whichever note the current day resolves to, and is replaced whenever that
    // changes.
    useEffect(() => {
        setTodos(normalizeTodos(note?.checklistItems));
        setBody(note?.content ?? '');
        setRichDoc(note?.contentRich ?? null);
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
     * state so a todo write never clobbers a document edit and vice versa.
     *
     * `content` and `contentRich` always move together — that pairing is the
     * whole contract described in `lib/richText.ts`, and splitting them here is
     * how the plain projection would go stale against the document.
     */
    const persist = useCallback(
        async (patch: { todos?: DailyTodo[]; document?: { doc: unknown; text: string } }): Promise<boolean> => {
            const nextTodos = patch.todos ?? todos;
            const nextBody = patch.document ? patch.document.text : body;
            const nextDoc = patch.document ? patch.document.doc : richDoc;

            setSaving(true);
            try {
                if (note) {
                    const res = await updateNote(note.id, {
                        ...(patch.todos !== undefined && { checklistItems: serializeTodos(nextTodos) }),
                        ...(patch.document !== undefined && { content: nextBody, contentRich: nextDoc }),
                    });
                    if (!res.success || !res.data) {
                        setNotice(res.error ?? 'Could not save that change.');
                        return false;
                    }
                    mergeNote(res.data);
                } else {
                    // Nothing to create a note *for* yet — an empty edit on an empty
                    // day should leave no trace.
                    if (nextTodos.length === 0 && !nextBody.trim() && isEmptyRichDoc(nextDoc)) return true;

                    const res = await createNote({
                        title: dailyNoteTitle(dayKey),
                        content: nextBody,
                        ...(nextDoc !== null && { contentRich: nextDoc }),
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
        [note, todos, body, richDoc, dayKey, mergeNote],
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

    // ── Document autosave ────────────────────────────────────

    /** The edit waiting to be written, or null when everything is on the server. */
    const pending = useRef<{ doc: unknown; text: string } | null>(null);
    const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // `persist` closes over state that changes on every keystroke, so the timers
    // reach it through a ref — otherwise a scheduled save would fire the version
    // of `persist` that existed when the timer was set.
    const persistRef = useRef(persist);
    persistRef.current = persist;

    const clearTimers = () => {
        if (idleTimer.current) { clearTimeout(idleTimer.current); idleTimer.current = null; }
        if (maxTimer.current) { clearTimeout(maxTimer.current); maxTimer.current = null; }
    };

    const flushDocument = useCallback(async () => {
        clearTimers();
        const edit = pending.current;
        if (!edit) return;
        pending.current = null;

        setSaveState('saving');
        const ok = await persistRef.current({ document: edit });
        if (ok) {
            setSaveState('saved');
            setSavedAt(Date.now());
        } else {
            // The edit stays in local state — it is still on screen and still the
            // user's work. What is *not* claimed is that it was saved.
            setSaveState('error');
        }
    }, []);

    const flushRef = useRef(flushDocument);
    flushRef.current = flushDocument;

    const queueDocument = useCallback((doc: unknown, plainText: string) => {
        // Refuse oversized documents here rather than letting the request go and
        // come back a 400 about a field name.
        if (isRichDocTooLarge(doc)) {
            setNotice('This note is too large to save — remove some content (256 KB limit).');
            setSaveState('error');
            return;
        }

        setRichDoc(doc);
        setBody(plainText);
        pending.current = { doc, text: plainText };
        setSaveState('dirty');

        if (idleTimer.current) clearTimeout(idleTimer.current);
        idleTimer.current = setTimeout(() => { void flushRef.current(); }, AUTOSAVE_IDLE_MS);
        // Set once per dirty streak: continuous typing keeps resetting the idle
        // timer, and without a ceiling a fast typist would never save at all.
        if (!maxTimer.current) {
            maxTimer.current = setTimeout(() => { void flushRef.current(); }, AUTOSAVE_MAX_MS);
        }
    }, []);

    // A pending edit belongs to the day it was typed on. Flushing *before* the
    // day changes is not possible from here, so the effect's cleanup runs while
    // `persist` still closes over the outgoing note — which is exactly what it
    // needs to write to.
    useEffect(() => {
        return () => { void flushRef.current(); };
    }, [dayKey]);

    // Closing the tab cannot await a request, and there is no authenticated
    // beacon to send. So: start the write, and warn — an honest prompt beats a
    // silent loss of the last few seconds.
    useEffect(() => {
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            if (!pending.current) return;
            void flushRef.current();
            e.preventDefault();
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, []);

    return {
        dayKey,
        note,
        todos,
        body,
        richDoc,
        progress: todoProgress(todos),
        loading,
        saving,
        error,
        notice,
        dismissNotice: () => setNotice(null),
        refetch,
        commitTodos,
        queueDocument,
        flushDocument,
        saveState,
        savedAt,
    };
}
