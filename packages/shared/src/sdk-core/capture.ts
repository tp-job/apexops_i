/**
 * Console + error capture — the core of `/sdk/v1.js` and of the browser extension.
 *
 * Extracted from `app/server/public/sdk/v1.js` (extension spec P2). The logic is
 * unchanged line for line; what changed is where its inputs come from. The v1
 * script read its config from its own `<script>` tag and sent with `fetch`. An
 * extension-injected copy has no script tag and cannot `fetch` past the page's
 * CSP, so both arrive as arguments here: `config` (what to capture) and
 * `transport` (how it leaves). `host` is the window, injectable so this runs
 * under test with fakes.
 *
 * Runs on pages we do not control. Every design choice below follows from that:
 * it must never throw into the host page, never recurse through the console it
 * patches, and never keep retrying a dead server forever.
 */

export type CaptureLevel = 'error' | 'warn' | 'info' | 'log' | 'debug';

export interface CaptureConfig {
    /** The project's ingest key. Travels in every batch body. */
    key: string;
    /** Console levels to patch. Uncaught errors and rejections are captured regardless. */
    levels: string[];
    release: string | null;
    /** 0–1, applied to non-error levels only. */
    sample: number;
    /** Merged into every event's `context`, e.g. `{ source: 'extension' }`. */
    context?: Record<string, unknown>;
    /** Rewrite the page URL before it is recorded, e.g. to strip query and hash. */
    mapUrl?: (href: string) => string;
    /**
     * Asked before each event is queued; `false` drops it. The extension uses it
     * to stand down once the page's own SDK is present (spec X9), which can
     * happen long after capture started — an SDK loaded with `async`, or by a
     * button. Checked per event rather than once at startup for that reason.
     */
    shouldCapture?: () => boolean;
}

export type SendOutcome = 'ok' | 'failure';

export interface CaptureTransport {
    /** Regular send. `failure` (or a rejection) feeds the circuit breaker. */
    send(body: string): Promise<SendOutcome>;
    /**
     * Fire-and-forget send that survives page teardown (`sendBeacon`). Optional:
     * without it, an unload flush falls back to `send`.
     */
    sendOnUnload?(body: string): void;
}

/** The slice of `window` the capture touches. `window` itself satisfies it. */
export interface CaptureHost {
    console: Console;
    location: { href: string };
    navigator: { userAgent: string };
    document: {
        visibilityState: string;
        addEventListener(type: 'visibilitychange', listener: () => void): void;
    };
    addEventListener(type: string, listener: (event: any) => void): void;
    setInterval(handler: () => void, ms: number): unknown;
}

export interface CaptureEvent {
    level: string;
    message: string;
    stack: string | null;
    url: string;
    userAgent: string;
    release: string | null;
    timestamp: string;
    context: Record<string, unknown>;
    count: number;
}

// ── Limits ───────────────────────────────────────────────────
// Mirror the server's caps so oversized payloads are trimmed here rather than
// rejected there — a 413 loses the whole batch, including the crash.
export const MAX_MESSAGE = 8 * 1024;
export const MAX_STACK = 16 * 1024;
export const MAX_BATCH_BYTES = 64 * 1024;
export const MAX_BATCH_EVENTS = 100;
export const DEDUPE_WINDOW_MS = 5000;
export const FLUSH_INTERVAL_MS = 5000;
export const QUEUE_CAP = 200;
/** The server's schema ceiling for `count`; above it the whole batch is a 400. */
export const MAX_EVENT_COUNT = 10_000;
const MAX_BACKOFF_MS = 5 * 60 * 1000;

const PATCHABLE: CaptureLevel[] = ['error', 'warn', 'info', 'log', 'debug'];

function truncate(s: unknown, max: number): string {
    if (typeof s !== 'string') return '';
    return s.length > max ? `${s.slice(0, max)}\n…[truncated]` : s;
}

/**
 * Stringify one console argument without ever throwing.
 * Compact JSON, not pretty-printed: the v0 script used
 * `JSON.stringify(arg, null, 2)`, which tripled payload size for no benefit
 * on the wire.
 */
export function stringify(arg: unknown): string {
    if (typeof arg === 'string') return arg;
    if (arg instanceof Error) return arg.message || String(arg);
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    try {
        const seen: unknown[] = [];
        return (
            JSON.stringify(arg, (_k, v) => {
                if (typeof v === 'object' && v !== null) {
                    if (seen.indexOf(v) !== -1) return '[Circular]';
                    seen.push(v);
                }
                return v;
            }) || String(arg)
        );
    } catch {
        return String(arg);
    }
}

export interface CaptureHandle {
    /** Send what is queued now. `unload: true` takes the teardown-safe path. */
    flush(unload: boolean): void;
}

export function startCapture(
    config: CaptureConfig,
    transport: CaptureTransport,
    host: CaptureHost = window as unknown as CaptureHost
): CaptureHandle {
    const hostConsole = host.console;

    // ── Capture the real console before anything patches it ──
    // Every internal log goes through these. Using the patched console from
    // inside the SDK is the recursion that takes down the host page.
    const nativeError: (...args: unknown[]) => void =
        hostConsole && hostConsole.error ? hostConsole.error.bind(hostConsole) : () => {};

    /** Hard re-entrancy guard: true while we are inside our own capture path. */
    let inside = false;

    function safely<A extends unknown[]>(fn: (...args: A) => void): (...args: A) => void {
        return (...args: A) => {
            if (inside) return;
            inside = true;
            try {
                fn(...args);
            } catch (e) {
                try {
                    nativeError('[apexops] internal error', e);
                } catch {
                    /* nothing left to report through */
                }
            } finally {
                inside = false;
            }
        };
    }

    // ── Queue + dedupe ───────────────────────────────────────
    const queue: CaptureEvent[] = [];
    /** signature -> { event, at } for events still inside the dedupe window. */
    const recent: Record<string, { event: CaptureEvent; at: number }> = Object.create(null);

    const signature = (ev: CaptureEvent) => `${ev.level} ${ev.message} ${ev.stack || ''}`;

    function enqueue(ev: CaptureEvent): void {
        if (config.shouldCapture && !config.shouldCapture()) return;
        const now = Date.now();
        const sig = signature(ev);
        const hit = recent[sig];

        // A render loop throwing 500x/second becomes ONE event carrying
        // `count: 500`, not 500 requests. The server adds `count` to the issue
        // total, so "how often it happened" stays accurate while "how many
        // samples we stored" stays bounded.
        if (hit && now - hit.at < DEDUPE_WINDOW_MS) {
            // Capped: the server rejects the whole batch above this, and a 400
            // is not a failure to the circuit breaker, so the batch — crash
            // included — used to vanish without a trace.
            if (hit.event.count < MAX_EVENT_COUNT) hit.event.count += 1;
            return;
        }

        // Sampling applies to non-error levels only — an error is never dropped
        // to save bandwidth, because the one you drop is the one being debugged.
        if (ev.level !== 'error' && config.sample < 1 && Math.random() > config.sample) return;

        ev.count = 1;
        recent[sig] = { event: ev, at: now };

        // Drop oldest rather than newest: during a flood the most recent events
        // are the ones still describing the live failure.
        if (queue.length >= QUEUE_CAP) queue.shift();
        queue.push(ev);

        if (queue.length >= MAX_BATCH_EVENTS) flush(false);
    }

    function makeEvent(level: string, message: string, stack: string | null): CaptureEvent {
        const href = config.mapUrl ? config.mapUrl(host.location.href) : host.location.href;
        return {
            level,
            message: truncate(message, MAX_MESSAGE),
            stack: stack ? truncate(stack, MAX_STACK) : null,
            url: href.slice(0, 2048),
            userAgent: host.navigator.userAgent.slice(0, 512),
            release: config.release,
            timestamp: new Date().toISOString(),
            context: { ...config.context },
            count: 1,
        };
    }

    // ── Circuit breaker ──────────────────────────────────────
    // Without this, a server that is down means one failed send per batch,
    // forever, on someone else's page.
    let failures = 0;
    let blockedUntil = 0;

    function onSendFailure(): void {
        failures += 1;
        if (failures >= 3) {
            const backoff = Math.min(MAX_BACKOFF_MS, 1000 * Math.pow(2, failures - 3));
            blockedUntil = Date.now() + backoff;
        }
    }

    function onSendSuccess(): void {
        failures = 0;
        blockedUntil = 0;
    }

    // ── Batching ─────────────────────────────────────────────
    function buildBatch(): string | null {
        const taken = queue.splice(0, MAX_BATCH_EVENTS);
        if (!taken.length) return null;

        let batch = taken;
        let body = JSON.stringify({ key: config.key, events: batch });
        // Halve until it fits rather than dropping the batch: an oversized
        // payload is a 413, and a 413 loses the crash.
        while (body.length > MAX_BATCH_BYTES && batch.length > 1) {
            batch = batch.slice(0, Math.ceil(batch.length / 2));
            body = JSON.stringify({ key: config.key, events: batch });
        }
        // What did not fit goes back to the front of the queue for the next
        // flush. Until 2026-09-20 it was discarded — halving 40 large events
        // sent 10 and silently lost 30, contrary to the comment above.
        if (batch.length < taken.length) queue.unshift(...taken.slice(batch.length));
        return body;
    }

    const flush = safely((isUnload: boolean) => {
        if (!queue.length) return;
        if (!isUnload && Date.now() < blockedUntil) return;

        const body = buildBatch();
        if (!body) return;

        // The teardown-safe path is the only transport the browser will still
        // deliver during unload. The v0 script used `fetch` on `beforeunload`,
        // which the browser cancels — so the final batch, the one containing
        // the crash, was exactly the batch that got dropped.
        if (isUnload && transport.sendOnUnload) {
            try {
                transport.sendOnUnload(body);
            } catch {
                /* best effort by definition */
            }
            return;
        }

        try {
            transport.send(body).then(
                (outcome) => (outcome === 'failure' ? onSendFailure() : onSendSuccess()),
                () => onSendFailure()
            );
        } catch {
            onSendFailure();
        }
    });

    // ── Console capture ──────────────────────────────────────
    // Only the levels the project asked for are patched. The server enforces
    // `Project.captureLevels` regardless — this is a bandwidth optimisation,
    // not the security boundary.
    PATCHABLE.forEach((level) => {
        if (config.levels.indexOf(level) === -1) return;
        const original = hostConsole[level];
        if (typeof original !== 'function') return;

        hostConsole[level] = function (...args: unknown[]) {
            // The host page's own logging must happen first and unconditionally,
            // so a bug in our capture can never swallow their output.
            try {
                original.apply(hostConsole, args);
            } catch {
                /* theirs, not ours */
            }

            if (inside) return;
            inside = true;
            try {
                let stack: string | null = null;
                for (let i = 0; i < args.length; i++) {
                    const arg = args[i];
                    if (arg instanceof Error && arg.stack) {
                        stack = arg.stack;
                        break;
                    }
                }
                enqueue(makeEvent(level, args.map(stringify).join(' '), stack));
            } catch {
                /* never into the host page */
            } finally {
                inside = false;
            }
        };
    });

    // ── Global error hooks ───────────────────────────────────
    // Always on, independent of `levels`: an uncaught exception is the event the
    // product exists to capture.
    host.addEventListener(
        'error',
        safely((e: ErrorEvent | null) => {
            if (!e) return;
            const msg = e.message || (e.error && e.error.message) || 'Uncaught error';
            let stack: string | null = e.error && e.error.stack ? e.error.stack : null;
            if (!stack && e.filename) stack = `${e.filename}:${e.lineno}:${e.colno}`;
            enqueue(makeEvent('error', msg, stack));
        })
    );

    host.addEventListener(
        'unhandledrejection',
        safely((e: PromiseRejectionEvent | null) => {
            const reason = e ? e.reason : null;
            const msg = reason && reason.message ? reason.message : stringify(reason);
            const stack = reason && reason.stack ? reason.stack : null;
            enqueue(makeEvent('error', `Unhandled promise rejection: ${msg}`, stack));
        })
    );

    // ── Scheduling ───────────────────────────────────────────
    const timer = host.setInterval(() => flush(false), FLUSH_INTERVAL_MS) as { unref?: () => void } | null;
    if (timer && typeof timer === 'object' && timer.unref) timer.unref();

    // `visibilitychange`/`pagehide` fire on mobile backgrounding where
    // `beforeunload` does not — on iOS Safari that is the common case.
    host.addEventListener('pagehide', () => flush(true));
    host.document.addEventListener('visibilitychange', () => {
        if (host.document.visibilityState === 'hidden') flush(true);
    });
    host.addEventListener('beforeunload', () => flush(true));

    return { flush };
}
