import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { motion } from 'motion/react';
import { FiAlertOctagon, FiArrowRight, FiCalendar, FiList, FiRefreshCw, FiSearch } from 'react-icons/fi';
import {
    AccentButton,
    Badge,
    EmptyState,
    Input,
    PageHeader,
    SegmentedControl,
    Surface,
} from '@/components/design-system';
import TaskRow from '@/components/tasks/TaskRow';
import TaskGroup from '@/components/tasks/TaskGroup';
import { deleteTask, fetchTasks, updateTask, type MasterTask, type TaskStatus } from '@/services/tasks';
import { fadeUp } from '@/lib/motion';

/**
 * The master list — every task, across every day (blueprint US-06).
 *
 * This is the view the `tasks` table was created for. While todos lived inside
 * each daily note's JSON, "what is still open?" could only be answered by
 * loading every note and filtering in memory, which is why the question was
 * never asked. Each filter here maps onto an index the server already has.
 *
 * **Grouped by day, not flat.** A flat list sorted by date reads as one long
 * column in which nothing stands out; the day heading is the unit people
 * actually think in, and it gives the overdue group somewhere to sit above
 * everything else rather than being scattered through it.
 */

const STATUS_FILTERS: Array<{ value: TaskStatus; label: string }> = [
    { value: 'open', label: 'To do' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'done', label: 'Done' },
    { value: 'all', label: 'All' },
];

/** Debounce for the search box — one request per pause, not per keystroke. */
const SEARCH_IDLE_MS = 350;

const dayLabel = (iso: string | null): string => {
    if (!iso) return 'Unscheduled';
    const d = dayjs(iso);
    const today = dayjs().startOf('day');
    const diff = d.startOf('day').diff(today, 'day');
    if (diff === 0) return `Today · ${d.format('D MMM')}`;
    if (diff === -1) return `Yesterday · ${d.format('D MMM')}`;
    if (diff === 1) return `Tomorrow · ${d.format('D MMM')}`;
    return d.format('ddd D MMM YYYY');
};

const Tasks: FC = () => {
    const [status, setStatus] = useState<TaskStatus>('open');
    const [query, setQuery] = useState('');
    const [debounced, setDebounced] = useState('');
    const [tasks, setTasks] = useState<MasterTask[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    /** Ignores a slow response for a filter the user has already moved on from. */
    const requestSeq = useRef(0);

    useEffect(() => {
        const t = setTimeout(() => setDebounced(query), SEARCH_IDLE_MS);
        return () => clearTimeout(t);
    }, [query]);

    const load = useCallback(async () => {
        const seq = ++requestSeq.current;
        setLoading(true);
        setError(null);
        try {
            const page = await fetchTasks({ status, q: debounced, limit: 200 });
            if (seq !== requestSeq.current) return;
            setTasks(page.todos);
            setTotal(page.total);
        } catch {
            if (seq !== requestSeq.current) return;
            setError('Could not load your tasks.');
        } finally {
            if (seq === requestSeq.current) setLoading(false);
        }
    }, [status, debounced]);

    useEffect(() => { void load(); }, [load]);

    /**
     * Writes go straight to the row and the list is reloaded afterwards.
     *
     * Ticking a task under the "To do" filter removes it from the current view,
     * so an optimistic in-place edit would leave a row that no longer belongs.
     * Reloading is the honest answer here, and it is one indexed query.
     */
    const mutate = useCallback(
        async (fn: () => Promise<unknown>) => {
            setBusy(true);
            try {
                await fn();
                await load();
            } catch {
                setError('Could not save that change.');
            } finally {
                setBusy(false);
            }
        },
        [load],
    );

    const grouped = useMemo(() => {
        const byDay = new Map<string, MasterTask[]>();
        for (const t of tasks) {
            const key = t.scheduledFor ? dayjs(t.scheduledFor).format('YYYY-MM-DD') : 'unscheduled';
            const bucket = byDay.get(key);
            if (bucket) bucket.push(t);
            else byDay.set(key, [t]);
        }
        // Newest day first: recent work is what people come here to act on.
        return [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
    }, [tasks]);

    const overdueCount = useMemo(
        () => tasks.filter((t) => !t.checked && t.dueDate && dayjs(t.dueDate).isBefore(dayjs())).length,
        [tasks],
    );

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
            <PageHeader
                title="Tasks"
                subtitle="Everything you have planned, across every day."
                actions={
                    <AccentButton
                        variant="ghost"
                        size="sm"
                        icon={<FiRefreshCw size={14} />}
                        onClick={() => void load()}
                        disabled={loading}
                    >
                        {loading ? 'Refreshing…' : 'Refresh'}
                    </AccentButton>
                }
            />

            <Surface variant="panel" radius="3xl" padding="md">
                <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <SegmentedControl
                            segments={STATUS_FILTERS}
                            value={status}
                            size="sm"
                            onChange={(v) => setStatus(v as TaskStatus)}
                        />

                        <div className="relative min-w-[14rem] flex-1">
                            <FiSearch
                                size={14}
                                aria-hidden
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <Input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search tasks…"
                                aria-label="Search tasks"
                                className="pl-9"
                            />
                        </div>
                    </div>

                    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1.5">
                            <FiList size={13} aria-hidden />
                            <span className="font-numbers font-semibold text-brand-dark dark:text-white">{total}</span>
                            {total === 1 ? 'task' : 'tasks'}
                        </span>
                        {overdueCount > 0 && (
                            <span className="flex items-center gap-1.5 font-medium text-global-red">
                                <FiAlertOctagon size={13} aria-hidden />
                                {overdueCount} past due
                            </span>
                        )}
                    </p>
                </div>
            </Surface>

            {error && (
                <Surface variant="panel" radius="2xl" padding="sm">
                    <p className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                        <FiAlertOctagon className="shrink-0 text-amber-500" size={16} />
                        {error}
                    </p>
                </Surface>
            )}

            {loading ? (
                <div className="flex flex-col gap-3" aria-hidden>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-16 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" />
                    ))}
                </div>
            ) : tasks.length === 0 ? (
                <Surface variant="panel" radius="3xl" padding="lg">
                    <EmptyState
                        icon={<FiList size={22} />}
                        title={debounced ? 'Nothing matches that search' : 'Nothing here'}
                        description={
                            debounced
                                ? 'Try a different word, or clear the search.'
                                : status === 'overdue'
                                  ? 'No task has passed its due date. '
                                  : 'Tasks you add on a daily note show up here.'
                        }
                        action={
                            <AccentButton size="sm" icon={<FiArrowRight size={14} />}>
                                <Link to="/daily">Go to today</Link>
                            </AccentButton>
                        }
                    />
                </Surface>
            ) : (
                <motion.div variants={fadeUp} initial="hidden" animate="show" className="flex flex-col gap-6">
                    {grouped.map(([dayIso, rows]) => (
                        <Surface key={dayIso} variant="panel" radius="3xl" padding="lg">
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <h2 className="text-base font-bold font-heading text-brand-dark dark:text-white">
                                        {dayLabel(rows[0].scheduledFor)}
                                    </h2>
                                    <Badge tone="neutral">{rows.length}</Badge>
                                    {dayIso !== 'unscheduled' && (
                                        <Link
                                            to={`/daily?date=${dayIso}`}
                                            className="ml-auto flex items-center gap-1 rounded text-xs font-medium text-gray-500 underline underline-offset-2 outline-none hover:no-underline focus-visible:ring-2 focus-visible:ring-brand-dark/30 dark:text-gray-400 dark:focus-visible:ring-brand-accent/40"
                                        >
                                            <FiCalendar size={12} aria-hidden />
                                            Open that day
                                        </Link>
                                    )}
                                </div>

                                <TaskGroup title="Tasks" count={rows.length} emptyLabel="Nothing here.">
                                    {rows.map((t) => {
                                        const overdue =
                                            !t.checked && t.dueDate && dayjs(t.dueDate).isBefore(dayjs());
                                        return (
                                            <TaskRow
                                                key={t.taskId}
                                                todo={t}
                                                readOnly={busy}
                                                onToggle={() =>
                                                    void mutate(() => updateTask(t.taskId, { isDone: !t.checked }))
                                                }
                                                onRename={(text) => void mutate(() => updateTask(t.taskId, { text }))}
                                                onRemove={() => void mutate(() => deleteTask(t.taskId))}
                                                meta={
                                                    t.dueDate ? (
                                                        <span
                                                            className={[
                                                                'text-[11px] font-medium',
                                                                overdue
                                                                    ? 'text-global-red'
                                                                    : 'text-gray-400 dark:text-gray-500',
                                                            ].join(' ')}
                                                        >
                                                            {overdue ? 'Past due ' : 'Due '}
                                                            {dayjs(t.dueDate).format('D MMM')}
                                                        </span>
                                                    ) : null
                                                }
                                            />
                                        );
                                    })}
                                </TaskGroup>
                            </div>
                        </Surface>
                    ))}
                </motion.div>
            )}
        </div>
    );
};

export default Tasks;
