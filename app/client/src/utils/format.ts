import dayjs from 'dayjs';
import relativeTimePlugin from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTimePlugin);

/**
 * Shared formatters (sprint plan §6).
 *
 * These exist because the same value is rendered on the issue list, the issue
 * detail, the project card and the dashboard. Four local `toLocaleString` calls
 * become four different date formats, and nobody notices until a screenshot puts
 * two of them side by side.
 *
 * `dayjs` was already a dependency and unused before this file.
 */

/** "2 minutes ago". Empty string for null so callers can render a dash instead. */
export function relativeTime(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = dayjs(iso);
    return d.isValid() ? d.fromNow() : '';
}

/** "28 Jul 2026, 14:03" — the unambiguous form, for tooltips and detail rows. */
export function formatDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = dayjs(iso);
    return d.isValid() ? d.format('D MMM YYYY, HH:mm') : '—';
}

/**
 * Thousands separators. Issue counts reach six figures during a flood, and
 * `103847` versus `103,847` is the difference between a number you can read at a
 * glance and one you have to count digits on.
 */
export function formatNumber(n: number): string {
    return n.toLocaleString();
}

/** "AB" from a name, for avatars. Inlined in `Topbar.tsx` before this. */
export function initials(name: string | null | undefined): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Tone for a console level, shared by every surface that renders one.
 *
 * Centralised for the reason the sprint plan calls out: level appears on the
 * issue list, the issue detail, the project card and the dashboard, and four
 * local colour decisions become four different reds.
 */
export function levelTone(level: string): 'accent' | 'neutral' | 'outline' {
    switch (level) {
        case 'error':
            return 'accent';
        case 'warn':
            return 'outline';
        default:
            return 'neutral';
    }
}

export function issueStatusTone(status: string): 'accent' | 'neutral' | 'outline' | 'solid' {
    switch (status) {
        case 'unresolved':
            return 'accent';
        case 'resolved':
            return 'neutral';
        case 'ignored':
            return 'outline';
        default:
            return 'neutral';
    }
}
