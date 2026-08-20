import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import type { JSONContent } from '@tiptap/react';
import { motion, AnimatePresence } from 'motion/react';
import {
    FiAlertOctagon,
    FiCalendar,
    FiCheck,
    FiChevronLeft,
    FiChevronRight,
    FiClock,
    FiEdit2,
    FiFileText,
    FiGrid,
    FiPlus,
    FiRefreshCw,
    FiSearch,
    FiSlash,
    FiStar,
    FiTag,
    FiTrash2,
} from 'react-icons/fi';
import {
    Surface,
    AccentButton,
    Badge,
    ConfirmDialog,
    ContextMenu,
    EmptyState,
    Input,
    Modal,
    PageHeader,
    SegmentedControl,
    useContextMenu,
    type ContextMenuItem,
} from '@/components/design-system';
import { useNoteList } from '@/hooks/useNoteList';
import { useDayDetail } from '@/hooks/useDayDetail';
import DayDetailPanel from '@/components/calendar/DayDetailPanel';
import DayMarkers from '@/components/calendar/DayMarkers';
import { describeDay } from '@/lib/dayMarkers';
import { useMonthMarkers } from '@/hooks/useMonthMarkers';
import EventDialog from '@/components/calendar/EventDialog';
import { createEvent, deleteEvent, updateEvent, type CalendarEvent } from '@/services/day';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { createNote, deleteNote, toggleNotePin, updateNote } from '@/services/notes';
import type { Note } from '@/types/notes';
import { DAILY_TAG } from '@/lib/dailyTodos';
import { NOTE_COLORS, colorFor } from '@/lib/noteColors';
import { legacyContentToRichDoc, looksLikeLegacyHtml, noteDisplayText } from '@/lib/richText';
import NoteForm, { type NoteDraft } from '@/components/notes/NoteForm';

/** A blank note, shared by the create form and the edit dialog's reset. */
const EMPTY_DRAFT: NoteDraft = { title: '', doc: null, text: '', color: null, tags: '' };
import { fadeUp, stagger } from '@/lib/motion';

/**
 * Notes + Calendar — one page, two modes.
 *
 * Merged deliberately rather than shipped as two routes: both read the same
 * Notes-backed data (see `.agents/docs/product/user-flow.md` Finding 2), and the
 * calendar is a *view* of notes, not a separate dataset.
 *
 * The scheduling affordance is the point of the Calendar mode. Before
 * `Note.scheduledFor` existed the calendar could only show when a note was
 * written; a note placed on a future day now stays there. Notes without a
 * schedule still appear on their creation day, marked as such.
 */

const MODES = [
    { value: 'notes', label: 'Notes', icon: <FiGrid size={14} /> },
    { value: 'calendar', label: 'Calendar', icon: <FiCalendar size={14} /> },
];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const NOTE_ACCENT: Record<string, string> = {
    text: 'bg-sky-500',
    list: 'bg-emerald-500',
    image: 'bg-violet-500',
    link: 'bg-amber-500',
};


/** Case-insensitive match across the fields a person would expect to search. */
const matchesQuery = (note: Note, q: string): boolean => {
    if (!q) return true;
    const hay = [note.title, noteDisplayText(note.content), ...(note.tags ?? [])].join(' ').toLowerCase();
    return hay.includes(q);
};

/** Tags are the note "categories". Deduplicated across the set, alphabetical. */
const collectTags = (notes: Note[]): string[] =>
    [...new Set(notes.flatMap((n) => n.tags ?? []).filter(Boolean))].sort((a, b) => a.localeCompare(b));

/** `a, b , ,c` → `['a','b','c']`. Used by the editor's tag field. */
const parseTags = (raw: string): string[] =>
    [...new Set(raw.split(',').map((t) => t.trim()).filter(Boolean))];

/** `YYYY-MM-DD` for the day a note belongs on: its schedule, else when it was written. */
const noteDayKey = (note: Note): string | null => {
    const raw = note.scheduledFor ?? note.createdAt;
    if (!raw) return null;
    const d = dayjs(raw);
    return d.isValid() ? d.format('YYYY-MM-DD') : null;
};

/** Shared chrome for the small square buttons on a card's action row. */
const cardAction =
    'shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors disabled:opacity-40 ' +
    'hover:bg-black/5 hover:text-brand-dark dark:hover:bg-white/10 dark:hover:text-white';

// ── Note card ─────────────────────────────────────────────────
const NoteCard: FC<{
    note: Note;
    readOnly: boolean;
    onPin: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onSchedule: (iso: string | null) => void;
    onPickTag: (tag: string) => void;
}> = ({ note, readOnly, onPin, onEdit, onDelete, onSchedule, onPickTag }) => {
    const scheduled = note.scheduledFor ? dayjs(note.scheduledFor) : null;
    const label = note.title || 'Untitled';

    return (
        <motion.li variants={fadeUp} layout>
            <Surface variant="frost" radius="2xl" padding="md" className="h-full">
                <div className="flex h-full flex-col gap-3">
                    <div className="flex items-start gap-2">
                        {/* An explicit colour wins over the type accent: the user
                            chose it, and a deliberate label should not be overruled
                            by a default derived from the note's kind. */}
                        <span
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                                note.color ? colorFor(note.color).dot : (NOTE_ACCENT[note.type] ?? 'bg-gray-400')
                            }`}
                            aria-hidden
                        />
                        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-brand-dark dark:text-white">
                            {label}
                        </h3>
                        <button
                            type="button"
                            onClick={onPin}
                            disabled={readOnly}
                            aria-label={note.isPinned ? `Unpin ${label}` : `Pin ${label}`}
                            aria-pressed={note.isPinned}
                            className={[
                                'shrink-0 rounded-lg p-1 transition-colors disabled:opacity-40',
                                note.isPinned
                                    ? 'text-brand-accent'
                                    : 'text-gray-400 hover:text-brand-dark dark:hover:text-white',
                            ].join(' ')}
                        >
                            <FiStar size={14} fill={note.isPinned ? 'currentColor' : 'none'} />
                        </button>
                    </div>

                    {noteDisplayText(note.content) && (
                        <p className="line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                            {/* A note written before the UI reset holds HTML in
                                `content`; printing it raw showed the reader `<p>`
                                and `&nbsp;`. One converter, at the one place that
                                knows this column can be legacy (D4). */}
                            {noteDisplayText(note.content)}
                        </p>
                    )}

                    <div className="mt-auto flex flex-wrap items-center gap-1.5">
                        {scheduled ? (
                            <Badge tone="accent">{scheduled.format('D MMM')}</Badge>
                        ) : (
                            <Badge tone="outline">unscheduled</Badge>
                        )}
                        {/* Categories are the fastest way into a filtered view, so they
                            are the control rather than decoration beside one. */}
                        {note.tags?.slice(0, 3).map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => onPickTag(t)}
                                title={`Filter by ${t}`}
                                className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand-dark/30 dark:focus-visible:ring-brand-accent/40"
                            >
                                <Badge tone="neutral" plainCase icon={<FiTag size={9} />}>
                                    {t}
                                </Badge>
                            </button>
                        ))}
                        {(note.tags?.length ?? 0) > 3 && (
                            <span className="text-[10px] text-gray-400">+{note.tags!.length - 3}</span>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5">
                        <input
                            type="date"
                            aria-label={`Schedule ${label}`}
                            disabled={readOnly}
                            value={scheduled ? scheduled.format('YYYY-MM-DD') : ''}
                            onChange={(e) => onSchedule(e.target.value ? e.target.value : null)}
                            className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white/60 px-2 py-1 text-xs text-brand-dark outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/50 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-white"
                        />
                        <button
                            type="button"
                            onClick={onEdit}
                            disabled={readOnly}
                            aria-label={`Edit ${label}`}
                            className={cardAction}
                        >
                            <FiEdit2 size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={onDelete}
                            disabled={readOnly}
                            aria-label={`Delete ${label}`}
                            className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-global-red/10 hover:text-global-red disabled:opacity-40"
                        >
                            <FiTrash2 size={14} />
                        </button>
                    </div>
                </div>
            </Surface>
        </motion.li>
    );
};

// ── Edit dialog ───────────────────────────────────────────────
/**
 * Editing was the one thing the Notes screen could not do: a note could be
 * pinned, scheduled and deleted, but never corrected. `Modal` gives focus
 * trapping and restore for free, which a click-to-edit-in-place card would have
 * had to earn.
 *
 * **It edits the document, not a flattened copy of it.** The earlier version put
 * a plain `<textarea>` here, so saving a note that carried formatting had to
 * throw the formatting away — it warned first, which is better than losing it
 * silently, but the warning was only ever needed because the dialog was weaker
 * than the note. Now the same `NoteForm` used to write a note is used to correct
 * one, and `contentRich` survives the round trip.
 */
const EditNoteDialog: FC<{
    note: Note | null;
    busy: boolean;
    onClose: () => void;
    onSave: (patch: {
        title: string;
        content: string;
        contentRich: unknown | null;
        color: string | null;
        tags: string[];
    }) => void;
}> = ({ note, busy, onClose, onSave }) => {
    const [draft, setDraft] = useState<NoteDraft>(EMPTY_DRAFT);

    // Reset from the note each time a different one is opened, so the dialog
    // never shows the previous note's text for a frame.
    useEffect(() => {
        setDraft({
            title: note?.title ?? '',
            // A legacy HTML note has no `contentRich`, so the draft is seeded with
            // the *converted* document rather than null. Without this, saving an
            // untouched legacy note would write the plain projection and silently
            // drop the structure the editor is showing on screen.
            doc:
                (note?.contentRich as JSONContent | null) ??
                (looksLikeLegacyHtml(note?.content) ? (legacyContentToRichDoc(note?.content) as JSONContent) : null),
            text: noteDisplayText(note?.content),
            color: note?.color ?? null,
            tags: (note?.tags ?? []).join(', '),
        });
    }, [note]);

    const valid = draft.title.trim() || draft.text.trim();

    return (
        <Modal
            open={!!note}
            onOpenChange={(o) => !o && onClose()}
            title="Edit note"
            description="Changes save to this note only."
            dismissible={!busy}
            footer={
                <>
                    <AccentButton variant="ghost" size="sm" onClick={onClose} disabled={busy}>
                        Cancel
                    </AccentButton>
                    <AccentButton
                        size="sm"
                        disabled={busy || !valid}
                        onClick={() =>
                            onSave({
                                title: draft.title.trim(),
                                content: draft.text.trim(),
                                contentRich: draft.doc,
                                color: draft.color,
                                tags: parseTags(draft.tags),
                            })
                        }
                    >
                        {busy ? 'Saving…' : 'Save changes'}
                    </AccentButton>
                </>
            }
        >
            <NoteForm
                // Keyed on the note so the undo stack never crosses notes.
                editorKey={`edit-${note?.id ?? 'none'}`}
                value={draft}
                onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
                plainFallback={note?.content ?? ''}
                busy={busy}
                autoFocus
            />
        </Modal>
    );
};

// ── Month grid ────────────────────────────────────────────────
const MonthGrid: FC<{
    month: Dayjs;
    notesByDay: Record<string, Note[]>;
    /** Task and event counts per day-of-month, for the markers (F007). */
    taskCounts: Record<number, number>;
    eventCounts: Record<number, number>;
    onPick: (dayKey: string) => void;
    selectedDay: string | null;
    /** Right-click on a note chip. */
    onNoteMenu: (event: React.MouseEvent, note: Note) => void;
    /** Right-click on the day cell itself, away from any chip. */
    onDayMenu: (event: React.MouseEvent, dayKey: string) => void;
}> = ({ month, notesByDay, taskCounts, eventCounts, onPick, selectedDay, onNoteMenu, onDayMenu }) => {
    const cells = useMemo(() => {
        const first = month.startOf('month');
        // `day()` is 0=Sunday; the grid starts Monday, so Sunday becomes the 7th slot.
        const lead = (first.day() + 6) % 7;
        const total = Math.ceil((lead + month.daysInMonth()) / 7) * 7;
        return Array.from({ length: total }, (_, i) => first.add(i - lead, 'day'));
    }, [month]);

    const today = dayjs().format('YYYY-MM-DD');

    return (
        <div className="flex flex-col gap-2">
            <div className="grid grid-cols-7 gap-1.5">
                {WEEKDAYS.map((d) => (
                    <span
                        key={d}
                        className="px-1 pb-1 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500"
                    >
                        {d}
                    </span>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
                {cells.map((d) => {
                    const key = d.format('YYYY-MM-DD');
                    const inMonth = d.month() === month.month();
                    const dayNotes = notesByDay[key] ?? [];
                    const isToday = key === today;
                    const isSelected = key === selectedDay;
                    // Counts only apply to days of *this* month; the leading and
                    // trailing cells belong to the neighbours and their numbers
                    // would collide with this month's day keys.
                    const nTasks = inMonth ? (taskCounts[d.date()] ?? 0) : 0;
                    const nEvents = inMonth ? (eventCounts[d.date()] ?? 0) : 0;

                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => onPick(key)}
                            onContextMenu={(e) => onDayMenu(e, key)}
                            aria-label={`${d.format('D MMMM YYYY')}, ${describeDay(dayNotes.length, nTasks, nEvents)}`}
                            aria-current={isToday ? 'date' : undefined}
                            className={[
                                'flex min-h-[76px] flex-col gap-1 rounded-xl p-2 text-left transition-colors',
                                !inMonth && 'opacity-35',
                                isSelected
                                    ? 'bg-brand-accent/20 ring-1 ring-brand-accent'
                                    : 'bg-black/[0.03] hover:bg-black/[0.06] dark:bg-white/5 dark:hover:bg-white/10',
                            ]
                                .filter(Boolean)
                                .join(' ')}
                        >
                            <span
                                className={[
                                    'font-numbers text-xs font-semibold',
                                    isToday
                                        ? 'text-brand-dark dark:text-brand-accent'
                                        : 'text-gray-500 dark:text-gray-400',
                                ].join(' ')}
                            >
                                {d.date()}
                                {isToday && <span className="ml-1 text-[9px] uppercase">today</span>}
                            </span>
                            <div className="flex flex-col gap-0.5">
                                {dayNotes.slice(0, 2).map((n) => (
                                    // A span, not a button: this sits inside the day
                                    // cell's own button, and nesting interactive
                                    // elements is invalid. Right-click does not
                                    // activate the parent, so the gesture is safe here.
                                    <span
                                        key={n.id}
                                        onContextMenu={(e) => onNoteMenu(e, n)}
                                        title={n.title || 'Untitled'}
                                        className={`truncate rounded px-1 py-0.5 text-[10px] ${colorFor(n.color).chip}`}
                                    >
                                        {n.title || 'Untitled'}
                                    </span>
                                ))}
                                {dayNotes.length > 2 && (
                                    <span className="px-1 text-[10px] text-gray-400">
                                        +{dayNotes.length - 2} more
                                    </span>
                                )}
                            </div>
                            <DayMarkers notes={dayNotes.length} tasks={nTasks} events={nEvents} />
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

// ── Page ──────────────────────────────────────────────────────
const NotesCalendar: FC = () => {
    const { notesList, loading, error, refetch } = useNoteList();

    const [mode, setMode] = useState<'notes' | 'calendar'>('notes');
    const [month, setMonth] = useState<Dayjs>(() => dayjs());
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [draft, setDraft] = useState<NoteDraft>(EMPTY_DRAFT);
    /**
     * Bumped after a successful create so the editor remounts empty.
     *
     * Clearing `draft` alone is not enough: TipTap keeps its own undo history,
     * and without a new key one Ctrl-Z after saving would resurrect the note you
     * just filed into the *next* blank one.
     */
    const [draftSeq, setDraftSeq] = useState(0);
    const [query, setQuery] = useState('');
    const [activeTag, setActiveTag] = useState<string | null>(null);
    const [editing, setEditing] = useState<Note | null>(null);
    const [pendingDelete, setPendingDelete] = useState<Note | null>(null);

    /**
     * `?note=<id>` opens that note directly.
     *
     * The daily-note badge promises to take you to *the note*, not to a list you
     * then have to search — a link that lands you on a page of thirty cards has
     * not kept that promise. The parameter is consumed once and then removed, so
     * closing the dialog does not leave a URL that reopens it on the next
     * refresh, and the back button behaves.
     */
    const [searchParams, setSearchParams] = useSearchParams();
    const requestedNoteId = searchParams.get('note');

    useEffect(() => {
        if (!requestedNoteId || loading) return;
        const found = notesList.find((n) => String(n.id) === requestedNoteId);
        if (found) setEditing(found);
        // Consumed either way: a stale id must not keep retrying on every render.
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete('note');
            return next;
        }, { replace: true });
    }, [requestedNoteId, loading, notesList, setSearchParams]);

    /**
     * `?day=YYYY-MM-DD` opens the calendar on that day.
     *
     * The master list links here per day group, and a day is only meaningful in
     * calendar mode, so the parameter sets the mode as well as the date rather
     * than landing on the notes grid with an invisible selection. Consumed once,
     * for the same reason `?note=` is: a URL that keeps reopening a day on every
     * refresh takes the page away from whoever is using it.
     */
    const requestedDay = searchParams.get('day');

    useEffect(() => {
        if (!requestedDay) return;
        // Shape-checked before parsing: `dayjs`'s strict mode needs the
        // `customParseFormat` plugin, which this app does not load, so without
        // the regex a value like "tomorrow" would parse to something plausible.
        const d = dayjs(requestedDay);
        if (/^\d{4}-\d{2}-\d{2}$/.test(requestedDay) && d.isValid()) {
            setMode('calendar');
            setMonth(d.startOf('month'));
            setSelectedDay(requestedDay);
        }
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete('day');
            next.delete('view');
            return next;
        }, { replace: true });
    }, [requestedDay, setSearchParams]);

    /**
     * Two menus, because there are two kinds of target — a note and an empty day —
     * and they offer different actions. Each is a *single* shared instance for
     * every element of its kind, per `useContextMenu`'s own contract: one portal
     * and one set of document listeners, not one per cell.
     */
    /**
     * The composed day behind the detail panel (US-07).
     *
     * Only fetched while a day is selected in calendar mode, so browsing the
     * notes list costs nothing.
     */
    const dayDetail = useDayDetail(mode === 'calendar' ? selectedDay : null);

    /** Task and event counts for the visible month, for the day markers (F007). */
    const monthMarkers = useMonthMarkers(month, mode === 'calendar');

    /** Which event the dialog is editing — null `event` means "create". */
    const [eventDraft, setEventDraft] = useState<{ dayKey: string; event: CalendarEvent | null } | null>(null);
    const [savingEvent, setSavingEvent] = useState(false);

    const noteMenu = useContextMenu<Note>();
    const dayMenu = useContextMenu<string>();

    // `useCalendarEvents` is kept mounted in calendar mode so its request (and the
    // server's timezone resolution) stays the source of truth for `totalNotes`,
    // while the grid renders from the note list we already hold.
    const { totalNotes, loading: calendarLoading } = useCalendarEvents(month);

    const readOnly = !!error;

    const notesByDay = useMemo(() => {
        const map: Record<string, Note[]> = {};
        notesList.forEach((n) => {
            const key = noteDayKey(n);
            if (key) (map[key] ??= []).push(n);
        });
        return map;
    }, [notesList]);

    const allTags = useMemo(() => collectTags(notesList), [notesList]);

    // Search and category narrow the list; pin-then-recency orders whatever survives.
    const sortedNotes = useMemo(() => {
        const q = query.trim().toLowerCase();
        return notesList
            .filter((n) => matchesQuery(n, q))
            .filter((n) => (activeTag ? (n.tags ?? []).includes(activeTag) : true))
            .sort(
                (a, b) =>
                    Number(b.isPinned) - Number(a.isPinned) ||
                    dayjs(b.updatedAt ?? 0).valueOf() - dayjs(a.updatedAt ?? 0).valueOf(),
            );
    }, [notesList, query, activeTag]);

    const filtered = !!query.trim() || !!activeTag;
    const clearFilters = () => { setQuery(''); setActiveTag(null); };

    const dayNotes = selectedDay ? (notesByDay[selectedDay] ?? []) : [];

    const run = useCallback(
        async (task: () => Promise<{ success: boolean; error?: string }>, failure: string) => {
            setBusy(true);
            setNotice(null);
            try {
                const res = await task();
                if (!res.success) setNotice(res.error ?? failure);
                else await refetch();
            } catch {
                setNotice(failure);
            } finally {
                setBusy(false);
            }
        },
        [refetch],
    );

    const submitNote = (e: React.FormEvent) => {
        e.preventDefault();
        if (!draft.title.trim() && !draft.text.trim()) return;
        run(
            () =>
                createNote({
                    title: draft.title.trim(),
                    // Both projections of the document, written together. `content`
                    // is what search and the card preview read; `contentRich` is
                    // what the editor reads back.
                    content: draft.text.trim(),
                    contentRich: draft.doc,
                    tags: parseTags(draft.tags),
                    // Omitted rather than sent as null: the API reads an explicit
                    // null as "clear it", and a create has nothing to clear.
                    ...(draft.color ? { color: draft.color } : {}),
                    // Creating from a picked calendar day schedules it there — that's
                    // the whole reason `scheduledFor` exists.
                    ...(selectedDay && mode === 'calendar' ? { scheduledFor: selectedDay } : {}),
                }),
            'Could not create that note.',
        ).then(() => {
            setDraft(EMPTY_DRAFT);
            setDraftSeq((n) => n + 1);
            setCreating(false);
        });
    };

    // Opening one menu closes the other. The chips live *inside* the day cells, so
    // without this a right-click could leave both surfaces open at once.
    /**
     * Write, or correct, the note for one day — the job `/daily` used to hold.
     *
     * An existing note opens in the edit dialog; a day with nothing written
     * opens the create form already pointed at that day, so the note lands where
     * the reader was looking rather than on today. Either way the calendar stays
     * on screen: the panel that raised the question keeps its context.
     */
    const writeDayNote = (dayKey: string) => {
        const existingId = dayDetail.day?.note?.id;
        const found =
            existingId != null ? notesList.find((n) => String(n.id) === String(existingId)) : undefined;
        if (found) {
            setEditing(found);
            return;
        }
        setSelectedDay(dayKey);
        setDraft(EMPTY_DRAFT);
        setDraftSeq((n) => n + 1);
        setCreating(true);
    };

    const openNoteMenu = (event: React.MouseEvent, note: Note) => {
        dayMenu.close();
        noteMenu.openAtCursor(event, note);
    };
    const openDayMenu = (event: React.MouseEvent, dayKey: string) => {
        noteMenu.close();
        dayMenu.openAtCursor(event, dayKey);
    };

    /**
     * Every action routes through `run()` — the same helper the visible buttons
     * already use — so busy state, the error notice and the refetch behave
     * identically no matter which surface triggered them. A menu that mutated
     * directly would be a second, silently divergent write path.
     */
    const noteMenuItems = (note: Note): ContextMenuItem[] => [
        {
            id: 'edit',
            label: 'Edit note…',
            icon: <FiEdit2 size={14} />,
            disabled: readOnly,
            // `EditNoteDialog` resets its own fields from this note, so opening it
            // is just naming the target — no field-copying handler needed.
            onSelect: () => setEditing(note),
        },
        {
            id: 'pin',
            label: note.isPinned ? 'Unpin note' : 'Pin note',
            icon: <FiStar size={14} />,
            disabled: readOnly,
            onSelect: () => run(() => toggleNotePin(note.id, !note.isPinned), 'Could not change the pin.'),
        },
        ...NOTE_COLORS.map((c, i) => {
            const current = (note.color ?? null) === c.id;
            return {
                id: `color-${c.id ?? 'none'}`,
                // Disabled rather than ticked: the menu has no selected-state
                // affordance, and an item that would change nothing should not
                // look actionable. The suffix says why it is greyed out.
                label: current ? `${c.label} (current)` : c.label,
                icon: <span className={`block h-3 w-3 rounded-full ${c.dot}`} />,
                separatorBefore: i === 0,
                disabled: readOnly || current,
                onSelect: () => run(() => updateNote(note.id, { color: c.id }), 'Could not change the colour.'),
            };
        }),
        ...(note.scheduledFor
            ? [
                  {
                      id: 'unschedule',
                      label: 'Unschedule',
                      icon: <FiSlash size={14} />,
                      separatorBefore: true,
                      disabled: readOnly,
                      // Explicit null clears it; omitting the key would be a no-op.
                      onSelect: () =>
                          run(
                              () => updateNote(note.id, { scheduledFor: null }),
                              'Could not unschedule that note.',
                          ),
                  },
              ]
            : []),
        {
            id: 'delete',
            label: 'Delete note',
            icon: <FiTrash2 size={14} />,
            destructive: true,
            separatorBefore: true,
            disabled: readOnly,
            onSelect: () => setPendingDelete(note),
        },
    ];

    const dayMenuItems = (dayKey: string): ContextMenuItem[] => {
        const count = notesByDay[dayKey]?.length ?? 0;
        return [
            {
                id: 'new',
                label: `New note on ${dayjs(dayKey).format('D MMM')}`,
                icon: <FiPlus size={14} />,
                disabled: readOnly,
                onSelect: () => {
                    setSelectedDay(dayKey);
                    setCreating(true);
                },
            },
            ...(count
                ? [
                      {
                          id: 'open',
                          label: `Open day · ${count} note${count === 1 ? '' : 's'}`,
                          icon: <FiCalendar size={14} />,
                          onSelect: () => setSelectedDay(dayKey),
                      },
                  ]
                : []),
        ];
    };

    const pinnedCount = notesList.filter((n) => n.isPinned).length;
    const scheduledCount = notesList.filter((n) => n.scheduledFor).length;

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Notes & Calendar"
                subtitle="Everything you've written, and everything you've planned — one dataset, two views."
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
                            size="sm"
                            icon={<FiPlus size={14} />}
                            onClick={() => setCreating((c) => !c)}
                            disabled={readOnly}
                        >
                            New note
                        </AccentButton>
                    </>
                }
            />

            <div className="flex flex-wrap items-center gap-3">
                <SegmentedControl
                    segments={MODES}
                    value={mode}
                    onChange={(v) => setMode(v as 'notes' | 'calendar')}
                />
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5">
                        <FiFileText size={13} /> {notesList.length} note{notesList.length === 1 ? '' : 's'}
                    </span>
                    <span aria-hidden>·</span>
                    <span className="flex items-center gap-1.5">
                        <FiStar size={13} /> {pinnedCount} pinned
                    </span>
                    <span aria-hidden>·</span>
                    <span className="flex items-center gap-1.5">
                        <FiClock size={13} /> {scheduledCount} scheduled
                    </span>
                </div>
            </div>

            {error && (
                <Surface variant="panel" radius="2xl" padding="sm">
                    <p className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                        <FiAlertOctagon className="shrink-0 text-amber-500" size={16} />
                        {error} Editing is disabled until the connection returns.
                    </p>
                </Surface>
            )}

            {notice && (
                <Surface variant="panel" radius="2xl" padding="sm">
                    <p className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                        <FiAlertOctagon className="shrink-0 text-amber-500" size={16} />
                        {notice}
                    </p>
                </Surface>
            )}

            <AnimatePresence>
                {creating && (
                    <motion.div variants={fadeUp} initial="hidden" animate="show" exit="hidden">
                        <Surface variant="panel" radius="3xl" padding="lg">
                            <form className="flex flex-col gap-4" onSubmit={submitNote}>
                                <div className="flex flex-col gap-2">
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                        <h2 className="text-base font-bold font-heading text-brand-dark dark:text-white">
                                            New note
                                            {selectedDay && mode === 'calendar' && (
                                                <span className="ml-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    for {dayjs(selectedDay).format('D MMM YYYY')}
                                                </span>
                                            )}
                                        </h2>

                                        <div className="ml-auto flex items-center gap-2">
                                            <AccentButton
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setCreating(false)}
                                                disabled={busy}
                                            >
                                                Cancel
                                            </AccentButton>
                                            <AccentButton
                                                type="submit"
                                                size="sm"
                                                icon={<FiCheck size={14} />}
                                                disabled={busy || (!draft.title.trim() && !draft.text.trim())}
                                            >
                                                {busy ? 'Saving…' : 'Save note'}
                                            </AccentButton>
                                        </div>
                                    </div>

                                    <p className="text-xs text-gray-400 dark:text-gray-500">
                                        Title or content — one of them is required. Formatting is kept.
                                    </p>
                                </div>

                                <NoteForm
                                    editorKey={`create-${draftSeq}`}
                                    value={draft}
                                    onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
                                    busy={busy}
                                    autoFocus
                                    footer={
                                        <p className="flex flex-wrap items-center gap-1.5 rounded-xl bg-black/[0.03] px-3 py-2 text-[11px] text-gray-500 dark:bg-white/5 dark:text-gray-400">
                                            <FiCalendar size={12} aria-hidden className="shrink-0" />
                                            {selectedDay && mode === 'calendar' ? (
                                                <>
                                                    This note lands on{' '}
                                                    <strong className="font-semibold text-brand-dark dark:text-white">
                                                        {dayjs(selectedDay).format('D MMM YYYY')}
                                                    </strong>{' '}
                                                    in the calendar.
                                                </>
                                            ) : (
                                                <>
                                                    Unscheduled notes appear in the calendar on the day they were
                                                    written.
                                                </>
                                            )}
                                        </p>
                                    }
                                />
                            </form>
                        </Surface>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Notes mode ─────────────────────────────────── */}
            {mode === 'notes' && (
                <Surface variant="panel" radius="3xl" padding="lg">
                    {/* Search + categories. Above the grid rather than in the page
                        header: they act on this view only, and the calendar mode
                        has no use for them. */}
                    <div className="mb-5 flex flex-col gap-3">
                        <Input
                            aria-label="Search notes"
                            icon={<FiSearch size={15} />}
                            placeholder="Search title, content or category…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />

                        {allTags.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="mr-0.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                    Categories
                                </span>
                                {allTags.map((t) => {
                                    const on = activeTag === t;
                                    return (
                                        <button
                                            key={t}
                                            type="button"
                                            aria-pressed={on}
                                            onClick={() => setActiveTag(on ? null : t)}
                                            className={[
                                                'rounded-full px-2.5 py-1 text-xs font-medium transition-colors outline-none',
                                                'focus-visible:ring-2 focus-visible:ring-brand-dark/30 dark:focus-visible:ring-brand-accent/40',
                                                on
                                                    ? 'bg-brand-dark text-white dark:bg-brand-accent dark:text-brand-dark'
                                                    : 'bg-black/5 text-gray-600 hover:bg-black/10 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20',
                                            ].join(' ')}
                                        >
                                            {t}
                                        </button>
                                    );
                                })}
                                {filtered && (
                                    <button
                                        type="button"
                                        onClick={clearFilters}
                                        className="ml-1 text-xs font-medium text-gray-400 underline-offset-2 hover:text-brand-dark hover:underline dark:hover:text-white"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        )}

                        {filtered && !loading && (
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                {sortedNotes.length} of {notesList.length} note
                                {notesList.length === 1 ? '' : 's'}
                            </p>
                        )}
                    </div>

                    {loading ? (
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="h-40 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" />
                            ))}
                        </div>
                    ) : notesList.length === 0 ? (
                        <EmptyState
                            icon={<FiFileText size={22} />}
                            title="No notes yet"
                            description="Write the first one. Anything you schedule will also show up in the calendar view."
                            action={
                                <AccentButton
                                    size="sm"
                                    icon={<FiPlus size={14} />}
                                    onClick={() => setCreating(true)}
                                    disabled={readOnly}
                                >
                                    New note
                                </AccentButton>
                            }
                        />
                    ) : sortedNotes.length === 0 ? (
                        /* Filtered to nothing is a different problem from having no
                           notes, and needs a different action. */
                        <EmptyState
                            size="sm"
                            icon={<FiSearch size={20} />}
                            title="Nothing matches"
                            description={
                                activeTag
                                    ? `No note in "${activeTag}" matches that search.`
                                    : 'No note matches that search.'
                            }
                            action={
                                <AccentButton variant="ghost" size="sm" onClick={clearFilters}>
                                    Clear filters
                                </AccentButton>
                            }
                        />
                    ) : (
                        <motion.ul
                            variants={stagger(0.04)}
                            initial="hidden"
                            animate="show"
                            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                        >
                            {sortedNotes.map((note) => (
                                <NoteCard
                                    key={note.id}
                                    note={note}
                                    readOnly={readOnly || busy}
                                    onPin={() =>
                                        run(
                                            () => toggleNotePin(note.id, !note.isPinned),
                                            'Could not change the pin.',
                                        )
                                    }
                                    onEdit={() => setEditing(note)}
                                    onDelete={() => setPendingDelete(note)}
                                    onSchedule={(iso) =>
                                        run(
                                            () => updateNote(note.id, { scheduledFor: iso }),
                                            'Could not reschedule that note.',
                                        )
                                    }
                                    onPickTag={(t) => setActiveTag((cur) => (cur === t ? null : t))}
                                />
                            ))}
                        </motion.ul>
                    )}
                </Surface>
            )}

            {/* ── Calendar mode ──────────────────────────────── */}
            {mode === 'calendar' && (
                <div className="grid gap-5 lg:grid-cols-3">
                    <motion.div variants={fadeUp} initial="hidden" animate="show" className="lg:col-span-2">
                        <Surface variant="panel" radius="3xl" padding="lg" className="h-full">
                            <div className="flex flex-col gap-5">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-base font-bold font-heading text-brand-dark dark:text-white">
                                        {month.format('MMMM YYYY')}
                                    </h2>
                                    {calendarLoading && (
                                        <span className="text-xs text-gray-400 dark:text-gray-500">loading…</span>
                                    )}
                                    <div className="ml-auto flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            aria-label="Previous month"
                                            onClick={() => setMonth((m) => m.subtract(1, 'month'))}
                                            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-black/5 hover:text-brand-dark dark:hover:bg-white/10 dark:hover:text-white"
                                        >
                                            <FiChevronLeft size={16} />
                                        </button>
                                        <AccentButton
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => { setMonth(dayjs()); setSelectedDay(null); }}
                                        >
                                            Today
                                        </AccentButton>
                                        <button
                                            type="button"
                                            aria-label="Next month"
                                            onClick={() => setMonth((m) => m.add(1, 'month'))}
                                            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-black/5 hover:text-brand-dark dark:hover:bg-white/10 dark:hover:text-white"
                                        >
                                            <FiChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>

                                <MonthGrid
                                    month={month}
                                    notesByDay={notesByDay}
                                    taskCounts={monthMarkers.tasksByDay}
                                    eventCounts={monthMarkers.eventsByDay}
                                    onPick={(k) => setSelectedDay((cur) => (cur === k ? null : k))}
                                    selectedDay={selectedDay}
                                    onNoteMenu={openNoteMenu}
                                    onDayMenu={openDayMenu}
                                />

                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                    {totalNotes} note{totalNotes === 1 ? '' : 's'} this month. Unscheduled notes
                                    appear on the day they were written. Right-click a note to edit, colour
                                    or delete it, or a day to add one.
                                </p>
                            </div>
                        </Surface>
                    </motion.div>

                    <div className="flex flex-col gap-5">
                    {/* Agenda / Tasks / Daily note for the chosen day (US-07).
                        Added ABOVE the existing note list rather than replacing
                        it: that list manages the day's notes and this panel
                        answers "what is on this day", which are different jobs. */}
                    {selectedDay && (
                        <DayDetailPanel
                            day={dayDetail.day}
                            dayKey={selectedDay}
                            loading={dayDetail.loading}
                            busy={dayDetail.busy}
                            onClose={() => setSelectedDay(null)}
                            onToggleTask={(t) => { void dayDetail.toggleTask(t); }}
                            onAddEvent={() => setEventDraft({ dayKey: selectedDay, event: null })}
                            onEditEvent={(e) => setEventDraft({ dayKey: selectedDay, event: e })}
                            onWriteNote={() => writeDayNote(selectedDay)}
                        />
                    )}

                    <motion.div variants={fadeUp} initial="hidden" animate="show">
                        <Surface variant="panel" radius="3xl" padding="lg" className="h-full">
                            <div className="flex h-full flex-col gap-4">
                                <h2 className="text-base font-bold font-heading text-brand-dark dark:text-white">
                                    {selectedDay ? dayjs(selectedDay).format('dddd, D MMM') : 'Pick a day'}
                                </h2>

                                {!selectedDay ? (
                                    <EmptyState
                                        size="sm"
                                        icon={<FiCalendar size={20} />}
                                        title="No day selected"
                                        description="Choose a day to see what's on it, or to add a note scheduled for it."
                                    />
                                ) : dayNotes.length === 0 ? (
                                    <EmptyState
                                        size="sm"
                                        icon={<FiCalendar size={20} />}
                                        title="Nothing on this day"
                                        description="Add a note and it will be scheduled here."
                                        action={
                                            <AccentButton
                                                size="sm"
                                                icon={<FiPlus size={14} />}
                                                onClick={() => setCreating(true)}
                                                disabled={readOnly}
                                            >
                                                Add note
                                            </AccentButton>
                                        }
                                    />
                                ) : (
                                    <ul className="flex flex-col gap-2">
                                        {dayNotes.map((n) => (
                                            <li
                                                key={n.id}
                                                onContextMenu={(e) => openNoteMenu(e, n)}
                                                className="flex flex-col gap-1 rounded-2xl bg-black/[0.03] px-4 py-3 dark:bg-white/5"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`h-2 w-2 shrink-0 rounded-full ${colorFor(n.color).dot}`}
                                                        aria-hidden
                                                    />
                                                    <span className="truncate text-sm font-semibold text-brand-dark dark:text-white">
                                                        {n.title || 'Untitled'}
                                                    </span>
                                                    {/* The half of the link that lives on this
                                                        side: a day note written on /daily lands
                                                        here as an ordinary note, and without
                                                        saying so this screen looks like a
                                                        separate place the same text has to be
                                                        re-entered. */}
                                                    {n.tags?.includes(DAILY_TAG) && (
                                                        <Badge tone="accent" className="ml-auto shrink-0">
                                                            daily
                                                        </Badge>
                                                    )}
                                                    {!n.scheduledFor && !n.tags?.includes(DAILY_TAG) && (
                                                        <Badge tone="outline" className="ml-auto shrink-0">
                                                            written
                                                        </Badge>
                                                    )}
                                                </div>
                                                {noteDisplayText(n.content) && (
                                                    <p className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                                                        {noteDisplayText(n.content)}
                                                    </p>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </Surface>
                    </motion.div>
                    </div>
                </div>
            )}

            <ContextMenu
                open={noteMenu.open}
                position={noteMenu.position}
                items={noteMenu.target ? noteMenuItems(noteMenu.target) : []}
                onClose={noteMenu.close}
                label={`Actions for ${noteMenu.target?.title || 'note'}`}
            />
            <ContextMenu
                open={dayMenu.open}
                position={dayMenu.position}
                items={dayMenu.target ? dayMenuItems(dayMenu.target) : []}
                onClose={dayMenu.close}
                label={
                    dayMenu.target
                        ? `Actions for ${dayjs(dayMenu.target).format('D MMMM YYYY')}`
                        : 'Day actions'
                }
            />

            {/*
              * One edit dialog, not two. Both branches of the merge grew one: this
              * side had an inline Modal over title/content, the daily-note branch
              * had `EditNoteDialog`. This one wins because it carries tags and
              * colour and edits the rich document in place, rather than flattening
              * it and leaving `content` and `contentRich` to disagree.
              */}
            <EditNoteDialog
                note={editing}
                busy={busy}
                onClose={() => setEditing(null)}
                onSave={(patch) => {
                    const target = editing;
                    if (!target) return;
                    // `contentRich` and `content` are written together, always. They
                    // are two projections of one document, and a save that moved
                    // only one of them would leave the note reading differently
                    // depending on which field a surface happened to render.
                    run(() => updateNote(target.id, patch), 'Could not save that note.').then(() =>
                        setEditing(null),
                    );
                }}
            />

            {/* Delete is destructive and was previously a single unguarded click on a
                card — exactly what ConfirmDialog exists to prevent. */}
            <ConfirmDialog
                open={!!pendingDelete}
                onOpenChange={(o) => !o && setPendingDelete(null)}
                title="Delete this note?"
                description={`"${pendingDelete?.title || 'Untitled'}" will be removed permanently. This cannot be undone.`}
                confirmLabel="Delete note"
                destructive
                onConfirm={async () => {
                    const target = pendingDelete;
                    if (!target) return;
                    await run(() => deleteNote(target.id), 'Could not delete that note.');
                    setPendingDelete(null);
                }}
            />

            {/*
              * Create / edit an appointment (F009).
              *
              * Both the day panel and the month grid open this, so it lives at
              * page level rather than inside either — one dialog instance, one
              * piece of state, no chance of two open at once.
              */}
            <EventDialog
                open={eventDraft !== null}
                dayKey={eventDraft?.dayKey ?? selectedDay ?? dayjs().format('YYYY-MM-DD')}
                event={eventDraft?.event ?? null}
                saving={savingEvent}
                onClose={() => setEventDraft(null)}
                onSave={async (input) => {
                    setSavingEvent(true);
                    try {
                        if (eventDraft?.event) await updateEvent(eventDraft.event.id, input);
                        else await createEvent(input);
                        setEventDraft(null);
                        // The panel is a read of what the server holds, so it is
                        // re-read rather than patched in place — see useDayDetail.
                        await dayDetail.reload();
                        await refetch();
                    } finally {
                        setSavingEvent(false);
                    }
                }}
                onDelete={async () => {
                    if (!eventDraft?.event) return;
                    setSavingEvent(true);
                    try {
                        await deleteEvent(eventDraft.event.id);
                        setEventDraft(null);
                        await dayDetail.reload();
                        await refetch();
                    } finally {
                        setSavingEvent(false);
                    }
                }}
            />
        </div>
    );
};

export default NotesCalendar;
