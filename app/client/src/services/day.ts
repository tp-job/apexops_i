import { fetchWithAuth } from '@/api/client';

/**
 * Calendar events and the whole-day read (blueprint phase 3, US-07).
 *
 * A separate module from `services/calendar.ts` on purpose: that one fetches
 * *notes* for the month grid and predates any of this. Appointments and the
 * composed day view are a different concern with a different backing table, and
 * merging them would put two unrelated wire formats behind one name.
 *
 * Goes through `fetchWithAuth`, so the 401 refresh-and-replay in
 * `lib/authSession.ts` is inherited rather than reimplemented.
 */

export interface CalendarEvent {
    id: number;
    title: string;
    description: string | null;
    location: string | null;
    startAt: string;
    endAt: string;
    isAllDay: boolean;
    color: string | null;
}

export interface DayTask {
    id: string;
    taskId: number;
    text: string;
    checked: boolean;
    completedAt: string | null;
    scheduledFor: string | null;
    dueDate: string | null;
}

export interface DayNotePreview {
    id: number;
    title: string;
    preview: string;
    updatedAt: string;
}

export interface DayDetail {
    date: string;
    note: DayNotePreview | null;
    tasks: DayTask[];
    events: CalendarEvent[];
}

const asRecord = (v: unknown): Record<string, unknown> =>
    typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

const fail = async (res: Response, fallback: string): Promise<never> => {
    const body = asRecord(await res.json().catch(() => ({})));
    throw new Error(typeof body.error === 'string' ? body.error : fallback);
};

/**
 * One day, whole.
 *
 * Deliberately one request rather than three. Three would paint the panel in
 * three stages and give it three independent ways to be half-true.
 */
export async function fetchDay(dayKey: string): Promise<DayDetail> {
    const res = await fetchWithAuth(`/api/day/${dayKey}`);
    if (!res.ok) return fail(res, 'Could not load that day');

    const body = asRecord(await res.json().catch(() => ({})));
    return {
        date: typeof body.date === 'string' ? body.date : dayKey,
        note: (body.note as DayNotePreview | null) ?? null,
        tasks: arr<DayTask>(body.tasks),
        events: arr<CalendarEvent>(body.events),
    };
}

export interface EventInput {
    title: string;
    startAt: string;
    endAt: string;
    isAllDay?: boolean;
    description?: string | null;
    location?: string | null;
}

export async function createEvent(input: EventInput): Promise<CalendarEvent> {
    const res = await fetchWithAuth('/api/calendar-events', {
        method: 'POST',
        json: true,
        body: JSON.stringify(input),
    });
    if (!res.ok) return fail(res, 'Could not create that event');
    return asRecord(await res.json()).event as CalendarEvent;
}

export async function updateEvent(id: number, patch: Partial<EventInput>): Promise<void> {
    const res = await fetchWithAuth(`/api/calendar-events/${id}`, {
        method: 'PATCH',
        json: true,
        body: JSON.stringify(patch),
    });
    if (!res.ok) await fail(res, 'Could not save that event');
}

/** Soft delete on the server; a second call is not an error. */
export async function deleteEvent(id: number): Promise<void> {
    const res = await fetchWithAuth(`/api/calendar-events/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) throw new Error('Could not delete that event');
}

// ── month markers (F007 / F008) ───────────────────────────────

/** Per-day counts, keyed by day-of-month. */
export interface MonthMarkers {
    notesByDay: Record<number, number>;
    tasksByDay: Record<number, number>;
    eventsByDay: Record<number, number>;
}

/**
 * How many tasks and events each day of a month holds.
 *
 * Reads the same `/api/notes/calendar/:year/:month` endpoint the grid already
 * calls, which now returns `tasksByDay` and `eventsByDay` beside `notesByDay`.
 * Only the counts are kept: the grid draws one mark per *kind present*, so the
 * rows themselves are never needed here and holding them would keep a month of
 * task text in memory for three dots.
 *
 * Note counts come from here **for the `/daily` mini calendar only**. That page
 * holds one day's note, not a month of them, so this endpoint is its only
 * source. The `/notes` grid keeps using its own note list, which it already owns
 * — one surface, one authority, rather than both reading both.
 */
export async function fetchMonthMarkers(year: number, month: number): Promise<MonthMarkers> {
    const res = await fetchWithAuth(`/api/notes/calendar/${year}/${month}`);
    if (!res.ok) return { notesByDay: {}, tasksByDay: {}, eventsByDay: {} };

    const body = asRecord(await res.json().catch(() => ({})));
    const count = (raw: unknown): Record<number, number> => {
        const out: Record<number, number> = {};
        for (const [day, list] of Object.entries(asRecord(raw))) {
            if (Array.isArray(list) && list.length > 0) out[Number(day)] = list.length;
        }
        return out;
    };
    return { notesByDay: count(body.notesByDay), tasksByDay: count(body.tasksByDay), eventsByDay: count(body.eventsByDay) };
}
