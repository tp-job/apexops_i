import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import dayjs, { type Dayjs } from 'dayjs';
import { motion, AnimatePresence } from 'motion/react';
import {
    FiAlertOctagon,
    FiCalendar,
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
    Field,
    Input,
    Modal,
    PageHeader,
    SegmentedControl,
    Textarea,
    useContextMenu,
    type ContextMenuItem,
} from '@/components/design-system';
import { useNoteList } from '@/hooks/useNoteList';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { createNote, deleteNote, toggleNotePin, updateNote } from '@/services/notes';
import type { Note } from '@/types/notes';
import { DAILY_TAG } from '@/lib/dailyTodos';
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

/**
 * The colour palette a note can be tagged with.
 *
 * Stored as the **name**, not a hex value — `Note.color` already holds bare names
 * in existing rows (`'red'`), and a column carrying both idioms could never be
 * grouped or filtered reliably. It also keeps theming in the client, where the
 * light/dark pair for each hue lives.
 *
 * Six entries including "none" is a deliberate ceiling: this is a colour *label*,
 * not a spectrum, and a right-click menu stops being scannable past about ten
 * items.
 */
interface NoteColor {
    /** Value persisted to `Note.color`. `null` for the uncoloured default. */
    id: string | null;
    label: string;
    dot: string;
    chip: string;
}

const NOTE_COLORS: NoteColor[] = [
    {
        id: null,
        label: 'No colour',
        dot: 'bg-gray-300 dark:bg-gray-600',
        chip: 'bg-white/70 text-brand-dark dark:bg-white/10 dark:text-white',
    },
    {
        id: 'red',
        label: 'Red',
        dot: 'bg-red-500',
        chip: 'bg-red-500/15 text-red-700 dark:bg-red-500/25 dark:text-red-200',
    },
    {
        id: 'amber',
        label: 'Amber',
        dot: 'bg-amber-500',
        chip: 'bg-amber-500/15 text-amber-700 dark:bg-amber-500/25 dark:text-amber-200',
    },
    {
        id: 'emerald',
        label: 'Emerald',
        dot: 'bg-emerald-500',
        chip: 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-200',
    },
    {
        id: 'sky',
        label: 'Sky',
        dot: 'bg-sky-500',
        chip: 'bg-sky-500/15 text-sky-700 dark:bg-sky-500/25 dark:text-sky-200',
    },
    {
        id: 'violet',
        label: 'Violet',
        dot: 'bg-violet-500',
        chip: 'bg-violet-500/15 text-violet-700 dark:bg-violet-500/25 dark:text-violet-200',
    },
];

/** Unknown colours from older rows fall back to the default rather than vanishing. */
const colorOf = (note: Note): NoteColor =>
    NOTE_COLORS.find((c) => c.id === (note.color ?? null)) ?? NOTE_COLORS[0];

/** Case-insensitive match across the fields a person would expect to search. */
const matchesQuery = (note: Note, q: string): boolean => {
    if (!q) return true;
    const hay = [note.title, note.content, ...(note.tags ?? [])].join(' ').toLowerCase();
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
                                note.color ? colorOf(note).dot : (NOTE_ACCENT[note.type] ?? 'bg-gray-400')
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

                    {note.content && (
                        <p className="line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                            {note.content}
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
 */
const EditNoteDialog: FC<{
    note: Note | null;
    busy: boolean;
    onClose: () => void;
    onSave: (patch: { title: string; content: string; tags: string[] }) => void;
}> = ({ note, busy, onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tags, setTags] = useState('');

    // Reset from the note each time a different one is opened, so the dialog
    // never shows the previous note's text for a frame.
    useEffect(() => {
        setTitle(note?.title ?? '');
        setContent(note?.content ?? '');
        setTags((note?.tags ?? []).join(', '));
    }, [note]);

    const valid = title.trim() || content.trim();

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
                            onSave({ title: title.trim(), content: content.trim(), tags: parseTags(tags) })
                        }
                    >
                        {busy ? 'Saving…' : 'Save changes'}
                    </AccentButton>
                </>
            }
        >
            <div className="flex flex-col gap-4">
                <Field label="Title" id="edit-note-title">
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
                </Field>
                <Field
                    label="Content"
                    hint={
                        note?.contentRich
                            ? 'This note was written with formatting. Saving here keeps the text and drops the formatting.'
                            : 'Title or content — one of them is required.'
                    }
                    id="edit-note-content"
                >
                    <Textarea rows={6} value={content} onChange={(e) => setContent(e.target.value)} />
                </Field>
                <Field label="Categories" hint="Comma separated. These are the tags you can filter by." id="edit-note-tags">
                    <Input
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        placeholder="research, roadmap"
                        icon={<FiTag size={14} />}
                    />
                </Field>
            </div>
        </Modal>
    );
};

// ── Month grid ────────────────────────────────────────────────
const MonthGrid: FC<{
    month: Dayjs;
    notesByDay: Record<string, Note[]>;
    onPick: (dayKey: string) => void;
    selectedDay: string | null;
    /** Right-click on a note chip. */
    onNoteMenu: (event: React.MouseEvent, note: Note) => void;
    /** Right-click on the day cell itself, away from any chip. */
    onDayMenu: (event: React.MouseEvent, dayKey: string) => void;
}> = ({ month, notesByDay, onPick, selectedDay, onNoteMenu, onDayMenu }) => {
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

                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => onPick(key)}
                            onContextMenu={(e) => onDayMenu(e, key)}
                            aria-label={`${d.format('D MMMM YYYY')}, ${dayNotes.length} note${dayNotes.length === 1 ? '' : 's'}`}
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
                                        className={`truncate rounded px-1 py-0.5 text-[10px] ${colorOf(n).chip}`}
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
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
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
     * Two menus, because there are two kinds of target — a note and an empty day —
     * and they offer different actions. Each is a *single* shared instance for
     * every element of its kind, per `useContextMenu`'s own contract: one portal
     * and one set of document listeners, not one per cell.
     */
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
        if (!title.trim() && !content.trim()) return;
        run(
            () =>
                createNote({
                    title: title.trim(),
                    content: content.trim(),
                    // Creating from a picked calendar day schedules it there — that's
                    // the whole reason `scheduledFor` exists.
                    ...(selectedDay && mode === 'calendar' ? { scheduledFor: selectedDay } : {}),
                }),
            'Could not create that note.',
        ).then(() => { setTitle(''); setContent(''); setCreating(false); });
    };

    // Opening one menu closes the other. The chips live *inside* the day cells, so
    // without this a right-click could leave both surfaces open at once.
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
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-7">
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
                                <h2 className="text-base font-bold font-heading text-brand-dark dark:text-white">
                                    New note
                                    {selectedDay && mode === 'calendar' && (
                                        <span className="ml-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                                            for {dayjs(selectedDay).format('D MMM YYYY')}
                                        </span>
                                    )}
                                </h2>
                                <Field label="Title">
                                    <Input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="What's this about?"
                                        autoFocus
                                    />
                                </Field>
                                <Field label="Content" hint="Title or content — one of them is required.">
                                    <Textarea
                                        rows={4}
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        placeholder="Optional"
                                    />
                                </Field>
                                <div className="flex items-center gap-2">
                                    <AccentButton
                                        type="submit"
                                        size="sm"
                                        disabled={busy || (!title.trim() && !content.trim())}
                                    >
                                        {busy ? 'Saving…' : 'Create note'}
                                    </AccentButton>
                                    <AccentButton
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setCreating(false)}
                                        disabled={busy}
                                    >
                                        Cancel
                                    </AccentButton>
                                </div>
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
                                                        className={`h-2 w-2 shrink-0 rounded-full ${colorOf(n).dot}`}
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
                                                {n.content && (
                                                    <p className="line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                                                        {n.content}
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
              * had `EditNoteDialog`. This one wins because it also carries tags and
              * knows what to do when a note holds a rich document — an inline text
              * Modal would silently desync `content` from `contentRich`.
              */}
            <EditNoteDialog
                note={editing}
                busy={busy}
                onClose={() => setEditing(null)}
                onSave={(patch) => {
                    const target = editing;
                    if (!target) return;
                    // This dialog edits plain text. On a note that carries a rich
                    // document, saving here has to *drop* it — leaving it would make
                    // `content` and `contentRich` disagree, and the editor on
                    // `/daily` would keep showing text this dialog just replaced.
                    // The dialog warns before it comes to this.
                    const withRich = target.contentRich ? { ...patch, contentRich: null } : patch;
                    run(() => updateNote(target.id, withRich), 'Could not save that note.').then(() =>
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
        </div>
    );
};

export default NotesCalendar;
