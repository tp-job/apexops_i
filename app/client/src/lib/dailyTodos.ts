/**
 * Daily-note todo model — the pure half of `/daily`.
 *
 * Todos are not their own table. A *daily note* is an ordinary `Note`
 * (`type: 'list'`, tagged `daily`, scheduled for one day) and its todos live in
 * that note's `checklistItems` JSON. That is deliberate: the day already exists
 * as a first-class concept on `Note.scheduledFor`, so a second store would mean a
 * second migration, a second calendar source, and two answers to "what is on
 * Tuesday".
 *
 * The persisted item keeps the legacy `{ text, checked }` shape and only *adds*
 * fields, so every existing checklist reader keeps working on rows this page
 * writes, and legacy rows are gone: todos are rows in `tasks` (Phase 4).
 *
 * Everything in this file is pure. The network lives in `hooks/useDailyTodos`.
 */

import dayjs from 'dayjs';
import type { Note } from '@/types/notes';

/** Tag that marks a note as *the* todo note for its day. */
export const DAILY_TAG = 'daily';

export interface DailyTodo {
    id: string;
    text: string;
    /** Named `checked` to match the persisted legacy field exactly — no mapping layer. */
    checked: boolean;
    createdAt: string | null;
    completedAt: string | null;
}

export type TodoFilter = 'all' | 'open' | 'done';

export interface TodoProgress {
    total: number;
    done: number;
    remaining: number;
    /** 0–100, rounded. 0 when the list is empty (not 100 — nothing was achieved). */
    percent: number;
}

// ── ids ───────────────────────────────────────────────────────

export const newTodoId = (): string => {
    const uuid = globalThis.crypto?.randomUUID?.();
    return uuid ? `t-${uuid}` : `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

/**
 * `normalizeTodos` and `serializeTodos` lived here and are GONE (Phase 4).
 * They existed only to read and write `Note.checklistItems`, which no longer
 * exists as a column — todos are rows in `tasks`. The operations below still
 * apply: they work on `DailyTodo[]` in memory, whatever loaded it.
 */

// ── operations (all return new arrays) ────────────────────────

export const addTodo = (todos: DailyTodo[], text: string, now: Date = new Date()): DailyTodo[] => {
    const trimmed = text.trim();
    if (!trimmed) return todos;
    return [
        ...todos,
        { id: newTodoId(), text: trimmed, checked: false, createdAt: now.toISOString(), completedAt: null },
    ];
};

export const toggleTodo = (todos: DailyTodo[], id: string, now: Date = new Date()): DailyTodo[] =>
    todos.map((t) =>
        t.id === id
            ? { ...t, checked: !t.checked, completedAt: t.checked ? null : now.toISOString() }
            : t,
    );

/** An empty rename is a no-op, not a way to create a blank row. */
export const renameTodo = (todos: DailyTodo[], id: string, text: string): DailyTodo[] => {
    const trimmed = text.trim();
    if (!trimmed) return todos;
    return todos.map((t) => (t.id === id ? { ...t, text: trimmed } : t));
};

export const removeTodo = (todos: DailyTodo[], id: string): DailyTodo[] =>
    todos.filter((t) => t.id !== id);

export const clearCompleted = (todos: DailyTodo[]): DailyTodo[] => todos.filter((t) => !t.checked);

/**
 * Moves an item one slot within *its own lane*.
 *
 * The board shows two lanes cut from one array, so a naive neighbour swap would
 * make an item jump past everything in the other lane and appear not to move.
 * Swapping with the nearest neighbour of the same `checked` state is what the
 * user actually sees happen.
 */
export const moveTodo = (todos: DailyTodo[], id: string, direction: 'up' | 'down'): DailyTodo[] => {
    const from = todos.findIndex((t) => t.id === id);
    if (from === -1) return todos;

    const step = direction === 'up' ? -1 : 1;
    let to = from + step;
    while (to >= 0 && to < todos.length && todos[to].checked !== todos[from].checked) to += step;
    if (to < 0 || to >= todos.length) return todos;

    const next = todos.slice();
    [next[from], next[to]] = [next[to], next[from]];
    return next;
};

export const filterTodos = (todos: DailyTodo[], filter: TodoFilter): DailyTodo[] => {
    if (filter === 'open') return todos.filter((t) => !t.checked);
    if (filter === 'done') return todos.filter((t) => t.checked);
    return todos;
};

export const todoProgress = (todos: DailyTodo[]): TodoProgress => {
    const total = todos.length;
    const done = todos.filter((t) => t.checked).length;
    return { total, done, remaining: total - done, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
};

// ── day <-> note plumbing ─────────────────────────────────────

/** `YYYY-MM-DD` in the viewer's own zone. */
export const todayKey = (): string => dayjs().format('YYYY-MM-DD');

/**
 * The timestamp written to `scheduledFor` for a day.
 *
 * Local **noon**, not local or UTC midnight. `scheduledFor` round-trips through
 * UTC, and midnight is within one offset of the neighbouring day — west of
 * Greenwich a note saved for the 11th reads back as the 10th and the page can no
 * longer find the note it just wrote. Noon survives every real-world offset.
 */
export const dayAnchorIso = (dayKey: string): string =>
    dayjs(dayKey).startOf('day').add(12, 'hour').toISOString();

/** Inverse of `dayAnchorIso`, and the grouping key for any note. */
export const dayKeyOf = (iso: string | null | undefined): string | null => {
    if (!iso) return null;
    const d = dayjs(iso);
    return d.isValid() ? d.format('YYYY-MM-DD') : null;
};

/**
 * The title every daily note carries in Notes &amp; Calendar.
 *
 * Fixed to the spec's `Daily Note - [Date]`: capital N, and a plain hyphen
 * rather than an em dash. The old form (`Daily note — …`) is renamed in place by
 * `scripts/rename-daily-notes.ts`, because a generator change on its own leaves
 * two formats sitting next to each other in the same list forever.
 *
 * **`.locale('en')` is deliberate and load-bearing.** This title is an
 * identifier as much as a label — it is what a user searches for and what makes
 * a list of daily notes sort and read consistently. Nothing currently calls
 * `dayjs.locale()`, so the month abbreviation is English today by accident; the
 * day someone localises the interface, every *new* note would silently start
 * carrying a different title from every old one, in the same list, with no
 * migration to reconcile them. Pinning the locale here decouples the stored
 * title from display language. Localise the UI freely — translate this and you
 * split the archive.
 *
 * **Nothing looks a daily note up by this string.** `findDailyNote` matches on
 * `type`, the `daily` tag and `scheduledFor`, so the title is presentation only
 * and renaming one cannot orphan its todos. Keep it that way — the moment a
 * lookup keys on the title, changing the wording becomes a data migration.
 */
export const dailyNoteTitle = (dayKey: string): string =>
    `Daily Note - ${dayjs(dayKey).locale('en').format('D MMM YYYY')}`;

/**
 * Picks the day's todo note out of the full note list.
 *
 * Only `scheduledFor` counts — a note that merely happens to have been *written*
 * that day is not a plan for it. Ties (a duplicate created by two tabs) resolve
 * to the lowest id, so every client converges on the same note instead of
 * splitting the day's todos across two.
 */
export const findDailyNote = (notes: Note[], dayKey: string): Note | null => {
    const matches = notes.filter(
        (n) =>
            n.type === 'list' &&
            (n.tags ?? []).includes(DAILY_TAG) &&
            dayKeyOf(n.scheduledFor) === dayKey,
    );
    if (matches.length === 0) return null;
    // Ids are numeric on the wire but typed `string` here, so compare as numbers —
    // lexicographic order would rank note "10" before note "9".
    const rank = (n: Note) => {
        const id = Number(n.id);
        return Number.isFinite(id) ? id : Number.POSITIVE_INFINITY;
    };
    return matches.reduce((lowest, n) => (rank(n) < rank(lowest) ? n : lowest));
};
