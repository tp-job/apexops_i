import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import type { CalendarEvent, CategoryId } from '@/types/calendar';
import type { CalendarNoteApi } from '@/utils/calendarApi';

/**
 * Note→event mapping and local CRUD reducer for the calendar feature.
 *
 * Formerly `optimizationCalendar.ts`, split out under a page-specific name back
 * when Calendar and OptimizationCalendar were two pages reading the same
 * `GET /api/notes/calendar/:year/:month` endpoint at different densities. They
 * were merged into one Calendar screen (see `.agents/docs/frontend/user-flow.md`
 * Finding 2) — this module lost the page-specific name along with the page.
 */

export type EventsAction =
    | { type: 'SET'; payload: CalendarEvent[] }
    | { type: 'ADD'; payload: CalendarEvent }
    | { type: 'UPDATE'; payload: CalendarEvent }
    | { type: 'DELETE'; payload: string };

export function eventsReducer(state: CalendarEvent[], action: EventsAction): CalendarEvent[] {
    switch (action.type) {
        case 'SET':
            return action.payload;
        case 'ADD':
            return [...state, action.payload];
        case 'UPDATE':
            return state.map((e) => (e.id === action.payload.id ? action.payload : e));
        case 'DELETE':
            return state.filter((e) => e.id !== action.payload);
        default:
            return state;
    }
}

export function generateId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function noteTypeToCategory(type: string): CategoryId {
    const map: Record<string, CategoryId> = {
        text: 'development',
        list: 'server',
        image: 'client',
        link: 'marketing',
    };
    return map[type] ?? 'development';
}

export function mapNotesToCalendarEvents(notesByDay: Record<string, CalendarNoteApi[]>): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    Object.entries(notesByDay).forEach(([, notes]) => {
        notes.forEach((note) => {
            // A note sits on its scheduled day when it has one; unscheduled notes
            // still fall back to when they were written, so nothing disappears from
            // the calendar just because it predates scheduling.
            const d = dayjs(note.scheduledFor ?? note.createdAt);
            const h = d.hour();
            const hour12 = h % 12 || 12;
            const amPm: 'AM' | 'PM' = h < 12 ? 'AM' : 'PM';
            events.push({
                id: `evt_${note.id}`,
                title: note.title || 'Untitled',
                description: '',
                category: noteTypeToCategory(note.type),
                date: d.format('YYYY-MM-DD'),
                hour: hour12,
                minute: d.minute(),
                amPm,
                durationMinutes: 60,
                pushNotification: false,
            });
        });
    });
    return events;
}

export function defaultFormState(d?: Dayjs): Omit<CalendarEvent, 'id'> {
    return {
        title: '',
        description: '',
        category: 'development',
        date: (d || dayjs()).format('YYYY-MM-DD'),
        hour: 9,
        minute: 30,
        amPm: 'AM',
        durationMinutes: 90,
        pushNotification: false,
    };
}
