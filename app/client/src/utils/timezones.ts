/**
 * The timezone list behind the Preferences select (spec D7).
 *
 * ## Why a curated list and not `Intl.supportedValuesOf('timeZone')`
 *
 * That call returns ~420 entries. A 420-item select is not a control, it is a
 * search problem — and this app has no combobox primitive. A short list people
 * can actually scan beats a complete one they cannot.
 *
 * ## Why the values carry a "(GMT+7)" suffix
 *
 * Because rows already hold `"Asia/Bangkok (GMT+7)"` — that is the format
 * `User.timezone` was seeded with, and the server's `resolveTimeZone` already
 * strips the suffix before handing the zone to `Intl`. Storing a bare IANA id
 * would be tidier and is a one-line change *there*, but it would need a migration
 * of every existing row to avoid two formats in one column. Matching what exists
 * is the smaller, safer half.
 *
 * The offsets in the labels are the standard-time offsets and do not shift with
 * DST. They are a recognition aid, not a calculation — the server derives real
 * offsets from the zone id through `Intl`, which handles DST correctly.
 */

export interface TimezoneOption {
    value: string;
    label: string;
}

export const TIMEZONES: TimezoneOption[] = [
    { value: 'Pacific/Auckland (GMT+12)', label: 'Auckland (GMT+12)' },
    { value: 'Australia/Sydney (GMT+10)', label: 'Sydney (GMT+10)' },
    { value: 'Asia/Tokyo (GMT+9)', label: 'Tokyo (GMT+9)' },
    { value: 'Asia/Seoul (GMT+9)', label: 'Seoul (GMT+9)' },
    { value: 'Asia/Shanghai (GMT+8)', label: 'Shanghai (GMT+8)' },
    { value: 'Asia/Singapore (GMT+8)', label: 'Singapore (GMT+8)' },
    { value: 'Asia/Bangkok (GMT+7)', label: 'Bangkok (GMT+7)' },
    { value: 'Asia/Jakarta (GMT+7)', label: 'Jakarta (GMT+7)' },
    { value: 'Asia/Kolkata (GMT+5:30)', label: 'Kolkata (GMT+5:30)' },
    { value: 'Asia/Dubai (GMT+4)', label: 'Dubai (GMT+4)' },
    { value: 'Europe/Moscow (GMT+3)', label: 'Moscow (GMT+3)' },
    { value: 'Europe/Berlin (GMT+1)', label: 'Berlin (GMT+1)' },
    { value: 'Europe/Paris (GMT+1)', label: 'Paris (GMT+1)' },
    { value: 'Europe/London (GMT+0)', label: 'London (GMT+0)' },
    { value: 'UTC', label: 'UTC' },
    { value: 'America/Sao_Paulo (GMT-3)', label: 'São Paulo (GMT-3)' },
    { value: 'America/New_York (GMT-5)', label: 'New York (GMT-5)' },
    { value: 'America/Chicago (GMT-6)', label: 'Chicago (GMT-6)' },
    { value: 'America/Denver (GMT-7)', label: 'Denver (GMT-7)' },
    { value: 'America/Los_Angeles (GMT-8)', label: 'Los Angeles (GMT-8)' },
    { value: 'Pacific/Honolulu (GMT-10)', label: 'Honolulu (GMT-10)' },
];

/**
 * The list to render for a given stored value.
 *
 * A row may already hold something not on the list — it was a free-text input
 * until this sprint, and seeded rows predate the list entirely. Dropping such a
 * value on the floor would silently rewrite the user's timezone the first time
 * they opened the page and saved anything else, so it is prepended instead and
 * kept selectable.
 */
export function timezoneOptions(current?: string | null): TimezoneOption[] {
    if (!current) return TIMEZONES;
    if (TIMEZONES.some((t) => t.value === current)) return TIMEZONES;
    return [{ value: current, label: `${current} (current)` }, ...TIMEZONES];
}

/** Best guess from the browser, used only to pre-select for someone with nothing stored. */
export function guessTimezone(): string | undefined {
    try {
        const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return TIMEZONES.find((t) => t.value.startsWith(`${zone} `) || t.value === zone)?.value;
    } catch {
        return undefined;
    }
}
