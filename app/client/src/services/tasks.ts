import { fetchWithAuth } from '@/api/client';
import type { DailyTodo } from '@/lib/dailyTodos';

/**
 * The adapter between the UI's todo array and the `tasks` table
 * (blueprint phase 1, D1).
 *
 * **The UI contract does not change.** `/daily` has always worked on an
 * immutable `DailyTodo[]` — `toggleTodo(todos, id)` returns a new array — and the
 * pure functions in `lib/dailyTodos.ts` stay exactly as they are. This module
 * turns "here is the day as it should now be" into one request, and turns the
 * response back into the same array shape.
 *
 * That whole-array model is why the server offers a reconcile endpoint at all.
 * Per-item calls would mean a reorder firing one request per row, any of which
 * can fail alone and leave the day half-written; one array in one transaction
 * cannot.
 *
 * Everything goes through `fetchWithAuth`, so the 401 refresh-and-replay in
 * `lib/authSession.ts` is inherited rather than reimplemented.
 */

/** What the server sends back for one task. `id` is the client-side id. */
interface WireTask {
    id: string;
    taskId: number;
    text: string;
    checked: boolean;
    completedAt: string | null;
    createdAt: string | null;
    position: number;
}

export interface DayTasks {
    todos: DailyTodo[];
    /**
     * False when this day has never been written to the tasks table, which is the
     * caller's cue that `Note.checklistItems` is still the source for it.
     *
     * It is **not** the same as "the list is empty": a day whose todos were all
     * deleted also returns an empty list, and falling back there would resurrect
     * them on every load.
     */
    migrated: boolean;
}

const toTodo = (t: WireTask): DailyTodo => ({
    id: t.id,
    text: t.text,
    checked: t.checked,
    createdAt: t.createdAt,
    // Belt and braces: the server derives this from `checked`, but a stale value
    // reaching the UI would show a completion time on unfinished work.
    completedAt: t.checked ? t.completedAt : null,
});

const asRecord = (v: unknown): Record<string, unknown> =>
    typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {};

const readTasks = (body: unknown): WireTask[] => {
    const raw = asRecord(body).tasks;
    return Array.isArray(raw) ? (raw as WireTask[]) : [];
};

/** Everything planned for one day, in the order it should render. */
export async function fetchDayTasks(dayKey: string): Promise<DayTasks> {
    const res = await fetchWithAuth(`/api/tasks/day/${dayKey}`);
    if (!res.ok) throw new Error('Failed to load tasks for that day');

    const body = await res.json().catch(() => ({}));
    return { todos: readTasks(body).map(toTodo), migrated: asRecord(body).migrated === true };
}

/**
 * Write a day as a whole.
 *
 * `position` is not sent: the array order *is* the order, and the server
 * rewrites positions from the index. Sending both would be two sources of truth
 * for one fact, and they would eventually disagree.
 *
 * `completedAt` is not sent either — the server derives it, so a client cannot
 * report work as finished at a time of its choosing (blueprint EC-05).
 */
export async function syncDayTasks(
    dayKey: string,
    todos: DailyTodo[],
    noteId?: number | null,
): Promise<DailyTodo[]> {
    const res = await fetchWithAuth(`/api/tasks/day/${dayKey}`, {
        method: 'PUT',
        json: true,
        body: JSON.stringify({
            tasks: todos.map((t) => ({
                clientId: t.id,
                text: t.text,
                isDone: t.checked,
                createdAt: t.createdAt,
            })),
            ...(noteId !== undefined ? { noteId } : {}),
        }),
    });

    if (!res.ok) {
        const body = asRecord(await res.json().catch(() => ({})));
        throw new Error(typeof body.error === 'string' ? body.error : 'Could not save that change.');
    }

    return readTasks(await res.json().catch(() => ({}))).map(toTodo);
}

// ── master list (US-06) ───────────────────────────────────────

export type TaskStatus = 'all' | 'open' | 'done' | 'overdue';

export interface TaskQuery {
    status?: TaskStatus;
    from?: string;
    to?: string;
    q?: string;
    limit?: number;
    offset?: number;
}

/** A task as the master list needs it: the todo plus where it sits in time. */
export type MasterTask = DailyTodo & {
    taskId: number;
    scheduledFor: string | null;
    dueDate: string | null;
};

export interface TaskPage {
    todos: MasterTask[];
    total: number;
}

/** The cross-day view. Every filter here is served by an index, never in memory. */
export async function fetchTasks(query: TaskQuery = {}): Promise<TaskPage> {
    const params = new URLSearchParams();
    if (query.status && query.status !== 'all') params.set('status', query.status);
    if (query.from) params.set('from', query.from);
    if (query.to) params.set('to', query.to);
    if (query.q?.trim()) params.set('q', query.q.trim());
    if (query.limit) params.set('limit', String(query.limit));
    if (query.offset) params.set('offset', String(query.offset));

    const qs = params.toString();
    const res = await fetchWithAuth(`/api/tasks${qs ? `?${qs}` : ''}`);
    if (!res.ok) throw new Error('Failed to load tasks');

    const body = asRecord(await res.json().catch(() => ({})));
    const rows = Array.isArray(body.tasks) ? (body.tasks as Array<WireTask & Record<string, unknown>>) : [];

    return {
        todos: rows.map((t) => ({
            ...toTodo(t),
            taskId: t.taskId,
            scheduledFor: typeof t.scheduledFor === 'string' ? t.scheduledFor : null,
            dueDate: typeof t.dueDate === 'string' ? t.dueDate : null,
        })),
        total: typeof body.total === 'number' ? body.total : rows.length,
    };
}

/**
 * Change one task.
 *
 * Addressed by the numeric `taskId`, not the `clientId` the daily page works in:
 * the master list spans many days and a client id is only unique per user, so
 * the row id is the unambiguous handle here.
 *
 * `completedAt` is never sent — the server derives it from `isDone`, so ticking
 * a task cannot record a completion time the client invented (EC-05).
 */
export async function updateTask(
    taskId: number,
    patch: { text?: string; isDone?: boolean; scheduledFor?: string; dueDate?: string | null },
): Promise<void> {
    const res = await fetchWithAuth(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        json: true,
        body: JSON.stringify(patch),
    });
    if (!res.ok) {
        const body = asRecord(await res.json().catch(() => ({})));
        throw new Error(typeof body.error === 'string' ? body.error : 'Could not save that change.');
    }
}

/** Soft delete on the server — the row is recoverable for 30 days (D5). */
export async function deleteTask(taskId: number): Promise<void> {
    const res = await fetchWithAuth(`/api/tasks/${taskId}`, { method: 'DELETE' });
    // 204 on a task that was already gone: deleting twice is not an error.
    if (!res.ok && res.status !== 404) throw new Error('Could not delete that task.');
}
