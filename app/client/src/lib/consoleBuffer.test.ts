import { describe, expect, it } from 'vitest';
import {
    appendLogs,
    clearLogs,
    CONSOLE_BUFFER_LIMIT,
    emptyBuffer,
    formatLogLine,
    normaliseLevel,
    setPaused,
    type MonitorLog,
} from './consoleBuffer';

/**
 * F009. The two failures covered here are the ones that are invisible on screen:
 * a pause that silently drops the burst you paused to read, and a buffer that
 * grows until the tab dies. Neither shows up in a screenshot, so neither can be
 * verified by looking at the page.
 */

const log = (id: string, over: Partial<MonitorLog> = {}): MonitorLog => ({
    id,
    timestamp: '2026-08-08T10:00:00.000Z',
    level: 'error',
    message: `msg-${id}`,
    source: 'test',
    ...over,
});

const ids = (xs: MonitorLog[]) => xs.map((x) => x.id);

describe('appendLogs', () => {
    it('puts the newest log first', () => {
        const s = appendLogs(appendLogs(emptyBuffer(), [log('a')]), [log('b')]);
        expect(ids(s.visible)).toEqual(['b', 'a']);
    });

    it('keeps a batch in newest-first order within itself', () => {
        const s = appendLogs(emptyBuffer(), [log('a'), log('b'), log('c')]);
        expect(ids(s.visible)).toEqual(['c', 'b', 'a']);
    });

    it('returns the same state for an empty batch', () => {
        const before = emptyBuffer();
        expect(appendLogs(before, [])).toBe(before);
    });

    it('caps the buffer and drops the OLDEST first', () => {
        let s = emptyBuffer();
        for (let i = 0; i < 12; i++) s = appendLogs(s, [log(String(i))], 10);
        expect(s.visible).toHaveLength(10);
        expect(s.visible[0].id).toBe('11'); // newest kept
        expect(ids(s.visible)).not.toContain('0'); // oldest dropped
        expect(ids(s.visible)).not.toContain('1');
    });

    it('caps a single oversized batch too', () => {
        const batch = Array.from({ length: 40 }, (_, i) => log(String(i)));
        expect(appendLogs(emptyBuffer(), batch, 10).visible).toHaveLength(10);
    });

    it('defaults to a 500-entry limit', () => {
        const batch = Array.from({ length: 600 }, (_, i) => log(String(i)));
        expect(appendLogs(emptyBuffer(), batch).visible).toHaveLength(CONSOLE_BUFFER_LIMIT);
    });
});

describe('pause', () => {
    it('HOLDS the visible list still while paused', () => {
        let s = appendLogs(emptyBuffer(), [log('a')]);
        s = setPaused(s, true);
        s = appendLogs(s, [log('b'), log('c')]);
        expect(ids(s.visible)).toEqual(['a']);
        expect(s.pending).toHaveLength(2);
    });

    it('DOES NOT DROP what arrived while paused — it flushes on resume', () => {
        // The load-bearing test in this file. A pause that unsubscribes, or that
        // discards on resume, loses exactly the burst the user paused to read.
        let s = appendLogs(emptyBuffer(), [log('a')]);
        s = setPaused(s, true);
        for (let i = 0; i < 20; i++) s = appendLogs(s, [log(`p${i}`)]);
        s = setPaused(s, false);

        expect(s.visible).toHaveLength(21);
        expect(s.pending).toHaveLength(0);
        expect(s.paused).toBe(false);
        expect(s.visible[0].id).toBe('p19'); // newest of the paused burst on top
        expect(s.visible[20].id).toBe('a'); // the pre-pause log still at the bottom
    });

    it('bounds the pending list so a long pause cannot grow without limit', () => {
        let s = setPaused(emptyBuffer(), true);
        for (let i = 0; i < 30; i++) s = appendLogs(s, [log(String(i))], 10);
        expect(s.pending).toHaveLength(10);
    });

    it('applies the cap when flushing', () => {
        let s = appendLogs(emptyBuffer(), [log('old')], 5);
        s = setPaused(s, true);
        for (let i = 0; i < 8; i++) s = appendLogs(s, [log(`p${i}`)], 5);
        s = setPaused(s, false, 5);
        expect(s.visible).toHaveLength(5);
        expect(s.visible[0].id).toBe('p7');
    });

    it('is a no-op when the state already matches', () => {
        const s = emptyBuffer();
        expect(setPaused(s, false)).toBe(s);
    });
});

describe('clearLogs', () => {
    it('clears pending as well as visible', () => {
        let s = appendLogs(emptyBuffer(), [log('a')]);
        s = setPaused(s, true);
        s = appendLogs(s, [log('b')]);
        const cleared = clearLogs(s);
        expect(cleared.visible).toEqual([]);
        expect(cleared.pending).toEqual([]);
        // Clearing must not secretly resume — the pause control would lie.
        expect(cleared.paused).toBe(true);
    });
});

describe('normaliseLevel', () => {
    it('maps the SDK spellings onto the four levels', () => {
        expect(normaliseLevel('warn')).toBe('warning');
        expect(normaliseLevel('WARNING')).toBe('warning');
        expect(normaliseLevel('err')).toBe('error');
        expect(normaliseLevel('fatal')).toBe('error');
        expect(normaliseLevel('trace')).toBe('debug');
    });

    it('lands anything unknown on info rather than dropping it', () => {
        // An unrecognised level must never make a log vanish from a filtered view.
        for (const v of ['log', 'verbose', '', null, undefined, 42, {}]) {
            expect(normaliseLevel(v)).toBe('info');
        }
    });
});

describe('formatLogLine', () => {
    it('includes the app name, the source and the stack when present', () => {
        const line = formatLogLine(log('a', { appName: 'shop', source: 'cart.js:12', stack: 'at foo()' }));
        expect(line).toContain('[shop]');
        expect(line).toContain('(cart.js:12)');
        expect(line).toContain('at foo()');
    });

    it('omits the app name cleanly when absent', () => {
        expect(formatLogLine(log('a'))).not.toContain('[]');
    });
});
