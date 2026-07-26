/**
 * Timezone helpers for the calendar.
 *
 * The calendar previously built month boundaries with `new Date(year, month - 1, 1)`,
 * which resolves in the *server's* local zone. Two users in different zones then saw
 * the same note land on different days, and moving the server moved everyone's
 * calendar. These helpers resolve day buckets in the viewing user's own zone instead.
 *
 * No dependency is added — `Intl` already ships the IANA database with Node.
 */

const DEFAULT_TIME_ZONE = 'UTC';

/**
 * `User.timezone` is stored in a display format like `"Asia/Bangkok (GMT+7)"`.
 * Pulls the IANA identifier off the front and verifies the runtime knows it,
 * falling back to UTC rather than throwing on unrecognised or legacy values.
 */
export function resolveTimeZone(raw: string | null | undefined): string {
    const candidate = (raw ?? '').split('(')[0].trim();
    if (!candidate) return DEFAULT_TIME_ZONE;
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: candidate });
        return candidate;
    } catch {
        return DEFAULT_TIME_ZONE;
    }
}

/** Offset in ms between the given instant's wall-clock reading in `timeZone` and UTC. */
function offsetMs(date: Date, timeZone: string): number {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    })
        .formatToParts(date)
        .reduce<Record<string, number>>((acc, p) => {
            if (p.type !== 'literal') acc[p.type] = Number(p.value);
            return acc;
        }, {});

    const asUtc = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        // `hour12: false` renders midnight as 24 in some locales/zones.
        parts.hour % 24,
        parts.minute,
        parts.second,
    );

    return asUtc - date.getTime();
}

/**
 * The UTC instant at which the given wall-clock time begins in `timeZone`.
 * Applied twice because the offset itself depends on the instant — one pass can
 * land on the wrong side of a DST transition.
 */
export function zonedTimeToUtc(
    year: number,
    month: number,
    day: number,
    timeZone: string,
): Date {
    const guess = Date.UTC(year, month - 1, day);
    const firstPass = new Date(guess - offsetMs(new Date(guess), timeZone));
    return new Date(guess - offsetMs(firstPass, timeZone));
}

/** Day-of-month (1-31) that `date` falls on, as read in `timeZone`. */
export function zonedDayOfMonth(date: Date, timeZone: string): number {
    return Number(new Intl.DateTimeFormat('en-US', { timeZone, day: 'numeric' }).format(date));
}

/** UTC instants bounding `[start of month, start of next month)` in `timeZone`. */
export function zonedMonthRange(
    year: number,
    month: number,
    timeZone: string,
): { start: Date; end: Date } {
    const start = zonedTimeToUtc(year, month, 1, timeZone);
    const end =
        month === 12
            ? zonedTimeToUtc(year + 1, 1, 1, timeZone)
            : zonedTimeToUtc(year, month + 1, 1, timeZone);
    return { start, end };
}
