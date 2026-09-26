import { describe, expect, it, vi } from 'vitest';
import {
    MAX_BATCH_BYTES,
    MAX_EVENT_COUNT,
    startCapture,
    type CaptureConfig,
    type CaptureEvent,
    type CaptureHost,
    type CaptureTransport,
    type SendOutcome,
} from './capture';

/**
 * The capture core, against a fake window. These pin the promises v1.js makes
 * to host pages — never throw into them, never recurse, never hammer a dead
 * server — plus the two inputs the extension adds (`context`, `mapUrl`).
 * Byte-for-byte parity with the old hand-written v1.js is checked separately,
 * in a real browser (.agents/harness/browser-extension/checks/p2-sdk-parity.mjs).
 */

function fakeHost() {
    const listeners: Record<string, ((e: unknown) => void)[]> = {};
    const docListeners: (() => void)[] = [];
    const printed: unknown[][] = [];
    const log = (level: string) => (...args: unknown[]) => printed.push([level, ...args]);
    const host = {
        console: { error: log('error'), warn: log('warn'), info: log('info'), log: log('log'), debug: log('debug') },
        location: { href: 'https://site.test/cart?token=secret#step2' },
        navigator: { userAgent: 'FakeAgent/1.0' },
        document: {
            visibilityState: 'visible',
            addEventListener: (_t: string, l: () => void) => void docListeners.push(l),
        },
        addEventListener: (t: string, l: (e: unknown) => void) => void (listeners[t] ??= []).push(l),
        setInterval: () => null,
    };
    return {
        host: host as unknown as CaptureHost,
        console: host.console as unknown as Console,
        printed,
        fire: (type: string, event: unknown) => listeners[type]?.forEach((l) => l(event)),
        hide: () => {
            host.document.visibilityState = 'hidden';
            docListeners.forEach((l) => l());
        },
    };
}

function fakeTransport(outcome: SendOutcome = 'ok', withUnload = true) {
    const sent: { body: string; unload: boolean }[] = [];
    const transport: CaptureTransport = {
        send: async (body) => {
            sent.push({ body, unload: false });
            return outcome;
        },
    };
    if (withUnload) transport.sendOnUnload = (body) => void sent.push({ body, unload: true });
    const events = (): CaptureEvent[] => sent.flatMap((s) => JSON.parse(s.body).events);
    return { transport, sent, events };
}

const config = (over: Partial<CaptureConfig> = {}): CaptureConfig => ({
    key: 'pk_test',
    levels: ['error', 'warn'],
    release: 'r1',
    sample: 1,
    ...over,
});

describe('console capture', () => {
    it('patches only the configured levels, and the page still prints first', () => {
        const h = fakeHost();
        const t = fakeTransport();
        const cap = startCapture(config(), t.transport, h.host);

        h.console.error('boom', { a: 1 });
        h.console.log('not captured');
        cap.flush(false);

        expect(h.printed).toEqual([
            ['error', 'boom', { a: 1 }],
            ['log', 'not captured'],
        ]);
        expect(t.events().map((e) => [e.level, e.message])).toEqual([['error', 'boom {"a":1}']]);
        expect(JSON.parse(t.sent[0].body).key).toBe('pk_test');
    });

    it('takes the stack from an Error argument and survives circular objects', () => {
        const h = fakeHost();
        const t = fakeTransport();
        const cap = startCapture(config(), t.transport, h.host);
        const loop: Record<string, unknown> = {};
        loop.self = loop;

        h.console.error(new Error('bad'), loop);
        cap.flush(false);

        const [ev] = t.events();
        expect(ev.message).toBe('bad {"self":"[Circular]"}');
        expect(ev.stack).toContain('Error: bad');
    });

    it('collapses a flood into one event carrying the count', () => {
        const h = fakeHost();
        const t = fakeTransport();
        const cap = startCapture(config(), t.transport, h.host);

        for (let i = 0; i < 50; i++) h.console.error('same thing');
        cap.flush(false);

        expect(t.events()).toHaveLength(1);
        expect(t.events()[0].count).toBe(50);
    });

    it('caps the dedupe count at what the server accepts', () => {
        // The server's schema rejects count > 10,000 with a 400, and a 400 is
        // not a failure to the circuit breaker, so the batch — crash included —
        // was dropped without a trace.
        const h = fakeHost();
        const t = fakeTransport();
        const cap = startCapture(config(), t.transport, h.host);
        for (let i = 0; i < MAX_EVENT_COUNT + 50; i++) h.console.error('render loop');
        cap.flush(false);
        expect(t.events()[0].count).toBe(MAX_EVENT_COUNT);
    });

    it('shouldCapture can switch capture off per event without unpatching', () => {
        const h = fakeHost();
        const t = fakeTransport();
        let sdkPresent = false;
        const cap = startCapture(config({ shouldCapture: () => !sdkPresent }), t.transport, h.host);

        h.console.error('before the SDK');
        sdkPresent = true;
        h.console.error('after the SDK');
        h.fire('unhandledrejection', { reason: new Error('also after') });
        cap.flush(false);

        expect(t.events().map((e) => e.message)).toEqual(['before the SDK']);
        // The page's own output is never affected.
        expect(h.printed.map((p) => p[1])).toEqual(['before the SDK', 'after the SDK']);
    });

    it('samples warnings but never errors', () => {
        const h = fakeHost();
        const t = fakeTransport();
        const cap = startCapture(config({ sample: 0 }), t.transport, h.host);

        h.console.warn('dropped');
        h.console.error('kept');
        cap.flush(false);

        expect(t.events().map((e) => e.message)).toEqual(['kept']);
    });

    it('applies the extension inputs: context on every event, and the URL rewrite', () => {
        const h = fakeHost();
        const t = fakeTransport();
        const cap = startCapture(
            config({ context: { source: 'extension' }, mapUrl: (u) => u.split(/[?#]/)[0] }),
            t.transport,
            h.host
        );

        h.console.error('one');
        h.console.error('two');
        cap.flush(false);

        const [a, b] = t.events();
        expect(a.url).toBe('https://site.test/cart');
        expect(a.context).toEqual({ source: 'extension' });
        // A fresh object per event, not one shared and mutable across them.
        expect(a.context).not.toBe(b.context);
    });

    it('leaves url and context as v1 always sent them when those inputs are absent', () => {
        const h = fakeHost();
        const t = fakeTransport();
        const cap = startCapture(config(), t.transport, h.host);
        h.console.error('x');
        cap.flush(false);
        expect(t.events()[0].url).toBe('https://site.test/cart?token=secret#step2');
        expect(t.events()[0].context).toEqual({});
    });
});

describe('never hurts the host page', () => {
    it('a failure inside capture does not throw out of the patched console', () => {
        const h = fakeHost();
        const t = fakeTransport();
        startCapture(
            config({
                mapUrl: () => {
                    throw new Error('capture bug');
                },
            }),
            t.transport,
            h.host
        );
        expect(() => h.console.error('page error')).not.toThrow();
        expect(h.printed[0]).toEqual(['error', 'page error']);
    });

    it('logging from inside the transport does not recurse back into capture', async () => {
        const h = fakeHost();
        const bodies: string[] = [];
        const cap = startCapture(
            config(),
            {
                send: async (body) => {
                    bodies.push(body);
                    h.console.error('transport is logging');
                    return 'ok';
                },
            },
            h.host
        );

        h.console.error('first');
        cap.flush(false);
        cap.flush(false);

        // The transport's own log landed while we were inside flush; it was
        // printed but not captured, so there is nothing for a second flush.
        expect(bodies).toHaveLength(1);
        expect(h.printed.map((p) => p[1])).toContain('transport is logging');
    });
});

describe('global hooks', () => {
    it('captures uncaught errors and rejections even with no console levels patched', () => {
        const h = fakeHost();
        const t = fakeTransport();
        const cap = startCapture(config({ levels: [] }), t.transport, h.host);

        h.fire('error', { message: 'Uncaught TypeError: x is undefined', error: new TypeError('x is undefined') });
        h.fire('error', { message: '', filename: 'app.js', lineno: 3, colno: 9 });
        h.fire('unhandledrejection', { reason: new Error('timed out') });
        h.fire('unhandledrejection', { reason: 'plain string' });
        cap.flush(false);

        expect(t.events().map((e) => [e.message, e.stack?.split('\n')[0] ?? null])).toEqual([
            ['Uncaught TypeError: x is undefined', 'TypeError: x is undefined'],
            ['Uncaught error', 'app.js:3:9'],
            ['Unhandled promise rejection: timed out', 'Error: timed out'],
            ['Unhandled promise rejection: plain string', null],
        ]);
    });
});

describe('transport', () => {
    it('hiding the page flushes through the teardown-safe path', () => {
        const h = fakeHost();
        const t = fakeTransport();
        startCapture(config(), t.transport, h.host);
        h.console.error('last words');
        h.hide();
        expect(t.sent.map((s) => s.unload)).toEqual([true]);
    });

    it('with no teardown-safe path, an unload flush falls back to send', () => {
        const h = fakeHost();
        const t = fakeTransport('ok', false);
        startCapture(config(), t.transport, h.host);
        h.console.error('last words');
        h.fire('pagehide', {});
        expect(t.sent.map((s) => s.unload)).toEqual([false]);
    });

    it('opens the circuit after three failed sends', async () => {
        const h = fakeHost();
        const t = fakeTransport('failure');
        const cap = startCapture(config(), t.transport, h.host);

        for (let i = 0; i < 4; i++) {
            h.console.error(`error ${i}`);
            cap.flush(false);
            await Promise.resolve();
            await Promise.resolve();
        }
        // Sends 1–3 failed; the 4th flush is inside the backoff window.
        expect(t.sent).toHaveLength(3);
    });

    it('a rejected send counts as a failure, not an unhandled rejection', async () => {
        const h = fakeHost();
        const send = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
        const cap = startCapture(config(), { send }, h.host);
        for (let i = 0; i < 4; i++) {
            h.console.error(`e${i}`);
            cap.flush(false);
            await Promise.resolve();
            await Promise.resolve();
        }
        expect(send).toHaveBeenCalledTimes(3);
    });

    it('halves an oversized batch instead of sending a body the server would reject', () => {
        const h = fakeHost();
        const t = fakeTransport();
        const cap = startCapture(config(), t.transport, h.host);
        const big = 'x'.repeat(4000);
        for (let i = 0; i < 40; i++) h.console.error(`${i} ${big}`);
        cap.flush(false);

        expect(t.sent[0].body.length).toBeLessThanOrEqual(MAX_BATCH_BYTES);
    });

    it('keeps what did not fit in a halved batch for the next flush', () => {
        // v1.js as shipped up to 2026-09-20 spliced up to 100 events out of the
        // queue, halved the batch until it fit, and discarded the rest: of these
        // 40 events, 10 were sent and 30 were silently lost.
        const h = fakeHost();
        const t = fakeTransport();
        const cap = startCapture(config(), t.transport, h.host);
        const big = 'x'.repeat(4000);
        for (let i = 0; i < 40; i++) h.console.error(`${i} ${big}`);

        for (let i = 0; i < 5; i++) cap.flush(false);

        const numbers = t.events().map((e) => Number(e.message.split(' ')[0]));
        expect(numbers).toEqual(Array.from({ length: 40 }, (_, i) => i));
        t.sent.forEach((s) => expect(s.body.length).toBeLessThanOrEqual(MAX_BATCH_BYTES));
    });
});
