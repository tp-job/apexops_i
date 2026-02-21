/**
 * Centralized API for calendar/notes data.
 * Reads base URL and token in a null-safe way; no requests if token is missing.
 */

import { isMockEnabled, isNetworkFailure } from '@/utils/offlineMock';
import { buildMockCalendarNotes } from '@/utils/mockData';

const getBaseUrl = (): string => {
    return (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';
};

const getAccessToken = (): string | null => {
    try {
        return localStorage.getItem('accessToken');
    } catch {
        return null;
    }
};

export interface CalendarNoteApi {
    id: number;
    title: string;
    type: string;
    color?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CalendarNotesResponse {
    year: number;
    month: number;
    notesByDay: Record<string, CalendarNoteApi[]>;
    totalNotes: number;
}

export interface FetchCalendarNotesParams {
    year: number;
    month: number;
}

/**
 * Fetches calendar notes for a given year and month.
 * Returns null if no token is available or the request fails.
 * Logs errors consistently.
 */
export async function fetchCalendarNotes(params: FetchCalendarNotesParams): Promise<CalendarNotesResponse | null> {
    const token = getAccessToken();
    if (!token) {
        return null;
    }
    const baseUrl = getBaseUrl();
    const { year, month } = params;
    try {
        const res = await fetch(`${baseUrl}/api/notes/calendar/${year}/${month}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
            console.error('Failed to load calendar data', res.status, await res.text());
            return null;
        }
        const data = (await res.json()) as CalendarNotesResponse;
        return {
            year: data.year ?? year,
            month: data.month ?? month,
            notesByDay: data.notesByDay ?? {},
            totalNotes: data.totalNotes ?? 0,
        };
    } catch (err) {
        console.error('Failed to load calendar data', err);
        if (isMockEnabled() && isNetworkFailure(err)) {
            const mock = buildMockCalendarNotes(year, month);
            const notesByDay: Record<string, CalendarNoteApi[]> = {};
            Object.entries(mock.notesByDay).forEach(([day, notes]) => {
                notesByDay[String(day)] = notes.map((n, idx) => ({
                    id: Number.parseInt(String(n.id), 10) || idx + 1,
                    title: n.title,
                    type: n.type,
                    color: n.color,
                    createdAt: n.createdAt,
                    updatedAt: n.updatedAt,
                }));
            });
            return { year: mock.year, month: mock.month, notesByDay, totalNotes: mock.totalNotes };
        }
        return null;
    }
}
