/**
 * The service worker's trust boundary for captured events.
 *
 * Everything here arrived from a page — the MAIN-world capture runs where the
 * page can reach it, and any script on the page can dispatch the same DOM event
 * the bridge listens for. So nothing is taken as given: fields are picked, typed
 * and capped to the server's own schema (`app/server/src/schemas/ingest.schema.ts`),
 * the URL is stripped again, and `context` is replaced rather than merged. A
 * forged event is still only an event, which is the same exposure the public
 * ingest key already has (project-workspaces D4); what must not happen is the
 * page choosing the project, the key, or anything beyond the event itself.
 */

export interface IngestEvent {
    level: string;
    message: string;
    stack: string | null;
    url: string | null;
    userAgent: string | null;
    release: null;
    timestamp: string | null;
    count: number;
    context: { source: 'extension' };
}

const LEVELS = new Set(['error', 'warn', 'info', 'log', 'debug']);
const MAX_MESSAGE = 8 * 1024;
const MAX_STACK = 16 * 1024;
/** The server's batch and count ceilings; above them the whole request is a 400. */
export const MAX_EVENTS_PER_BATCH = 100;
const MAX_COUNT = 10_000;
/** Generous over the core's 64 KB batch cap; anything bigger is not from our capture. */
export const MAX_BODY_CHARS = 256 * 1024;

/** Query and fragment carry tokens and PII far more often than paths do (spec X5). */
export const stripUrl = (href: string): string => href.split(/[?#]/)[0] ?? href;

const str = (v: unknown, max: number): string | null => (typeof v === 'string' ? v.slice(0, max) : null);

/** Parse one batch body from the page. Anything malformed is dropped, never thrown. */
export function sanitizeBatch(body: unknown): IngestEvent[] {
    if (typeof body !== 'string' || body.length > MAX_BODY_CHARS) return [];
    let parsed: unknown;
    try {
        parsed = JSON.parse(body);
    } catch {
        return [];
    }
    const events = (parsed as { events?: unknown })?.events;
    if (!Array.isArray(events)) return [];

    const out: IngestEvent[] = [];
    for (const raw of events.slice(0, MAX_EVENTS_PER_BATCH)) {
        if (!raw || typeof raw !== 'object') continue;
        const e = raw as Record<string, unknown>;
        if (typeof e.level !== 'string' || !LEVELS.has(e.level)) continue;
        const url = str(e.url, 4096);
        const count = typeof e.count === 'number' && Number.isInteger(e.count) ? e.count : 1;
        out.push({
            level: e.level,
            message: str(e.message, MAX_MESSAGE) ?? '',
            stack: str(e.stack, MAX_STACK),
            url: url === null ? null : stripUrl(url).slice(0, 2048),
            userAgent: str(e.userAgent, 512),
            release: null,
            timestamp: str(e.timestamp, 64),
            count: Math.min(Math.max(count, 1), MAX_COUNT),
            context: { source: 'extension' },
        });
    }
    return out;
}
