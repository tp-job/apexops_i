/**
 * The console monitor's log buffer.
 *
 * Pure on purpose. The two rules here — *pause must not drop* and *the buffer is
 * bounded* — are the ones that fail quietly: a dropped burst looks identical to a
 * quiet application, and an unbounded buffer looks fine until the tab has been
 * open for an hour. Neither is observable in a screenshot, so both are unit
 * tested rather than eyeballed.
 *
 * Decisions S9-D6 (the feed is live-only; nothing here is persisted) and S9-D7
 * (pause freezes the view and keeps buffering).
 */

/** Matches the server's own per-emit relay cap in `server.ts`. */
export const CONSOLE_BUFFER_LIMIT = 500;

export type LogLevel = 'error' | 'warning' | 'info' | 'debug';

export interface MonitorLog {
    id: string;
    timestamp: string;
    level: LogLevel;
    message: string;
    source: string;
    /** Added by the server relay, so a merged stream can still name its origin. */
    appName?: string;
    receivedAt?: string;
    stack?: string;
}

export interface ConsoleBufferState {
    /** Newest first — the order the panel renders. */
    visible: MonitorLog[];
    /** Arrived while paused. Held, never dropped (S9-D7). */
    pending: MonitorLog[];
    paused: boolean;
}

export const emptyBuffer = (): ConsoleBufferState => ({ visible: [], pending: [], paused: false });

/**
 * Normalise whatever a target app called its level.
 *
 * The SDK relays `console.warn` as `warn` and `console.log` as `log`, and an app
 * can emit anything at all. An unrecognised level must not vanish from a filtered
 * view or crash a lookup, so everything unknown lands on `info` — the level whose
 * meaning is "we do not know that this is a problem".
 */
export function normaliseLevel(raw: unknown): LogLevel {
    const v = String(raw ?? '').toLowerCase().trim();
    if (v === 'error' || v === 'err' || v === 'fatal') return 'error';
    if (v === 'warning' || v === 'warn') return 'warning';
    if (v === 'debug' || v === 'trace') return 'debug';
    return 'info';
}

/**
 * Add newly relayed logs.
 *
 * While paused they go to `pending` instead of `visible`, so the rendered list
 * holds still under a reading cursor without the stream being torn down. Both
 * lists are capped: a pause left on overnight must not grow without bound, and
 * dropping the oldest is the only sane choice when the newest is what matters.
 */
export function appendLogs(
    state: ConsoleBufferState,
    incoming: MonitorLog[],
    limit: number = CONSOLE_BUFFER_LIMIT,
): ConsoleBufferState {
    if (incoming.length === 0) return state;

    // Newest first, matching how the panel reads top-down.
    const ordered = [...incoming].reverse();

    if (state.paused) {
        return { ...state, pending: [...ordered, ...state.pending].slice(0, limit) };
    }
    return { ...state, visible: [...ordered, ...state.visible].slice(0, limit) };
}

/**
 * Pause or resume.
 *
 * Resuming **flushes** whatever arrived while paused into the visible list. A
 * pause that unsubscribes, or that discards on resume, loses exactly the burst
 * the user paused in order to read — the worst thing a debugging tool can do.
 */
export function setPaused(
    state: ConsoleBufferState,
    paused: boolean,
    limit: number = CONSOLE_BUFFER_LIMIT,
): ConsoleBufferState {
    if (paused === state.paused) return state;
    if (paused) return { ...state, paused: true };

    return {
        paused: false,
        pending: [],
        visible: [...state.pending, ...state.visible].slice(0, limit),
    };
}

/** Clear what is on screen. Pending is cleared too — "clear" means clear. */
export function clearLogs(state: ConsoleBufferState): ConsoleBufferState {
    return { ...state, visible: [], pending: [] };
}

/** Render a log the way the copy-to-clipboard control writes it out. */
export function formatLogLine(log: MonitorLog): string {
    const app = log.appName ? ` [${log.appName}]` : '';
    const src = log.source ? ` (${log.source})` : '';
    const head = `[${log.timestamp}] [${log.level.toUpperCase()}]${app}${src} ${log.message}`;
    return log.stack ? `${head}\n${log.stack}` : head;
}
