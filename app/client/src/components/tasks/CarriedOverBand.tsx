import type { FC } from 'react';
import dayjs from 'dayjs';
import { motion } from 'motion/react';
import { FiArrowDownCircle, FiClock } from 'react-icons/fi';
import { Badge, Surface } from '@/components/design-system';
import type { MasterTask } from '@/services/tasks';
import { fadeUp, stagger } from '@/lib/motion';

/**
 * Unfinished work from earlier days, shown next to today — **never moved to it**
 * (blueprint EC-11).
 *
 * The obvious alternative is to roll yesterday's open tasks onto today
 * automatically, and it is wrong for a reason worth stating: it rewrites
 * history. A task planned for Monday and left undone is a fact about Monday. If
 * the system quietly restamps it as Tuesday's, then Monday's record now claims a
 * clean day that never happened, and "what did I actually get through last
 * week?" becomes unanswerable — the data has been edited to flatter the user by
 * a process the user never asked for.
 *
 * So carrying over is an **action, not a default**. The band makes the backlog
 * impossible to miss, which is the real problem auto-carry was trying to solve,
 * and moving one costs a single click that the user chose to make. The day it
 * came from keeps saying what it always said.
 *
 * Nothing here is a new query: `GET /api/tasks?status=open&to=<day>` already
 * returns exactly this set, served by the `(userId, scheduledFor)` index.
 */
export interface CarriedOverBandProps {
    tasks: MasterTask[];
    /** The day currently on screen — where "move here" sends a task. */
    dayKey: string;
    busy: boolean;
    onToggle: (task: MasterTask) => void;
    onMoveToDay: (task: MasterTask) => void;
}

const CarriedOverBand: FC<CarriedOverBandProps> = ({ tasks, dayKey, busy, onToggle, onMoveToDay }) => {
    if (tasks.length === 0) return null;

    const label = dayjs(dayKey).isSame(dayjs(), 'day') ? 'today' : dayjs(dayKey).format('D MMM');

    return (
        <motion.section
            variants={fadeUp}
            initial="hidden"
            animate="show"
            aria-label="Unfinished from earlier days"
        >
            <Surface variant="frost" radius="2xl" padding="sm" className="border border-amber-500/25">
                <div className="flex flex-col gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <FiClock size={13} className="text-amber-600 dark:text-amber-400" aria-hidden />
                        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                            Still open from earlier
                        </h3>
                        <Badge tone="neutral">{tasks.length}</Badge>
                    </div>

                    <motion.ul variants={stagger(0.03)} initial="hidden" animate="show" className="flex flex-col gap-1.5">
                        {tasks.map((t) => (
                            <motion.li
                                key={t.taskId}
                                variants={fadeUp}
                                className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                            >
                                <input
                                    type="checkbox"
                                    checked={t.checked}
                                    disabled={busy}
                                    onChange={() => onToggle(t)}
                                    aria-label={`Mark "${t.text}" as done`}
                                    className="h-3.5 w-3.5 shrink-0 accent-brand-dark dark:accent-brand-accent"
                                />

                                <span className="min-w-0 flex-1 truncate text-sm text-brand-dark dark:text-white">
                                    {t.text}
                                </span>

                                <span className="shrink-0 font-numbers text-[11px] text-gray-400 dark:text-gray-500">
                                    {t.scheduledFor ? dayjs(t.scheduledFor).format('D MMM') : '—'}
                                </span>

                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => onMoveToDay(t)}
                                    title={`Move "${t.text}" to ${label}`}
                                    aria-label={`Move "${t.text}" to ${label}`}
                                    className="flex shrink-0 items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-medium text-gray-500 transition-colors hover:bg-black/5 hover:text-brand-dark disabled:opacity-40 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
                                >
                                    <FiArrowDownCircle size={12} aria-hidden />
                                    Move
                                </button>
                            </motion.li>
                        ))}
                    </motion.ul>

                    <p className="text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
                        These stay on the day they were planned for. Move one here only if you mean to.
                    </p>
                </div>
            </Surface>
        </motion.section>
    );
};

export default CarriedOverBand;
