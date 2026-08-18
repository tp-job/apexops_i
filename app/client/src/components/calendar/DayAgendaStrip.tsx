import type { FC } from 'react';
import dayjs from 'dayjs';
import { FiClock, FiMapPin } from 'react-icons/fi';
import type { CalendarEvent } from '@/services/day';

/**
 * The day's appointments, in time order, under the mini calendar (US-08).
 *
 * Read-only on purpose. `/daily` is a writing surface for the note and its
 * tasks; appointments are created and edited from the calendar page, where the
 * day panel already owns that job. Putting a second editor here would mean two
 * places to keep in step for no new capability — and the sidebar's job is to
 * tell you what else is happening today, not to become a second calendar.
 */
export interface DayAgendaStripProps {
    events: CalendarEvent[];
    loading: boolean;
}

const DayAgendaStrip: FC<DayAgendaStripProps> = ({ events, loading }) => {
    if (loading) {
        return <div className="h-10 animate-pulse rounded-xl bg-black/5 dark:bg-white/5" aria-hidden />;
    }

    if (events.length === 0) {
        return (
            <p className="rounded-xl border border-dashed border-gray-200 px-3 py-2 text-center text-[11px] text-gray-400 dark:border-white/10 dark:text-gray-500">
                No appointments today.
            </p>
        );
    }

    return (
        <ul className="flex flex-col gap-1" aria-label="Appointments today">
            {events.map((e) => (
                <li
                    key={e.id}
                    className="flex items-baseline gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                >
                    <span className="shrink-0 font-numbers text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                        {e.isAllDay ? 'all day' : dayjs(e.startAt).format('HH:mm')}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-brand-dark dark:text-white">
                        {e.title}
                    </span>
                    {e.location && (
                        <span className="hidden shrink-0 items-center gap-0.5 text-[10px] text-gray-400 sm:flex dark:text-gray-500">
                            <FiMapPin size={9} aria-hidden />
                            {e.location}
                        </span>
                    )}
                </li>
            ))}
        </ul>
    );
};

export const AgendaHeading: FC<{ count: number }> = ({ count }) => (
    <div className="flex items-center gap-2">
        <FiClock size={12} className="text-gray-400 dark:text-gray-500" aria-hidden />
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Today&apos;s agenda
        </h3>
        {count > 0 && (
            <span className="font-numbers text-[11px] text-gray-400 dark:text-gray-500">{count}</span>
        )}
    </div>
);

export default DayAgendaStrip;
