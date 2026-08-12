import type { FC } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'motion/react';
import {
    FiAlertOctagon,
    FiArrowDown,
    FiArrowUp,
    FiCheckCircle,
    FiChevronLeft,
    FiChevronRight,
    FiList,
    FiPlus,
    FiRefreshCw,
    FiSun,
    FiTrash2,
} from 'react-icons/fi';
import {
    AccentButton,
    Badge,
    Checkbox,
    EmptyState,
    Input,
    Meter,
    PageHeader,
    SegmentedControl,
    Surface,
} from '@/components/design-system';
import { useDailyTodos } from '@/hooks/useDailyTodos';
import {
    addTodo,
    clearCompleted,
    filterTodos,
    moveTodo,
    removeTodo,
    renameTodo,
    todayKey,
    toggleTodo,
    type DailyTodo,
    type TodoFilter,
} from '@/lib/dailyTodos';
import { fadeUp, stagger } from '@/lib/motion';

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

const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'open', label: 'To do' },
    { value: 'done', label: 'Done' },
];

// ── One todo row ──────────────────────────────────────────────

const TodoRow: FC<{
    todo: DailyTodo;
    readOnly: boolean;
    onToggle: () => void;
    onRename: (text: string) => void;
    onMove: (direction: 'up' | 'down') => void;
    onRemove: () => void;
}> = ({ todo, readOnly, onToggle, onRename, onMove, onRemove }) => {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(todo.text);

    // A rename that lost its race with a refetch would otherwise keep showing the
    // stale text in the editor.
    useEffect(() => setDraft(todo.text), [todo.text]);

    const commit = () => {
        setEditing(false);
        if (draft.trim() && draft.trim() !== todo.text) onRename(draft);
        else setDraft(todo.text);
    };

    return (
        <motion.li variants={fadeUp} layout>
            <Surface variant="frost" radius="2xl" padding="sm">
                <div className="flex items-start gap-3">
                    <Checkbox
                        checked={todo.checked}
                        disabled={readOnly}
                        onChange={onToggle}
                        aria-label={todo.checked ? `Mark "${todo.text}" as not done` : `Mark "${todo.text}" as done`}
                        className="mt-0.5"
                    />

                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        {editing ? (
                            <Input
                                autoFocus
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                onBlur={commit}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') commit();
                                    if (e.key === 'Escape') { setDraft(todo.text); setEditing(false); }
                                }}
                                aria-label={`Rename "${todo.text}"`}
                            />
                        ) : (
                            <button
                                type="button"
                                disabled={readOnly}
                                onClick={() => setEditing(true)}
                                title="Click to rename"
                                className={[
                                    'text-left text-sm font-medium transition-colors disabled:cursor-default',
                                    todo.checked
                                        ? 'text-gray-400 line-through dark:text-gray-500'
                                        : 'text-brand-dark hover:text-gray-600 dark:text-white dark:hover:text-gray-300',
                                ].join(' ')}
                            >
                                {todo.text}
                            </button>
                        )}

                        {todo.checked && todo.completedAt && (
                            <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                done {dayjs(todo.completedAt).format('HH:mm')}
                            </span>
                        )}
                    </div>

                    <div className="flex shrink-0 items-center gap-0.5">
                        <button
                            type="button"
                            disabled={readOnly}
                            onClick={() => onMove('up')}
                            aria-label={`Move "${todo.text}" up`}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-black/5 hover:text-brand-dark disabled:opacity-40 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                            <FiArrowUp size={13} />
                        </button>
                        <button
                            type="button"
                            disabled={readOnly}
                            onClick={() => onMove('down')}
                            aria-label={`Move "${todo.text}" down`}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-black/5 hover:text-brand-dark disabled:opacity-40 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                            <FiArrowDown size={13} />
                        </button>
                        <button
                            type="button"
                            disabled={readOnly}
                            onClick={onRemove}
                            aria-label={`Delete "${todo.text}"`}
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-global-red/10 hover:text-global-red disabled:opacity-40"
                        >
                            <FiTrash2 size={13} />
                        </button>
                    </div>
                </div>
            </Surface>
        </motion.li>
    );
};

// ── One lane ──────────────────────────────────────────────────

const Lane: FC<{
    title: string;
    count: number;
    emptyTitle: string;
    emptyDescription: string;
    children: React.ReactNode;
}> = ({ title, count, emptyTitle, emptyDescription, children }) => (
    <Surface variant="panel" radius="3xl" padding="lg" className="h-full">
        <div className="flex h-full flex-col gap-4">
            <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold font-heading text-brand-dark dark:text-white">{title}</h2>
                <Badge tone="neutral">{count}</Badge>
            </div>
            {count === 0 ? (
                <EmptyState size="sm" icon={<FiList size={20} />} title={emptyTitle} description={emptyDescription} />
            ) : (
                <motion.ul variants={stagger(0.03)} initial="hidden" animate="show" className="flex flex-col gap-2.5">
                    {children}
                </motion.ul>
            )}
        </div>
    </Surface>
);

// ── Page ──────────────────────────────────────────────────────

const DailyNote: FC = () => {
    const [dayKey, setDayKey] = useState<string>(() => todayKey());
    const [filter, setFilter] = useState<TodoFilter>('all');
    const [draft, setDraft] = useState('');
    const [focus, setFocus] = useState('');

    const {
        note, todos, body, progress, loading, saving, error, notice, dismissNotice, refetch, commitTodos, saveBody,
    } = useDailyTodos(dayKey);

    // `body` is owned by the hook and replaced whenever the day changes; the local
    // copy is what the user is typing into right now.
    useEffect(() => setFocus(body), [body]);

    const addRef = useRef<HTMLInputElement>(null);
    const day = useMemo(() => dayjs(dayKey), [dayKey]);
    const isToday = dayKey === todayKey();
    const readOnly = !!error;
    const busy = readOnly || saving;

    const visible = useMemo(() => filterTodos(todos, filter), [todos, filter]);
    const open = visible.filter((t) => !t.checked);
    const done = visible.filter((t) => t.checked);

    const shiftDay = (delta: number) => setDayKey(day.add(delta, 'day').format('YYYY-MM-DD'));

    const submitTodo = (e: React.FormEvent) => {
        e.preventDefault();
        if (!draft.trim() || busy) return;
        commitTodos(addTodo(todos, draft));
        setDraft('');
        addRef.current?.focus();
    };

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-7">
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
            <Surface variant="panel" radius="3xl" padding="lg" reveal>
                <div className="flex flex-col gap-6">
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

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1.5">
                            <FiList size={13} /> {progress.total} todo{progress.total === 1 ? '' : 's'}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <FiCheckCircle size={13} /> {progress.done} done
                        </span>
                        <span className="flex items-center gap-1.5">
                            <FiList size={13} /> {progress.remaining} remaining
                        </span>
                        <span className="font-numbers ml-auto text-sm font-semibold text-brand-dark dark:text-white">
                            {progress.percent}%
                        </span>
                    </div>

                    {/* Knob off on purpose: it glows, and this view's one accent
                        belongs to the Add button. */}
                    <Meter value={progress.percent} knob={false} height={8} />

                    <Input
                        value={focus}
                        onChange={(e) => setFocus(e.target.value)}
                        onBlur={() => saveBody(focus)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                        disabled={busy}
                        placeholder="What is this day about? (saved when you click away)"
                        aria-label="Note for the day"
                    />
                </div>
            </Surface>

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

            {/* ── Add + filter ── */}
            <div className="flex flex-wrap items-center gap-3">
                <form className="flex min-w-[18rem] flex-1 items-center gap-2" onSubmit={submitTodo}>
                    <Input
                        ref={addRef}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        disabled={busy}
                        placeholder={`Add a todo for ${day.format('D MMM')}…`}
                        aria-label="New todo"
                    />
                    <AccentButton type="submit" size="sm" icon={<FiPlus size={14} />} disabled={busy || !draft.trim()}>
                        Add
                    </AccentButton>
                </form>

                <SegmentedControl
                    segments={FILTERS}
                    value={filter}
                    onChange={(v) => setFilter(v as TodoFilter)}
                />

                <AccentButton
                    variant="ghost"
                    size="sm"
                    onClick={() => commitTodos(clearCompleted(todos))}
                    disabled={busy || progress.done === 0}
                >
                    Clear done
                </AccentButton>
            </div>

            {/* ── Board ── */}
            {loading ? (
                <div className="grid gap-5 lg:grid-cols-2" aria-hidden>
                    {Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="h-64 animate-pulse rounded-3xl bg-black/5 dark:bg-white/5" />
                    ))}
                </div>
            ) : todos.length === 0 ? (
                <Surface variant="panel" radius="3xl" padding="lg">
                    <EmptyState
                        icon={<FiList size={22} />}
                        title={`Nothing planned for ${day.format('D MMM')}`}
                        description={
                            note
                                ? 'This day has a note but no todos left. Add the first one above.'
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
                </Surface>
            ) : (
                <div className="grid items-start gap-5 lg:grid-cols-2">
                    {filter !== 'done' && (
                        <Lane
                            title="To do"
                            count={open.length}
                            emptyTitle="All clear"
                            emptyDescription="Every todo on this day is done."
                        >
                            {open.map((t) => (
                                <TodoRow
                                    key={t.id}
                                    todo={t}
                                    readOnly={busy}
                                    onToggle={() => commitTodos(toggleTodo(todos, t.id))}
                                    onRename={(text) => commitTodos(renameTodo(todos, t.id, text))}
                                    onMove={(d) => commitTodos(moveTodo(todos, t.id, d))}
                                    onRemove={() => commitTodos(removeTodo(todos, t.id))}
                                />
                            ))}
                        </Lane>
                    )}

                    {filter !== 'open' && (
                        <Lane
                            title="Done"
                            count={done.length}
                            emptyTitle="Nothing finished yet"
                            emptyDescription="Tick a todo and it moves over here."
                        >
                            {done.map((t) => (
                                <TodoRow
                                    key={t.id}
                                    todo={t}
                                    readOnly={busy}
                                    onToggle={() => commitTodos(toggleTodo(todos, t.id))}
                                    onRename={(text) => commitTodos(renameTodo(todos, t.id, text))}
                                    onMove={(d) => commitTodos(moveTodo(todos, t.id, d))}
                                    onRemove={() => commitTodos(removeTodo(todos, t.id))}
                                />
                            ))}
                        </Lane>
                    )}
                </div>
            )}
        </div>
    );
};

export default DailyNote;
