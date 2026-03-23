import { useReducer, useEffect, useMemo } from 'react';
import type { Dayjs } from 'dayjs';
import { useCalendarEvents } from './useCalendarEvents';
import { eventsReducer, mapNotesToCalendarEvents, type EventsAction } from '@/utils/optimizationCalendar';
import type { CalendarEvent } from '@/types/calendar';

export interface UseOptimizationCalendarEventsResult {
    events: CalendarEvent[];
    dispatch: React.Dispatch<EventsAction>;
    loading: boolean;
    reload: () => void;
    eventsByDay: Record<string, CalendarEvent[]>;
}

/**
 * Calendar events for OptimizationCalendar: syncs API notes to local events state
 * and exposes CRUD dispatch. Events are keyed by date for grid display.
 */
export function useOptimizationCalendarEvents(month: Dayjs): UseOptimizationCalendarEventsResult {
    const { notesByDay, loading, reload } = useCalendarEvents(month);
    const [events, dispatch] = useReducer(eventsReducer, []);

    useEffect(() => {
        const mapped = mapNotesToCalendarEvents(notesByDay);
        dispatch({ type: 'SET', payload: mapped });
    }, [notesByDay]);

    const eventsByDay = useMemo((): Record<string, CalendarEvent[]> => {
        const map: Record<string, CalendarEvent[]> = {};
        events.forEach((evt) => {
            if (!map[evt.date]) map[evt.date] = [];
            map[evt.date].push(evt);
        });
        Object.keys(map).forEach((d) => map[d].sort((a, b) => a.hour - b.hour || a.minute - b.minute));
        return map;
    }, [events]);

    return { events, dispatch, loading, reload, eventsByDay };
}
