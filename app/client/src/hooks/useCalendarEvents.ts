import { useState, useCallback, useEffect } from 'react';
import type { Dayjs } from 'dayjs';
import { fetchCalendarNotes } from '../utils/calendarApi';
import type { CalendarNoteApi } from '../utils/calendarApi';

export interface UseCalendarEventsResult {
    notesByDay: Record<string, CalendarNoteApi[]>;
    totalNotes: number;
    loading: boolean;
    reload: () => void;
}

/**
 * Shared hook for loading calendar notes for a given month.
 * Uses the centralized calendar API; no request if no access token.
 */
export function useCalendarEvents(month: Dayjs): UseCalendarEventsResult {
    const [notesByDay, setNotesByDay] = useState<Record<string, CalendarNoteApi[]>>({});
    const [totalNotes, setTotalNotes] = useState(0);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const data = await fetchCalendarNotes({
            year: month.year(),
            month: month.month() + 1,
        });
        if (data) {
            setNotesByDay(data.notesByDay);
            setTotalNotes(data.totalNotes);
        } else {
            setNotesByDay({});
            setTotalNotes(0);
        }
        setLoading(false);
    }, [month.year(), month.month()]);

    useEffect(() => {
        load();
    }, [load]);

    return { notesByDay, totalNotes, loading, reload: load };
}
