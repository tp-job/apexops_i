import type { FC } from 'react';
import { useMemo } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import DayMarkers from './DayMarkers';
import { describeDay } from '@/lib/dayMarkers';

/**
 * A month at a glance, for the `/daily` sidebar (blueprint US-08).
 *
 * **Deliberately not the same component as the month grid on `/notes`.** That
 * one is a working surface: each cell shows note titles, takes a right-click
 * menu and is ~76px tall. This one exists to answer "where am I in the month and
 * what else is going on", in a 40%-width column beside a document editor.
 * Forcing one component to be both would mean a pile of props that switch off
 * half of it, and every future change to either would have to be checked against
 * the other.
 *
 * What the two **do** share is the marker vocabulary — `DayMarkers` and
 * `describeDay` — because a circle meaning "note" on one page and something else
 * on the other is exactly the inconsistency that makes people stop trusting the
 * marks.
 */
export interface MiniMonthProps {
    /** The month on display. */
    month: Dayjs;
    /** The day currently open on the page. */
    selected: string;
    taskCounts: Record<number, number>;
    eventCounts: Record<number, number>;
    noteCounts: Record<number, number>;
    onPick: (dayKey: string) => void;
    onMonthChange: (next: Dayjs) => void;
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const MiniMonth: FC<MiniMonthProps> = ({
    month, selected, taskCounts, eventCounts, noteCounts, onPick, onMonthChange,
}) => {
    const cells = useMemo(() => {
        const first = month.startOf('month');
        // `day()` is 0=Sunday; the grid starts Monday, so Sunday takes the 7th slot.
        const lead = (first.day() + 6) % 7;
        const total = Math.ceil((lead + month.daysInMonth()) / 7) * 7;
        return Array.from({ length: total }, (_, i) => first.add(i - lead, 'day'));
    }, [month]);

    const today = dayjs().format('YYYY-MM-DD');

    return (
        <section className="flex flex-col gap-2" aria-label={`Calendar for ${month.format('MMMM YYYY')}`}>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    aria-label="Previous month"
                    onClick={() => onMonthChange(month.subtract(1, 'month'))}
                    className="rounded-lg p-1 text-gray-500 transition-colors hover:bg-black/5 hover:text-brand-dark dark:hover:bg-white/10 dark:hover:text-white"
                >
                    <FiChevronLeft size={14} />
                </button>
                <h3 className="flex-1 text-center text-xs font-semibold text-brand-dark dark:text-white">
                    {month.format('MMMM YYYY')}
                </h3>
                <button
                    type="button"
                    aria-label="Next month"
                    onClick={() => onMonthChange(month.add(1, 'month'))}
                    className="rounded-lg p-1 text-gray-500 transition-colors hover:bg-black/5 hover:text-brand-dark dark:hover:bg-white/10 dark:hover:text-white"
                >
                    <FiChevronRight size={14} />
                </button>
            </div>

            <div className="grid grid-cols-7 gap-0.5">
                {WEEKDAYS.map((d, i) => (
                    <span
                        key={`${d}-${i}`}
                        aria-hidden
                        className="pb-1 text-center text-[10px] font-semibold uppercase text-gray-400 dark:text-gray-500"
                    >
                        {d}
                    </span>
                ))}

                {cells.map((d) => {
                    const key = d.format('YYYY-MM-DD');
                    const inMonth = d.month() === month.month();
                    // Counts key on day-of-month, so neighbouring months' cells
                    // must not read them or the numbers collide.
                    const nTasks = inMonth ? (taskCounts[d.date()] ?? 0) : 0;
                    const nEvents = inMonth ? (eventCounts[d.date()] ?? 0) : 0;
                    const nNotes = inMonth ? (noteCounts[d.date()] ?? 0) : 0;
                    const isSelected = key === selected;
                    const isToday = key === today;

                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => onPick(key)}
                            aria-label={`${d.format('D MMMM YYYY')}, ${describeDay(nNotes, nTasks, nEvents)}`}
                            aria-current={isToday ? 'date' : undefined}
                            aria-pressed={isSelected}
                            className={[
                                'flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] transition-colors',
                                !inMonth && 'opacity-30',
                                isSelected
                                    ? 'bg-brand-accent/25 font-bold text-brand-dark ring-1 ring-brand-accent dark:text-white'
                                    : isToday
                                      ? 'font-bold text-brand-dark hover:bg-black/[0.06] dark:text-brand-accent dark:hover:bg-white/10'
                                      : 'text-gray-600 hover:bg-black/[0.06] dark:text-gray-300 dark:hover:bg-white/10',
                            ]
                                .filter(Boolean)
                                .join(' ')}
                        >
                            <span className="font-numbers leading-none">{d.date()}</span>
                            <DayMarkers notes={nNotes} tasks={nTasks} events={nEvents} />
                        </button>
                    );
                })}
            </div>
        </section>
    );
};

export default MiniMonth;
