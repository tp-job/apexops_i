/**
 * Minimal user-agent classification for the issue breakdown panel.
 *
 * **Deliberately crude, and labelled as approximate in the UI.** User-agent
 * strings are self-reported, endlessly spoofed and full of compatibility
 * fictions — every browser still claims to be Mozilla. A full parser is a
 * dependency plus a signature database that goes stale, for a panel whose only
 * job is to answer "is this everyone, or just Safari?".
 *
 * Order matters in both functions: Edge and Opera both contain `Chrome`, and
 * Chrome contains `Safari`, so the most specific test has to run first.
 */

export function browserFromUserAgent(ua: string | null | undefined): string {
    if (!ua) return 'Unknown';
    if (/Edg[e/]/i.test(ua)) return 'Edge';
    if (/OPR\/|Opera/i.test(ua)) return 'Opera';
    if (/SamsungBrowser/i.test(ua)) return 'Samsung Internet';
    if (/Firefox\/|FxiOS/i.test(ua)) return 'Firefox';
    if (/Chrome\/|CriOS/i.test(ua)) return 'Chrome';
    if (/Safari\//i.test(ua)) return 'Safari';
    if (/bot|crawler|spider|curl|wget|node|python/i.test(ua)) return 'Bot / script';
    return 'Other';
}

export function osFromUserAgent(ua: string | null | undefined): string {
    if (!ua) return 'Unknown';
    // iPadOS reports as Macintosh, so the iPad test has to precede macOS.
    if (/iPad/i.test(ua)) return 'iPadOS';
    if (/iPhone|iPod/i.test(ua)) return 'iOS';
    if (/Android/i.test(ua)) return 'Android';
    if (/Windows NT/i.test(ua)) return 'Windows';
    if (/Mac OS X|Macintosh/i.test(ua)) return 'macOS';
    if (/CrOS/i.test(ua)) return 'ChromeOS';
    if (/Linux/i.test(ua)) return 'Linux';
    return 'Other';
}

export interface BreakdownEntry {
    name: string;
    count: number;
}

/** Counts by label, highest first, so the UI can render the top N without sorting. */
export function tally(values: string[]): BreakdownEntry[] {
    const counts = new Map<string, number>();
    for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
    return [...counts.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
}
