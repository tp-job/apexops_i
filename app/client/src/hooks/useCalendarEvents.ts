import { useState, useCallback, useEffect, useReducer, useMemo } from 'react';
import type { Dayjs } from 'dayjs';
import { fetchCalendarNotes } from '@/utils/calendarApi';
import { eventsReducer, mapNotesToCalendarEvents, type EventsAction } from '@/utils/calendarEvents';
import type { CalendarEvent } from '@/types/calendar';

export interface UseCalendarEventsResult {
    /** Notes for the month, mapped to calendar events. */
    events: CalendarEvent[];
    /** `events` grouped by `date` and sorted by time-of-day — the shape a month grid wants. */
    eventsByDay: Record<string, CalendarEvent[]>;
    /** Local CRUD (ADD/UPDATE/DELETE) — the backend has no per-event endpoints, only notes. */
    dispatch: React.Dispatch<EventsAction>;
    totalNotes: number;
    loading: boolean;
    reload: () => void;
}

/**
 * Calendar data for a given month, backed by `GET /api/notes/calendar/:year/:month`
 * — the only calendar/events endpoint that exists (see
 * `.agents/docs/product/user-flow.md` Finding 2). Merged from what used to be two
 * hooks (`useCalendarEvents` + `useOptimizationCalendarEvents`) reading the same
 * data at two densities for two separate pages; now one hook for one page.
 */
export function useCalendarEvents(month: Dayjs): UseCalendarEventsResult {
    const [totalNotes, setTotalNotes] = useState(0);
    const [loading, setLoading] = useState(false);
    const [events, dispatch] = useReducer(eventsReducer, []);

    const year = month.year();
    const monthNum = month.month();

    const load = useCallback(async () => {
        setLoading(true);
        const data = await fetchCalendarNotes({ year, month: monthNum + 1 });
        dispatch({ type: 'SET', payload: data ? mapNotesToCalendarEvents(data.notesByDay) : [] });
        setTotalNotes(data?.totalNotes ?? 0);
        setLoading(false);
    }, [year, monthNum]);

    useEffect(() => {
        load();
    }, [load]);

    const eventsByDay = useMemo((): Record<string, CalendarEvent[]> => {
        const map: Record<string, CalendarEvent[]> = {};
        events.forEach((evt) => {
            (map[evt.date] ??= []).push(evt);
        });
        Object.values(map).forEach((list) => list.sort((a, b) => a.hour - b.hour || a.minute - b.minute));
        return map;
    }, [events]);

    return { events, eventsByDay, dispatch, totalNotes, loading, reload: load };
}
