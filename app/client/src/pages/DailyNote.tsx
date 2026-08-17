import type { FC } from 'react';
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'motion/react';
import {
    FiAlertOctagon,
    FiAlertTriangle,
    FiCheck,
    FiCheckCircle,
    FiChevronLeft,
    FiChevronRight,
    FiEdit3,
    FiFileText,
    FiList,
    FiLoader,
    FiPlus,
    FiRefreshCw,
    FiSun,
} from 'react-icons/fi';
import {
    AccentButton,
    Badge,
    EmptyState,
    Input,
    Meter,
    PageHeader,
    SegmentedControl,
    Surface,
} from '@/components/design-system';
import type { JSONContent } from '@tiptap/react';
import { useDailyTodos, type SaveState } from '@/hooks/useDailyTodos';
import {
    addTodo,
    dailyNoteTitle,
    clearCompleted,
    filterTodos,
    moveTodo,
    removeTodo,
    renameTodo,
    todayKey,
    toggleTodo,
    type TodoFilter,
} from '@/lib/dailyTodos';
import { isEmptyRichDoc } from '@/lib/richText';
import { fadeUp } from '@/lib/motion';
import TaskRow from '@/components/tasks/TaskRow';
import TaskGroup from '@/components/tasks/TaskGroup';
import DailyNoteBadge from '@/components/tasks/DailyNoteBadge';

/**
 * Daily note & todos — one day at a time.
 *
 * Ported from `.agents/template/daily-note-todo-template.html` under the rules in
 * `.agents/docs/guides/template-adoption.md`: the information architecture is
 * harvested (day header with a stat rail, filter pills, a two-lane board of task
 * cards, a floating action dock), every visual decision in the source is
 * rejected. No hex, no icon font, no `overflow: hidden` body lock — the app
 * shell owns the viewport, and this page scrolls inside it.
 *
 * Two deliberate deviations from the mockup:
 *
 * - **Two lanes, not five.** The source's five colour columns carry no meaning —
 *   they are the same card repeated. A todo has exactly one axis, done or not,
 *   so inventing three more lanes would be chrome the data cannot fill.
 * - **Reordering is buttons, not drag.** Move up/down works from the keyboard
 *   and on touch, and costs no dependency. Drag can be added over it later.
 */

/**
 * The editor is ~300 kB of ProseMirror and it lives on exactly one route, so it
 * is split out — otherwise every page in the app pays for it at first load.
 */
const RichTextEditor = lazy(() => import('@/components/editor/RichTextEditor'));

const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'open', label: 'To do' },
    { value: 'done', label: 'Done' },
];

// ── Save state ────────────────────────────────────────────────

/**
 * What the document's save actually did.
 *
 * The mockup this page follows offers "Save as draft" and "Publish changes";
 * neither exists here, because a daily note has no draft state and autosave
 * makes an explicit save button a lie either way — it would already be saved
 * before it was pressed. What the user actually needs to know is whether their
 * words are on the server, so that is what this says. `dirty` is never dressed
 * up as saved.
 */
const SaveStatus: FC<{
    state: SaveState;
    savedAt: number | null;
    /** False before the day has any content — nothing has been written yet. */
    hasNote: boolean;
    onRetry: () => void;
}> = ({ state, savedAt, hasNote, onRetry }) => {
    const pill = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium';

    if (state === 'saving') {
        return (
            <span className={`${pill} bg-black/5 text-gray-600 dark:bg-white/10 dark:text-gray-300`}>
                <FiLoader size={12} className="animate-spin" aria-hidden />
                Saving…
            </span>
        );
    }
    if (state === 'dirty') {
        return (
            <span className={`${pill} bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200`}>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
                Unsaved changes
            </span>
        );
    }
    if (state === 'error') {
        // The only status with an action attached: a failed save is the one case
        // where the user can do something, and the retry has to be where the bad
        // news is rather than in a toast that has already gone.
        return (
            <span className={`${pill} bg-global-red/10 text-global-red`}>
                <FiAlertTriangle size={12} aria-hidden />
                Not saved
                <button
                    type="button"
                    onClick={onRetry}
                    className="rounded underline underline-offset-2 outline-none hover:no-underline focus-visible:ring-2 focus-visible:ring-global-red/40"
                >
                    Retry
                </button>
            </span>
        );
    }
    if (state === 'saved' && savedAt) {
        return (
            <span className={`${pill} bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200`}>
                <FiCheck size={12} aria-hidden />
                Saved {dayjs(savedAt).format('HH:mm')}
            </span>
        );
    }

    /**
     * `idle` — and it must **not** render nothing.
     *
     * This was the bug. `idle` is the state on every page load before the first
     * keystroke, so the page promised "saves itself as you type" and then showed
     * no evidence it ever had. Silence from a save indicator does not read as
     * "fine"; it reads as "this feature is not working", which is exactly what
     * happened.
     *
     * The two idle cases are genuinely different and are not collapsed: a day
     * with content is saved, a day with none has nothing to save because an
     * empty day deliberately writes no row (`useDailyTodos.ts`).
     */
    return hasNote ? (
        <span className={`${pill} bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200`}>
            <FiCheck size={12} aria-hidden />
            All changes saved
        </span>
    ) : (
        <span className={`${pill} bg-black/5 text-gray-500 dark:bg-white/10 dark:text-gray-400`}>
            Nothing to save yet
        </span>
    );
};

// ── Page ──────────────────────────────────────────────────────

const DailyNote: FC = () => {
    /**
     * `?date=YYYY-MM-DD` opens that day.
     *
     * The master list links here per day group, and "Open that day" has to land
     * on the day it names rather than on today. Read once at mount: after that
     * the in-page controls own the date, and re-reading the URL would fight them.
     */
    const [searchParams] = useSearchParams();
    const [dayKey, setDayKey] = useState<string>(() => {
        const requested = searchParams.get('date');
        return requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) && dayjs(requested).isValid()
            ? requested
            : todayKey();
    });
    const [filter, setFilter] = useState<TodoFilter>('all');
    const [draft, setDraft] = useState('');

    const {
        note, todos, body, richDoc, progress, loading, saving, error, notice, dismissNotice, refetch,
        commitTodos, queueDocument, flushDocument, saveState, savedAt,
    } = useDailyTodos(dayKey);

    const addRef = useRef<HTMLInputElement>(null);
    const day = useMemo(() => dayjs(dayKey), [dayKey]);
    const isToday = dayKey === todayKey();
    const readOnly = !!error;
    const busy = readOnly || saving;

    const visible = useMemo(() => filterTodos(todos, filter), [todos, filter]);
    const open = visible.filter((t) => !t.checked);
    const done = visible.filter((t) => t.checked);

    const shiftDay = (delta: number) => setDayKey(day.add(delta, 'day').format('YYYY-MM-DD'));

    /**
     * Does this day have something written down?
     *
     * `richDoc` first, `body` only as the fallback for notes written before rich
     * text existed. A document holding nothing but an image has no plain text at
     * all, so testing `body` alone would call a written day empty.
     */
    const hasEntry = useMemo(
        () => (richDoc ? !isEmptyRichDoc(richDoc) : body.trim().length > 0),
        [richDoc, body],
    );

    /**
     * The same question asked of the **stored note** rather than of the editor's
     * mirror of it.
     *
     * These are not interchangeable and the difference is a one-render race.
     * `useDailyTodos` sets `notes` and clears `loading` together, but copies the
     * note into `richDoc`/`body` from a *separate* effect keyed on `note` — so in
     * the very commit where `loading` first turns false, `richDoc` is still null
     * and `hasEntry` is still false. Deciding the opening mode from it opened a
     * day with a note straight into the editor, every reload.
     */
    const storedHasEntry = useMemo(() => {
        if (!note) return false;
        if (note.contentRich) return !isEmptyRichDoc(note.contentRich);
        return (note.content ?? '').trim().length > 0;
    }, [note]);

    const wordCount = useMemo(() => body.trim().split(/\s+/).filter(Boolean).length, [body]);

    /**
     * When the entry was last written.
     *
     * `savedAt` covers a save made in this session; `note.updatedAt` covers a day
     * loaded fresh, which is why the stamp carries a date as well as a time.
     *
     * That fallback was disabled for a while and is deliberately back. The stored
     * value used to be seven hours in the future — Prisma's `@updatedAt` was
     * serialised with a `UTC` suffix, Postgres converted it into the session
     * timezone before storing it in a `timestamp without time zone` column, and
     * it came back labelled `Z`. This card was the first surface in the app to
     * *display* `updatedAt` rather than sort by it, which is the only reason
     * anyone noticed. `lib/prisma.ts` now pins the session to UTC and
     * `scripts/repair-updated-at-skew.ts` corrected the rows already written.
     */
    const entrySavedAt = useMemo(() => {
        if (savedAt) return savedAt;
        const t = note?.updatedAt ? new Date(note.updatedAt).getTime() : NaN;
        return Number.isNaN(t) ? null : t;
    }, [savedAt, note]);

    /**
     * Writing mode vs. the saved entry.
     *
     * A day that already has a note opens as a **card** — the entry read back,
     * the way a journal shows you what you wrote. A blank day opens straight
     * into the editor, because making someone press "Write" before they can type
     * on an empty page is a click that buys nothing.
     *
     * The decision is made **once per day**, not derived from `hasEntry` on every
     * render. `richDoc` updates on each keystroke, so a live `!hasEntry` would
     * flip an empty day out of the editor the instant the first character landed
     * — mid-word.
     */
    const [editing, setEditing] = useState(false);
    const decidedFor = useRef<string | null>(null);

    useEffect(() => {
        if (loading || decidedFor.current === dayKey) return;
        decidedFor.current = dayKey;
        setEditing(!storedHasEntry);
    }, [loading, dayKey, storedHasEntry]);

    /** Leaving the editor flushes first — the card must never show stale text. */
    const finishEditing = () => {
        void flushDocument();
        setEditing(false);
    };

    /**
     * Ctrl/Cmd+S flushes the pending write.
     *
     * Strictly unnecessary — autosave has already scheduled it — but the reflex
     * is universal and the browser's own "save this page" dialog is a genuinely
     * bad answer to it, appearing over an app that had in fact saved. Honouring
     * the keystroke costs one listener and converts a moment of doubt into the
     * status pill flicking to "Saving…".
     */
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (!(e.key === 's' && (e.metaKey || e.ctrlKey))) return;
            e.preventDefault();
            if (!readOnly) void flushDocument();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [flushDocument, readOnly]);

    const submitTodo = (e: React.FormEvent) => {
        e.preventDefault();
        if (!draft.trim() || busy) return;
        commitTodos(addTodo(todos, draft));
        setDraft('');
        addRef.current?.focus();
    };

    return (
        /*
         * `@container`, so the split below measures THIS column rather than the
         * window.
         *
         * A viewport breakpoint is wrong here and measurably so. Two things eat
         * width before this page sees any of it: the nav rail, and the assistant
         * panel, which is 380px and remembers being open. On a 1280px window with
         * the panel out, `xl:` matched and split a **570px** container in two —
         * the editor got 338px, and its toolbar (17 controls, 655px of them)
         * wrapped into **seven rows**, a 156px-tall block of buttons above a
         * three-line note. Measured, not guessed.
         */
        <div className="@container mx-auto flex w-full max-w-6xl flex-col gap-7">
            <PageHeader
                title="Daily note"
                subtitle="One day, one list. Everything here is scheduled for the day you're looking at."
                actions={
                    <>
                        <AccentButton
                            variant="ghost"
                            size="sm"
                            icon={<FiRefreshCw size={14} />}
                            onClick={refetch}
                            disabled={loading}
                        >
                            {loading ? 'Refreshing…' : 'Refresh'}
                        </AccentButton>
                        <AccentButton
                            variant="ghost"
                            size="sm"
                            icon={<FiSun size={14} />}
                            onClick={() => setDayKey(todayKey())}
                            disabled={isToday}
                        >
                            Today
                        </AccentButton>
                    </>
                }
            />

            {/* ── Day header: navigation + the day's numbers ── */}
            <Surface variant="panel" radius="3xl" padding="md" reveal>
                <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            aria-label="Previous day"
                            onClick={() => shiftDay(-1)}
                            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-black/5 hover:text-brand-dark dark:hover:bg-white/10 dark:hover:text-white"
                        >
                            <FiChevronLeft size={16} />
                        </button>

                        <div className="flex min-w-0 flex-col">
                            <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                                {day.format('dddd')}
                                {isToday && <span className="ml-1.5 uppercase tracking-wider">· today</span>}
                            </span>
                            <h2 className="truncate text-2xl font-bold font-heading text-brand-dark dark:text-white">
                                {day.format('D MMMM YYYY')}
                            </h2>
                        </div>

                        <button
                            type="button"
                            aria-label="Next day"
                            onClick={() => shiftDay(1)}
                            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-black/5 hover:text-brand-dark dark:hover:bg-white/10 dark:hover:text-white"
                        >
                            <FiChevronRight size={16} />
                        </button>

                        <input
                            type="date"
                            aria-label="Jump to a day"
                            value={dayKey}
                            onChange={(e) => e.target.value && setDayKey(e.target.value)}
                            className="ml-auto rounded-xl border border-gray-200 bg-white/70 px-3 py-2 text-sm text-brand-dark outline-none focus-visible:ring-2 focus-visible:ring-brand-dark/25 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus-visible:ring-brand-accent/30"
                        />
                    </div>

                    {/*
                      * Progress on one line instead of three.
                      *
                      * This was a stat row of "N todos / N done / N remaining"
                      * above a full-width bar — four ways of saying the same
                      * number, stacked, in the widest element on the page. The
                      * bar carries the proportion, so the text only has to carry
                      * the count. Knob off on purpose: it glows, and this view's
                      * one accent belongs to the Add button.
                      */}
                    <div className="flex items-center gap-4">
                        <Meter value={progress.percent} knob={false} height={6} className="flex-1" />
                        <span className="flex shrink-0 items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <FiCheckCircle size={13} aria-hidden />
                            <span className="font-numbers font-semibold text-brand-dark dark:text-white">
                                {progress.done}/{progress.total}
                            </span>
                            done
                        </span>
                    </div>
                </div>
            </Surface>


            {/* Connection trouble and one-off notices belong above both columns:
                they are about the day, not about one half of it. */}
            {error && (
                <Surface variant="panel" radius="2xl" padding="sm">
                    <p className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                        <FiAlertOctagon className="shrink-0 text-amber-500" size={16} />
                        {error} Editing is disabled until the connection returns.
                    </p>
                </Surface>
            )}

            <AnimatePresence>
                {notice && (
                    <motion.div variants={fadeUp} initial="hidden" animate="show" exit="hidden">
                        <Surface variant="panel" radius="2xl" padding="sm">
                            <p className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                                <FiAlertOctagon className="shrink-0 text-amber-500" size={16} />
                                {notice}
                                <button
                                    type="button"
                                    onClick={dismissNotice}
                                    className="ml-auto shrink-0 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-brand-dark dark:hover:text-white"
                                >
                                    Dismiss
                                </button>
                            </p>
                        </Surface>
                    </motion.div>
                )}
            </AnimatePresence>

            {/*
              * The day's two halves, side by side.
              *
              * They used to be one full-width column: note, then a bare row of
              * controls floating between two cards, then the board. Three
              * problems came out of that stack. The add-a-todo field and the
              * filter belonged to the list but sat outside every card, so they
              * read as page chrome rather than as part of anything. The note and
              * the todos could never be seen at once, which is the one thing a
              * day view is for. And every section ran the full 72rem, so a
              * one-line todo was given the same width as a document.
              *
              * Now each function is exactly one card, and the grid gives the
              * writing surface the larger share. `items-start` keeps a short
              * note from being stretched to match a long list.
              *
              * The threshold is a **container** width of 56rem, picked from a
              * measurement rather than a guess: the editor toolbar's controls
              * total 655px, so the writing column must clear that plus the
              * card's padding or the toolbar starts stacking. At 56rem the
              * editor gets ~491px of content — the toolbar takes two tidy rows —
              * and the todo column ~289px, which comfortably holds a checkbox, a
              * label and three icon buttons. Below that, one column is honestly
              * better than two cramped ones.
              */}
            <div className="grid items-start gap-5 @4xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                {/* ── The day's document ── */}
                <Surface variant="panel" radius="3xl" padding="lg">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                <h2 className="text-base font-bold font-heading text-brand-dark dark:text-white">
                                    Day note
                                </h2>

                                {/* `aria-live` so the state change is announced, not
                                    just shown. This is the one piece of feedback the
                                    whole editor rests on. It wraps the status alone —
                                    a button inside a live region gets re-announced
                                    every time the status beside it changes. */}
                                <span className="ml-auto" aria-live="polite">
                                    <SaveStatus
                                        state={saveState}
                                        savedAt={savedAt}
                                        hasNote={note !== null}
                                        onRetry={() => { void flushDocument(); }}
                                    />
                                </span>

                                {editing ? (
                                    <AccentButton
                                        size="sm"
                                        variant="ghost"
                                        icon={<FiCheck size={14} />}
                                        onClick={finishEditing}
                                        disabled={readOnly}
                                    >
                                        Done
                                    </AccentButton>
                                ) : (
                                    <AccentButton
                                        size="sm"
                                        variant="ghost"
                                        icon={<FiEdit3 size={14} />}
                                        onClick={() => setEditing(true)}
                                        disabled={readOnly}
                                    >
                                        {hasEntry ? 'Edit' : 'Write'}
                                    </AccentButton>
                                )}
                            </div>

                            {/* The "no save button" line is only true of the editor,
                                so it only appears there. Over the saved card it
                                would be explaining a control the reader is not
                                looking at. */}
                            {editing && (
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                    Written up for {day.format('D MMM')}. There is no save button — it saves as you
                                    type.
                                </p>
                            )}
                        </div>

                        {loading ? (
                            <div className="h-64 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" aria-hidden />
                        ) : editing ? (
                            <Suspense
                                fallback={
                                    <div
                                        className="h-64 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5"
                                        aria-hidden
                                    />
                                }
                            >
                                <RichTextEditor
                                    // Remounting per day is deliberate: a document
                                    // editor holds undo history and a selection, and
                                    // carrying Monday's undo stack into Tuesday would
                                    // let Ctrl-Z paste Monday's text into Tuesday's
                                    // note. The mode is in the key for the same
                                    // reason — reader and editor configure the
                                    // instance differently at mount.
                                    key={`edit-${dayKey}`}
                                    doc={(richDoc as JSONContent | null) ?? null}
                                    plainFallback={body}
                                    // `readOnly`, **not** `busy`. `busy` includes
                                    // `saving`, and the whole point of autosave is
                                    // that a save in flight is invisible — disabling
                                    // the editor mid-save dropped focus and the
                                    // selection every 1.5 seconds, so no toolbar
                                    // control could ever be applied. Only a day that
                                    // failed to load makes this read-only.
                                    editable={!readOnly}
                                    placeholder="What is this day about?"
                                    onChange={queueDocument}
                                    onBlur={() => { void flushDocument(); }}
                                />
                            </Suspense>
                        ) : hasEntry ? (
                            /*
                             * The saved entry.
                             *
                             * The same component in `reader` mode, so what is read
                             * back is rendered by the same schema and the same prose
                             * rules that wrote it. A second renderer would drift,
                             * and a saved note would slowly stop looking like the
                             * note that was typed.
                             */
                            <motion.article
                                variants={fadeUp}
                                initial="hidden"
                                animate="show"
                                className="rounded-2xl border border-gray-200 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/5"
                            >
                                <Suspense
                                    fallback={
                                        <div
                                            className="h-24 animate-pulse rounded-xl bg-black/5 dark:bg-white/5"
                                            aria-hidden
                                        />
                                    }
                                >
                                    <RichTextEditor
                                        key={`read-${dayKey}`}
                                        variant="reader"
                                        doc={(richDoc as JSONContent | null) ?? null}
                                        plainFallback={body}
                                        onChange={() => {}}
                                    />
                                </Suspense>

                                <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-gray-200 pt-2.5 text-[11px] text-gray-400 dark:border-white/10 dark:text-gray-500">
                                    <span className="font-numbers">
                                        {wordCount} word{wordCount === 1 ? '' : 's'}
                                    </span>
                                    {entrySavedAt && (
                                        <>
                                            <span aria-hidden>·</span>
                                            <span>saved {dayjs(entrySavedAt).format('D MMM, HH:mm')}</span>
                                        </>
                                    )}
                                </p>
                            </motion.article>
                        ) : (
                            /* Written, then emptied — not the same as a day that was
                               never opened, so the editor does not silently reopen.
                               That would fight the user who just closed it. */
                            <EmptyState
                                size="sm"
                                icon={<FiFileText size={20} />}
                                title={`Nothing written for ${day.format('D MMM')}`}
                                description="This day has no note yet."
                                action={
                                    <AccentButton
                                        size="sm"
                                        icon={<FiEdit3 size={14} />}
                                        onClick={() => setEditing(true)}
                                        disabled={readOnly}
                                    >
                                        Write the note
                                    </AccentButton>
                                }
                            />
                        )}

                        {/*
                          * Where the note actually goes (US-01).
                          *
                          * A day note *is* a note — same table, tagged `daily` and
                          * scheduled on this day — so it already appears in Notes &
                          * Calendar. This used to be a grey footnote below the
                          * editor, which reads as small print; it now names the
                          * exact note and links straight to it.
                          */}
                        <DailyNoteBadge
                            title={dailyNoteTitle(dayKey)}
                            noteId={note?.id != null ? Number(note.id) : null}
                        />
                    </div>
                </Surface>

                {/* ── The day's todos ── */}
                <Surface variant="panel" radius="3xl" padding="lg">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                            <h2 className="text-base font-bold font-heading text-brand-dark dark:text-white">Todos</h2>
                            <Badge tone="neutral">{progress.total}</Badge>
                            <AccentButton
                                variant="ghost"
                                size="sm"
                                className="ml-auto"
                                onClick={() => commitTodos(clearCompleted(todos))}
                                disabled={busy || progress.done === 0}
                            >
                                Clear done
                            </AccentButton>
                        </div>

                        {/* The add field and the filter live INSIDE this card.
                            Floating between two cards, they belonged to neither. */}
                        <form className="flex items-center gap-2" onSubmit={submitTodo}>
                            <Input
                                ref={addRef}
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                disabled={busy}
                                placeholder={`Add a todo for ${day.format('D MMM')}…`}
                                aria-label="New todo"
                            />
                            <AccentButton
                                type="submit"
                                size="sm"
                                icon={<FiPlus size={14} />}
                                disabled={busy || !draft.trim()}
                            >
                                Add
                            </AccentButton>
                        </form>

                        <SegmentedControl
                            segments={FILTERS}
                            value={filter}
                            size="sm"
                            fullWidth
                            onChange={(v) => setFilter(v as TodoFilter)}
                        />

                        {loading ? (
                            <div className="flex flex-col gap-2.5" aria-hidden>
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="h-14 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" />
                                ))}
                            </div>
                        ) : todos.length === 0 ? (
                            <EmptyState
                                size="sm"
                                icon={<FiList size={20} />}
                                title={`Nothing planned for ${day.format('D MMM')}`}
                                description={
                                    note
                                        ? 'This day has a note but no todos left.'
                                        : 'Add a todo and this day starts a note of its own — it will show up in the calendar too.'
                                }
                                action={
                                    <AccentButton
                                        size="sm"
                                        icon={<FiPlus size={14} />}
                                        onClick={() => addRef.current?.focus()}
                                        disabled={busy}
                                    >
                                        Add a todo
                                    </AccentButton>
                                }
                            />
                        ) : (
                            <div className="flex flex-col gap-5">
                                {filter !== 'done' && (
                                    <TaskGroup
                                        title="To do"
                                        count={open.length}
                                        emptyLabel="Every todo on this day is done."
                                    >
                                        {open.map((t) => (
                                            <TaskRow
                                                key={t.id}
                                                todo={t}
                                                readOnly={busy}
                                                onToggle={() => commitTodos(toggleTodo(todos, t.id))}
                                                onRename={(text) => commitTodos(renameTodo(todos, t.id, text))}
                                                onMove={(d) => commitTodos(moveTodo(todos, t.id, d))}
                                                onRemove={() => commitTodos(removeTodo(todos, t.id))}
                                            />
                                        ))}
                                    </TaskGroup>
                                )}

                                {filter !== 'open' && (
                                    <TaskGroup
                                        title="Done"
                                        count={done.length}
                                        emptyLabel="Tick a todo and it moves down here."
                                    >
                                        {done.map((t) => (
                                            <TaskRow
                                                key={t.id}
                                                todo={t}
                                                readOnly={busy}
                                                onToggle={() => commitTodos(toggleTodo(todos, t.id))}
                                                onRename={(text) => commitTodos(renameTodo(todos, t.id, text))}
                                                onMove={(d) => commitTodos(moveTodo(todos, t.id, d))}
                                                onRemove={() => commitTodos(removeTodo(todos, t.id))}
                                            />
                                        ))}
                                    </TaskGroup>
                                )}
                            </div>
                        )}
                    </div>
                </Surface>
            </div>
        </div>
    );
};

export default DailyNote;
