import type { IngestEvent } from './sanitize';

/**
 * Events waiting to reach /api/ingest, persisted so a stopped service worker
 * does not lose them (spec P3 step 6).
 *
 * MV3 stops the worker whenever it has been idle for ~30s, and at any point
 * the browser sees fit. Anything held only in memory is gone when that happens,
 * so every batch is written to storage *before* the send is attempted and
 * removed only after the server has taken it.
 *
 * Delivery is therefore at-least-once, not exactly-once: a worker stopped in
 * the gap between the server's 202 and the removal below sends that batch
 * again when it wakes. That window is one storage write wide; the common cases
 * — offline, server down, worker stopped with events still queued — lose
 * nothing and send nothing twice.
 */

export interface QueueItem {
    id: string;
    /** Origin of the site the events came from; selects the binding at send time. */
    origin: string;
    events: IngestEvent[];
    attempts: number;
}

export interface QueueStore {
    load(): Promise<QueueItem[]>;
    save(items: QueueItem[]): Promise<void>;
}

/**
 * `sent`: the server took it. `drop`: it never will (bad request, no binding) —
 * retrying only repeats the failure. `retry`: try again later (offline, 429, 5xx).
 */
export type SendResult = 'sent' | 'retry' | 'drop';

/** Bound on what a flood on one page — or a long outage — can pile up in storage. */
export const MAX_QUEUED_EVENTS = 1000;

export function createIngestQueue(
    store: QueueStore,
    send: (item: QueueItem) => Promise<SendResult>,
    newId: () => string = () => crypto.randomUUID()
) {
    // Storage reads and writes interleave across awaits, so every
    // read-modify-write goes through this one chain. Two batches arriving
    // together must not each read the old list and overwrite the other.
    let chain: Promise<unknown> = Promise.resolve();
    const locked = <T>(fn: () => Promise<T>): Promise<T> => {
        const run = chain.then(fn, fn);
        chain = run.catch(() => undefined);
        return run;
    };

    async function enqueue(origin: string, events: IngestEvent[]): Promise<void> {
        if (!events.length) return;
        await locked(async () => {
            const items = await store.load();
            items.push({ id: newId(), origin, events, attempts: 0 });
            // Oldest out first: during a flood the newest batches describe the
            // live failure.
            let total = items.reduce((n, i) => n + i.events.length, 0);
            while (total > MAX_QUEUED_EVENTS && items.length > 1) total -= items.shift()!.events.length;
            await store.save(items);
        });
    }

    let flushing: Promise<void> | null = null;

    /** Send queued batches in order until one must wait. Concurrent calls share one run. */
    function flush(): Promise<void> {
        if (flushing) return flushing;
        flushing = (async () => {
            try {
                for (;;) {
                    const next = await locked(async () => (await store.load())[0]);
                    if (!next) return;

                    let result: SendResult;
                    try {
                        result = await send(next);
                    } catch {
                        result = 'retry';
                    }

                    await locked(async () => {
                        const items = await store.load();
                        const i = items.findIndex((x) => x.id === next.id);
                        const current = items[i];
                        if (!current) return;
                        if (result === 'retry') items[i] = { ...current, attempts: current.attempts + 1 };
                        else items.splice(i, 1);
                        await store.save(items);
                    });
                    // The server is down or throttling: everything behind this
                    // batch would fail the same way. The retry alarm resumes.
                    if (result === 'retry') return;
                }
            } finally {
                flushing = null;
            }
        })();
        return flushing;
    }

    return { enqueue, flush };
}
