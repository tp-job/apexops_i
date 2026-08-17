import { PrismaClient } from '@prisma/client';

/**
 * The Prisma client, pinned to a **UTC session timezone**.
 *
 * Without this, every `@updatedAt` in the schema is written seven hours in the
 * future on this machine — and the bug is invisible until something displays a
 * timestamp rather than sorting by one.
 *
 * The mechanism, measured rather than assumed. Every `DateTime` column in this
 * schema is `timestamp without time zone`, and Prisma serialises the value it
 * generates for `@updatedAt` with an explicit ` UTC` suffix. Postgres reads that
 * as a `timestamptz`, converts it into the **session** timezone before storing
 * it in a naive column, and hands it back with no zone at all — which Prisma
 * then labels `Z`. With the session on `Asia/Bangkok` a note saved at 13:02
 * local (06:02 UTC) comes back as `13:02Z`, exactly the +7h offset.
 *
 * Dates the application supplies itself — `scheduledFor`, `dueDate` — were
 * measured as **correct** on both insert and update, which is why the calendar
 * never put a note on the wrong day. Only the value Prisma generates is
 * affected. Setting the session to UTC makes the conversion a no-op and every
 * column round-trips exactly; verified at 0 minutes of skew across insert and
 * update for `createdAt`, `updatedAt`, `scheduledFor` and `dueDate`.
 *
 * It is applied **here rather than in `DATABASE_URL`** so it travels with the
 * code. As an environment setting it would have to be repeated correctly in
 * every developer's `.env`, in CI and in production, and the failure mode of
 * forgetting is silent data corruption rather than a startup error.
 */
function utcUrl(): string | undefined {
    const raw = process.env.DATABASE_URL;
    if (!raw) return undefined;
    // Respect an explicit `options=` the operator already set — appending a
    // second one would silently drop theirs.
    if (/[?&]options=/.test(raw)) return raw;
    const sep = raw.includes('?') ? '&' : '?';
    return `${raw}${sep}options=${encodeURIComponent('-c timezone=UTC')}`;
}

const url = utcUrl();

const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    ...(url ? { datasources: { db: { url } } } : {}),
});

export default prisma;
