import { describe, expect, it } from 'vitest';
import { MAX_BODY_CHARS, MAX_EVENTS_PER_BATCH, sanitizeBatch, stripUrl } from './sanitize';

const ev = (over: Record<string, unknown> = {}) => ({
    level: 'error',
    message: 'boom',
    stack: 'Error: boom\n    at x (app.js:1:1)',
    url: 'https://site.test/cart?token=secret#step',
    userAgent: 'UA',
    release: null,
    timestamp: '2026-09-20T00:00:00.000Z',
    context: { source: 'extension' },
    count: 3,
    ...over,
});
const body = (events: unknown[], extra: Record<string, unknown> = {}) => JSON.stringify({ key: '', events, ...extra });

describe('sanitizeBatch — everything from the page is untrusted', () => {
    it('keeps a well-formed event, with the URL stripped again', () => {
        const [e] = sanitizeBatch(body([ev()]));
        expect(e).toEqual({
            level: 'error',
            message: 'boom',
            stack: 'Error: boom\n    at x (app.js:1:1)',
            url: 'https://site.test/cart',
            userAgent: 'UA',
            release: null,
            timestamp: '2026-09-20T00:00:00.000Z',
            count: 3,
            context: { source: 'extension' },
        });
    });

    it('replaces context and release rather than trusting them', () => {
        const [e] = sanitizeBatch(body([ev({ context: { source: 'sdk', projectId: 99 }, release: 'forged@1' })]));
        expect(e?.context).toEqual({ source: 'extension' });
        expect(e?.release).toBeNull();
    });

    it('ignores a key in the body — the worker supplies the key', () => {
        const [e] = sanitizeBatch(body([ev()], { key: 'pk_attacker' }));
        expect(e).not.toHaveProperty('key');
    });

    it('drops malformed events and malformed bodies without throwing', () => {
        expect(sanitizeBatch(body([ev({ level: 'fatal' }), ev({ level: 7 }), null, 'x', ev()]))).toHaveLength(1);
        expect(sanitizeBatch('{not json')).toEqual([]);
        expect(sanitizeBatch(JSON.stringify({ events: 'nope' }))).toEqual([]);
        expect(sanitizeBatch({ events: [ev()] })).toEqual([]);
        expect(sanitizeBatch(undefined)).toEqual([]);
    });

    it('holds every field to the server schema so a batch is never a 400', () => {
        const [e] = sanitizeBatch(
            body([
                ev({
                    message: 'm'.repeat(20_000),
                    stack: 's'.repeat(40_000),
                    url: `https://site.test/${'p'.repeat(5000)}`,
                    userAgent: 'u'.repeat(900),
                    timestamp: 't'.repeat(200),
                    count: 99_999,
                }),
            ])
        );
        expect(e?.message).toHaveLength(8 * 1024);
        expect(e?.stack).toHaveLength(16 * 1024);
        expect(e?.url?.length).toBeLessThanOrEqual(2048);
        expect(e?.userAgent).toHaveLength(512);
        expect(e?.timestamp).toHaveLength(64);
        expect(e?.count).toBe(10_000);
    });

    it('clamps nonsense counts to 1', () => {
        expect(sanitizeBatch(body([ev({ count: 0 }), ev({ count: -5 }), ev({ count: 1.5 })])).map((e) => e.count)).toEqual([1, 1, 1]);
    });

    it('caps the batch at the server maximum and refuses oversized bodies', () => {
        const many = Array.from({ length: 150 }, (_, i) => ev({ message: `m${i}` }));
        expect(sanitizeBatch(body(many))).toHaveLength(MAX_EVENTS_PER_BATCH);
        expect(sanitizeBatch(body([ev({ message: 'x'.repeat(MAX_BODY_CHARS) })]))).toEqual([]);
    });
});

describe('stripUrl', () => {
    it('removes query and fragment, keeps the path', () => {
        expect(stripUrl('https://a.test/p/q?x=1#y')).toBe('https://a.test/p/q');
        expect(stripUrl('https://a.test/#/route?x')).toBe('https://a.test/');
        expect(stripUrl('https://a.test/plain')).toBe('https://a.test/plain');
    });
});
