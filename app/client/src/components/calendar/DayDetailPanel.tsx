import type { FC, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { motion } from 'motion/react';
import {
    FiArrowUpRight,
    FiCalendar,
    FiCheckSquare,
    FiClock,
    FiFileText,
    FiMapPin,
    FiPlus,
    FiX,
} from 'react-icons/fi';
import { AccentButton, Badge, Surface } from '@/components/design-system';
import type { CalendarEvent, DayDetail, DayTask } from '@/services/day';
import { fadeUp, stagger } from '@/lib/motion';

/**
 * Everything on one day: Agenda, Tasks, Daily Note (blueprint US-07).
 *
 * **All three sections are always rendered.** An empty section shows an explicit
 * "nothing here" line rather than disappearing, because a hidden section and an
 * empty one look identical to a user and mean completely different things —
 * "you have no meetings today" versus "this product does not do meetings". The
 * second reading is the one people reach when a heading is simply absent.
 *
 * The panel is fed by a single `/api/day/:date` call, so it paints once. Three
 * requests would give it three independent ways to be half-true.
 */

export interface DayDetailPanelProps {
    day: DayDetail | null;
    dayKey: string;
    loading: boolean;
    busy: boolean;
    onClose: () => void;
    onToggleTask: (task: DayTask) => void;
    onAddEvent: () => void;
    onEditEvent: (event: CalendarEvent) => void;
}

const Section: FC<{
    icon: ReactNode;
    title: string;
    count: number;
    emptyLabel: string;
    action?: ReactNode;
    children: ReactNode;
}> = ({ icon, title, count, emptyLabel, action, children }) => (
    <section className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
            <span className="text-gray-400 dark:text-gray-500" aria-hidden>{icon}</span>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {title}
            </h3>
            <Badge tone="neutral">{count}</Badge>
            {action && <span className="ml-auto">{action}</span>}
        </div>
        {count === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 px-3 py-3 text-center text-xs text-gray-400 dark:border-white/10 dark:text-gray-500">
                {emptyLabel}
            </p>
        ) : (
            children
        )}
    </section>
);

/** All-day events have no meaningful clock time, so they say so instead. */
const eventTime = (e: CalendarEvent): string => {
    if (e.isAllDay) return 'All day';
    const from = dayjs(e.startAt);
    const to = dayjs(e.endAt);
    return from.isSame(to, 'day')
        ? `${from.format('HH:mm')} – ${to.format('HH:mm')}`
        : `${from.format('D MMM HH:mm')} → ${to.format('D MMM HH:mm')}`;
};

const DayDetailPanel: FC<DayDetailPanelProps> = ({
    day, dayKey, loading, busy, onClose, onToggleTask, onAddEvent, onEditEvent,
}) => {
    const heading = dayjs(dayKey);
    const events = day?.events ?? [];
    const tasks = day?.tasks ?? [];
    const note = day?.note ?? null;

    return (
        <motion.aside
            variants={fadeUp}
            initial="hidden"
            animate="show"
            aria-label={`Detail for ${heading.format('D MMMM YYYY')}`}
        >
            <Surface variant="panel" radius="3xl" padding="lg">
                <div className="flex flex-col gap-5">
                    <div className="flex items-start gap-3">
                        <div className="flex min-w-0 flex-col">
                            <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                                {heading.format('dddd')}
                            </span>
                            <h2 className="truncate text-lg font-bold font-heading text-brand-dark dark:text-white">
                                {heading.format('D MMMM YYYY')}
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close day detail"
                            className="ml-auto shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-black/5 hover:text-brand-dark dark:hover:bg-white/10 dark:hover:text-white"
                        >
                            <FiX size={16} />
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex flex-col gap-3" aria-hidden>
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="h-16 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" />
                            ))}
                        </div>
                    ) : (
                        <>
                            <Section
                                icon={<FiClock size={13} />}
                                title="Agenda"
                                count={events.length}
                                emptyLabel="No appointments on this day."
                                action={
                                    <AccentButton
                                        variant="ghost"
                                        size="sm"
                                        icon={<FiPlus size={13} />}
                                        onClick={onAddEvent}
                                        disabled={busy}
                                    >
                                        Add
                                    </AccentButton>
                                }
                            >
                                <motion.ul
                                    variants={stagger(0.03)}
                                    initial="hidden"
                                    animate="show"
                                    className="flex flex-col gap-2"
                                >
                                    {events.map((e) => (
                                        <motion.li key={e.id} variants={fadeUp}>
                                            <button
                                                type="button"
                                                onClick={() => onEditEvent(e)}
                                                disabled={busy}
                                                className="flex w-full flex-col gap-0.5 rounded-2xl border border-gray-200 px-3 py-2 text-left transition-colors hover:bg-black/[0.03] disabled:opacity-50 dark:border-white/10 dark:hover:bg-white/[0.04]"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <span className="font-numbers text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                                                        {eventTime(e)}
                                                    </span>
                                                    {e.isAllDay && <Badge tone="neutral">all day</Badge>}
                                                </span>
                                                <span className="truncate text-sm font-medium text-brand-dark dark:text-white">
                                                    {e.title}
                                                </span>
                                                {e.location && (
                                                    <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
                                                        <FiMapPin size={10} aria-hidden />
                                                        {e.location}
                                                    </span>
                                                )}
                                            </button>
                                        </motion.li>
                                    ))}
                                </motion.ul>
                            </Section>

                            <Section
                                icon={<FiCheckSquare size={13} />}
                                title="Tasks"
                                count={tasks.length}
                                emptyLabel="Nothing planned for this day."
                            >
                                <ul className="flex flex-col gap-1.5">
                                    {tasks.map((t) => (
                                        <li
                                            key={t.taskId}
                                            className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={t.checked}
                                                disabled={busy}
                                                onChange={() => onToggleTask(t)}
                                                aria-label={
                                                    t.checked
                                                        ? `Mark "${t.text}" as not done`
                                                        : `Mark "${t.text}" as done`
                                                }
                                                className="h-3.5 w-3.5 shrink-0 accent-brand-dark dark:accent-brand-accent"
                                            />
                                            <span
                                                className={[
                                                    'min-w-0 flex-1 truncate text-sm',
                                                    t.checked
                                                        ? 'text-gray-400 line-through dark:text-gray-500'
                                                        : 'text-brand-dark dark:text-white',
                                                ].join(' ')}
                                            >
                                                {t.text}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </Section>

                            <Section
                                icon={<FiFileText size={13} />}
                                title="Daily note"
                                count={note ? 1 : 0}
                                emptyLabel="Nothing written for this day."
                            >
                                <div className="flex flex-col gap-2 rounded-2xl border border-gray-200 px-3 py-2.5 dark:border-white/10">
                                    <span className="truncate text-sm font-medium text-brand-dark dark:text-white">
                                        {note?.title}
                                    </span>
                                    {note?.preview?.trim() && (
                                        <p className="line-clamp-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                                            {note.preview}
                                        </p>
                                    )}
                                </div>
                            </Section>

                            {/* Always offered, note or not — a day with nothing
                                written is precisely when someone wants to open it. */}
                            <Link
                                to={`/daily?date=${dayKey}`}
                                className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-brand-dark outline-none transition-colors hover:bg-black/[0.03] focus-visible:ring-2 focus-visible:ring-brand-dark/30 dark:border-white/10 dark:text-white dark:hover:bg-white/[0.04] dark:focus-visible:ring-brand-accent/40"
                            >
                                <FiCalendar size={12} aria-hidden />
                                {note ? 'Open this day' : 'Write this day'}
                                <FiArrowUpRight size={12} aria-hidden />
                            </Link>
                        </>
                    )}
                </div>
            </Surface>
        </motion.aside>
    );
};

export default DayDetailPanel;
