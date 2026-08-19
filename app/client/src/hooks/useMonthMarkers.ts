import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dayjs } from 'dayjs';
import { fetchMonthMarkers, type MonthMarkers } from '@/services/day';

/**
 * Task and event counts for a month, for the grid's day markers (F007/F008).
 *
 * Separate from `useCalendarEvents` on purpose. That hook already exposes a
 * field called `eventsByDay`, and it means something else entirely — *notes*
 * mapped into calendar entries. Adding appointments to it would put two
 * different things behind one familiar name, which is how the wrong one gets
 * read six months from now.
 */
export function useMonthMarkers(month: Dayjs, enabled = true): MonthMarkers & { reload: () => Promise<void> } {
    const [markers, setMarkers] = useState<MonthMarkers>({ notesByDay: {}, tasksByDay: {}, eventsByDay: {} });
    const seq = useRef(0);

    const year = month.year();
    const monthNum = month.month() + 1;

    const reload = useCallback(async () => {
        if (!enabled) return;
        const mine = ++seq.current;
        const next = await fetchMonthMarkers(year, monthNum);
        // Paging back and forth across months is exactly the pattern that
        // produces out-of-order responses.
        if (mine === seq.current) setMarkers(next);
    }, [year, monthNum, enabled]);

    useEffect(() => { void reload(); }, [reload]);

    return { ...markers, reload };
}
