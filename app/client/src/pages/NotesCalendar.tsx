import type { FC } from 'react';
import { useCallback, useMemo, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { motion, AnimatePresence } from 'motion/react';
import {
    FiAlertOctagon,
    FiCalendar,
    FiChevronLeft,
    FiChevronRight,
    FiClock,
    FiFileText,
    FiGrid,
    FiPlus,
    FiRefreshCw,
    FiStar,
    FiTrash2,
} from 'react-icons/fi';
import {
    Surface,
    AccentButton,
    Badge,
    EmptyState,
    SegmentedControl,
    Input,
    Field,
    PageHeader,
} from '@/components/design-system';
import { useNoteList } from '@/hooks/useNoteList';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { createNote, deleteNote, toggleNotePin, updateNote } from '@/components/ui/note/utils/noteApi';
import type { Note } from '@/components/ui/note/utils/noteTypes';
import { fadeUp, stagger } from '@/lib/motion';

/**
 * Notes + Calendar — one page, two modes.
 *
 * Merged deliberately rather than shipped as two routes: both read the same
 * Notes-backed data (see `.agents/docs/frontend/user-flow.md` Finding 2), and the
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

/** `YYYY-MM-DD` for the day a note belongs on: its schedule, else when it was written. */
const noteDayKey = (note: Note): string | null => {
    const raw = note.scheduledFor ?? note.createdAt;
    if (!raw) return null;
    const d = dayjs(raw);
    return d.isValid() ? d.format('YYYY-MM-DD') : null;
};

// ── Note card ─────────────────────────────────────────────────
const NoteCard: FC<{
    note: Note;
    readOnly: boolean;
    onPin: () => void;
    onDelete: () => void;
    onSchedule: (iso: string | null) => void;
}> = ({ note, readOnly, onPin, onDelete, onSchedule }) => {
    const scheduled = note.scheduledFor ? dayjs(note.scheduledFor) : null;

    return (
        <motion.li variants={fadeUp} layout>
            <Surface variant="frost" radius="2xl" padding="md" className="h-full">
                <div className="flex h-full flex-col gap-3">
                    <div className="flex items-start gap-2">
                        <span
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${NOTE_ACCENT[note.type] ?? 'bg-gray-400'}`}
                            aria-hidden
                        />
                        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-brand-dark dark:text-white">
                            {note.title || 'Untitled'}
                        </h3>
                        <button
                            type="button"
                            onClick={onPin}
                            disabled={readOnly}
                            aria-label={note.isPinned ? 'Unpin note' : 'Pin note'}
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
                        <p className="line-clamp-3 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                            {note.content}
                        </p>
                    )}

                    <div className="mt-auto flex flex-wrap items-center gap-2">
                        {scheduled ? (
                            <Badge tone="accent">{scheduled.format('D MMM')}</Badge>
                        ) : (
                            <Badge tone="outline">unscheduled</Badge>
                        )}
                        {note.tags?.slice(0, 2).map((t) => (
                            <Badge key={t} tone="neutral">{t}</Badge>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            aria-label={`Schedule ${note.title || 'note'}`}
                            disabled={readOnly}
                            value={scheduled ? scheduled.format('YYYY-MM-DD') : ''}
                            onChange={(e) => onSchedule(e.target.value ? e.target.value : null)}
                            className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white/60 px-2 py-1 text-xs text-brand-dark outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/50 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-white"
                        />
                        <button
                            type="button"
                            onClick={onDelete}
                            disabled={readOnly}
                            aria-label={`Delete ${note.title || 'note'}`}
                            className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:opacity-40"
                        >
                            <FiTrash2 size={14} />
                        </button>
                    </div>
                </div>
            </Surface>
        </motion.li>
    );
};

// ── Month grid ────────────────────────────────────────────────
const MonthGrid: FC<{
    month: Dayjs;
    notesByDay: Record<string, Note[]>;
    onPick: (dayKey: string) => void;
    selectedDay: string | null;
}> = ({ month, notesByDay, onPick, selectedDay }) => {
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
                                    <span
                                        key={n.id}
                                        className="truncate rounded bg-white/70 px-1 py-0.5 text-[10px] text-brand-dark dark:bg-white/10 dark:text-white"
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

    const sortedNotes = useMemo(
        () =>
            notesList
                .slice()
                .sort(
                    (a, b) =>
                        Number(b.isPinned) - Number(a.isPinned) ||
                        dayjs(b.updatedAt ?? 0).valueOf() - dayjs(a.updatedAt ?? 0).valueOf(),
                ),
        [notesList],
    );

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
                                    <Input
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
                                    onDelete={() => run(() => deleteNote(note.id), 'Could not delete that note.')}
                                    onSchedule={(iso) =>
                                        run(
                                            () => updateNote(note.id, { scheduledFor: iso }),
                                            'Could not reschedule that note.',
                                        )
                                    }
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
                                />

                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                    {totalNotes} note{totalNotes === 1 ? '' : 's'} this month. Unscheduled notes
                                    appear on the day they were written.
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
                                                className="flex flex-col gap-1 rounded-2xl bg-black/[0.03] px-4 py-3 dark:bg-white/5"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="truncate text-sm font-semibold text-brand-dark dark:text-white">
                                                        {n.title || 'Untitled'}
                                                    </span>
                                                    {!n.scheduledFor && (
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
        </div>
    );
};

export default NotesCalendar;
