/**
 * Route parameter parsing.
 *
 * `parseRouteId` existed as two identical private copies (`api/users.ts`,
 * `api/admin-docs.ts`) before this file. That duplication is worse than it
 * looks: a permissive id parser does not fail, it **returns someone else's
 * row**. `Number.parseInt('3abc', 10)` is `3`, so `/api/users/3abc` would read
 * user 3 — and a fix applied to one copy leaves the other one wrong.
 */

/**
 * A positive integer route id, or `null` if the segment is not exactly one.
 *
 * Deliberately strict about the whole string rather than its prefix, and about
 * `Number.isSafeInteger` rather than `Number.isInteger`: an id past 2^53 loses
 * precision on the way in, which makes it a different id than the one that was
 * requested.
 *
 * Callers translate `null` into **404, not 400**. A malformed id and a
 * nonexistent one are the same fact to the caller — that there is nothing there
 * — and distinguishing them tells an attacker which of their guesses parsed.
 */
export function parseRouteId(raw: unknown): number | null {
    if (typeof raw !== 'string' && typeof raw !== 'number') return null;

    const value = String(raw).trim();
    if (!/^\d+$/.test(value)) return null;

    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}
