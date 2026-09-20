import { describe, expect, it } from 'vitest';
import { createIngestQueue, MAX_QUEUED_EVENTS, type QueueItem, type SendResult } from './ingestQueue';
import type { IngestEvent } from './sanitize';

const evs = (n: number, tag = 'e'): IngestEvent[] =>
    Array.from({ length: n }, (_, i) => ({
        level: 'error',
        message: `${tag}${i}`,
        stack: null,
        url: null,
        userAgent: null,
        release: null,
        timestamp: null,
        count: 1,
        context: { source: 'extension' },
    }));

/** A store that, like chrome.storage, hands out copies — never live references. */
function memoryStore(initial: QueueItem[] = []) {
    let data = JSON.stringify(initial);
    return {
        load: async () => JSON.parse(data) as QueueItem[],
        save: async (items: QueueItem[]) => {
            data = JSON.stringify(items);
        },
        peek: () => JSON.parse(data) as QueueItem[],
    };
}

let n = 0;
const id = () => `id${++n}`;

describe('ingest queue', () => {
    it('persists before sending and removes only what the server took', async () => {
        const store = memoryStore();
        const seenInStore: number[] = [];
        const q = createIngestQueue(
            store,
            async () => {
                seenInStore.push(store.peek().length);
                return 'sent';
            },
            id
        );
        await q.enqueue('https://a.test', evs(2));
        await q.flush();
        expect(seenInStore).toEqual([1]); // it was on disk while in flight
        expect(store.peek()).toEqual([]);
    });

    it('keeps everything when the server is down, and stops at the first failure', async () => {
        const store = memoryStore();
        const calls: string[] = [];
        const q = createIngestQueue(
            store,
            async (item) => {
                calls.push(item.id);
                return 'retry';
            },
            id
        );
        await q.enqueue('https://a.test', evs(1, 'a'));
        await q.enqueue('https://a.test', evs(1, 'b'));
        await q.flush();
        expect(calls).toHaveLength(1);
        expect(store.peek().map((i) => i.attempts)).toEqual([1, 0]);
    });

    it('a stopped worker loses nothing: a new queue over the same store drains it once', async () => {
        const store = memoryStore();
        const down = createIngestQueue(store, async () => 'retry' as SendResult, id);
        await down.enqueue('https://a.test', evs(3));
        await down.flush();

        // "Worker restarted": fresh queue object, same persisted store.
        const delivered: string[] = [];
        const up = createIngestQueue(
            store,
            async (item) => {
                delivered.push(...item.events.map((e) => e.message));
                return 'sent';
            },
            id
        );
        await up.flush();
        await up.flush();
        expect(delivered).toEqual(['e0', 'e1', 'e2']);
        expect(store.peek()).toEqual([]);
    });

    it('drops a batch the server will never accept and carries on', async () => {
        const store = memoryStore();
        const q = createIngestQueue(store, async (item) => (item.events[0]?.message === 'bad0' ? 'drop' : 'sent'), id);
        await q.enqueue('https://a.test', evs(1, 'bad'));
        await q.enqueue('https://a.test', evs(1, 'good'));
        await q.flush();
        expect(store.peek()).toEqual([]);
    });

    it('a send that throws is a retry, not a crash', async () => {
        const store = memoryStore();
        const q = createIngestQueue(
            store,
            async () => {
                throw new TypeError('Failed to fetch');
            },
            id
        );
        await q.enqueue('https://a.test', evs(1));
        await expect(q.flush()).resolves.toBeUndefined();
        expect(store.peek()).toHaveLength(1);
    });

    it('concurrent enqueues do not overwrite each other', async () => {
        const store = memoryStore();
        const q = createIngestQueue(store, async () => 'sent', id);
        await Promise.all(Array.from({ length: 20 }, (_, i) => q.enqueue('https://a.test', evs(1, `c${i}-`))));
        expect(store.peek()).toHaveLength(20);
    });

    it('concurrent flushes share one run — no batch is sent twice', async () => {
        const store = memoryStore();
        const sent: string[] = [];
        const q = createIngestQueue(
            store,
            async (item) => {
                sent.push(item.id);
                await new Promise((r) => setTimeout(r, 5));
                return 'sent';
            },
            id
        );
        await q.enqueue('https://a.test', evs(1));
        await q.enqueue('https://a.test', evs(1));
        await Promise.all([q.flush(), q.flush(), q.flush()]);
        expect(sent).toHaveLength(2);
        expect(new Set(sent).size).toBe(2);
    });

    it('bounds what an outage can pile up, dropping the oldest first', async () => {
        const store = memoryStore();
        const q = createIngestQueue(store, async () => 'retry' as SendResult, id);
        for (let i = 0; i < 15; i++) await q.enqueue('https://a.test', evs(100, `b${i}-`));
        const items = store.peek();
        expect(items.reduce((t, i) => t + i.events.length, 0)).toBeLessThanOrEqual(MAX_QUEUED_EVENTS);
        expect(items.at(-1)?.events[0]?.message).toBe('b14-0');
        expect(items[0]?.events[0]?.message).not.toBe('b0-0');
    });
});
