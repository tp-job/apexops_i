/**
 * A server-side port of the client's `checklistItems` reader.
 *
 * **This must stay byte-for-byte equivalent to `normalizeTodos` and `legacyId` in
 * `app/client/src/lib/dailyTodos.ts`.** The migration into the `tasks` table
 * preserves each todo's existing id as `Task.clientId`, and the browser derives
 * that same id from the same text and position. If the two implementations ever
 * disagree, the client stops recognising its own rows: it treats them as new,
 * writes them again, and the day quietly doubles.
 *
 * It is duplicated rather than shared because the two workspaces have no common
 * package, and a shared one is a larger change than this migration warrants.
 * `legacyTodos.test.ts` pins the behaviour against the exact cases the client's
 * own tests use, so a drift fails a test rather than corrupting a day.
 *
 * Used only by `scripts/migrate-todos-to-tasks.ts`. Nothing at runtime reads
 * `checklistItems` on the server, and nothing new should.
 */

export interface LegacyTodo {
    id: string;
    text: string;
    checked: boolean;
    createdAt: string | null;
    completedAt: string | null;
}

const asString = (v: unknown): string => (typeof v === 'string' ? v : '');

const asIsoOrNull = (v: unknown): string | null =>
    typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : null;

const slug = (text: string): string =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);

/**
 * Ids for legacy `{ text, checked }` rows are *derived* from position and text,
 * not random — that is what makes them stable across a refetch, and what lets
 * this migration hand the client back the ids it already uses.
 */
export const legacyId = (text: string, index: number): string => `legacy-${index}-${slug(text)}`;

/**
 * Coerces whatever is in `checklistItems` into todos.
 *
 * The column is `Json` and was only ever validated as "an array, maybe", so
 * three shapes exist in real data: a bare string, `{ text, checked }`, and the
 * current `{ id, text, checked, createdAt, completedAt }`. Anything without
 * usable text is dropped rather than migrated as a blank row.
 */
export const normalizeTodos = (raw: unknown): LegacyTodo[] => {
    if (!Array.isArray(raw)) return [];

    return raw.flatMap((entry, index) => {
        if (typeof entry === 'string') {
            const text = entry.trim();
            return text
                ? [{ id: legacyId(text, index), text, checked: false, createdAt: null, completedAt: null }]
                : [];
        }
        if (!entry || typeof entry !== 'object') return [];

        const item = entry as Record<string, unknown>;
        const text = asString(item.text).trim();
        if (!text) return [];

        const checked = item.checked === true || item.done === true;
        const id = asString(item.id) || legacyId(text, index);

        return [{
            id,
            text,
            checked,
            createdAt: asIsoOrNull(item.createdAt),
            completedAt: checked ? asIsoOrNull(item.completedAt) : null,
        }];
    });
};
