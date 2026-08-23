/**
 * The client's todo shape, and the tag that marks a daily note.
 *
 * **What used to be here.** This file was the pure half of `/daily`: an
 * in-memory todo model plus sixteen helpers — add, toggle, rename, move, filter,
 * progress, day anchoring, daily-note lookup — operating on a `checklistItems`
 * JSON blob inside one `Note`.
 *
 * None of that survives, and the reason is worth keeping. Notes-SSOT phase 1
 * moved todos into their own `Task` table; phase 3.5 folded `/daily` into
 * `/notes` and `/tasks` and deleted its hook; phase 4 dropped the
 * `Note.checklistItems` column outright. By then every helper here had zero
 * callers — the array they mutated no longer existed, and the server reconciles a
 * whole day in one request instead (`services/tasks.ts`).
 *
 * Two things are still used, so two things remain. Deleting tested code is not
 * free, but a helper with no caller is not an asset either: it is code that must
 * be read, typechecked and kept honest with no way to notice when it stops being
 * correct. Git history has the rest if a task editor ever needs it again.
 */

/** Tag that marks a note as *the* todo note for its day. */
export const DAILY_TAG = 'daily';

/**
 * One todo, as the UI holds it.
 *
 * `checked` rather than `isDone` because it matched the persisted legacy field
 * exactly and needed no mapping layer. That column is gone, but the name stayed:
 * `services/tasks.ts` maps the wire's `isDone` onto it in one place, and renaming
 * it now would touch every task surface to gain nothing.
 */
export interface DailyTodo {
    id: string;
    text: string;
    checked: boolean;
    createdAt: string | null;
    completedAt: string | null;
}
