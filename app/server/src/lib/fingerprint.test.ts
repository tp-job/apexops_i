import { describe, expect, it } from 'vitest';
import type { FingerprintInput } from './fingerprint';
import { extractCulprit, extractTitle, fingerprintEvent, normalizeMessage } from './fingerprint';

/**
 * Event grouping (spec E-D2).
 *
 * This decides whether two errors are one issue, and both directions of failure
 * are silent:
 *
 * - **Too loose** and unrelated bugs merge into one row. The UI looks tidy and is
 *   lying; the second bug is invisible until someone reads the stack of an issue
 *   they thought they understood.
 * - **Too tight** and one render loop becomes 100,000 issues. That one at least
 *   announces itself, by making the product useless in an afternoon.
 *
 * Neither shows up in a typecheck, a build, or a manual click-through — which is
 * exactly why this is the suite that most needed to exist.
 */

// Typed as FingerprintInput rather than inferred: inferring from `stack: null`
// narrows it to `null`, so a test that passes a stack string stops compiling.
const base: FingerprintInput = { projectId: 1, level: 'error', message: 'boom', stack: null };
const fp = (over: Partial<FingerprintInput> = {}) => fingerprintEvent({ ...base, ...over }).fingerprint;

describe('normalizeMessage', () => {
    it('collapses the parts that vary per occurrence but not per bug', () => {
        // The canonical case: same bug, different user id.
        expect(normalizeMessage('User 4821 not found')).toBe(normalizeMessage('User 9134 not found'));
    });

    it('collapses uuids, timestamps, long hex and quoted literals', () => {
        expect(normalizeMessage('id 550e8400-e29b-41d4-a716-446655440000 missing'))
            .toBe(normalizeMessage('id 6ba7b810-9dad-11d1-80b4-00c04fd430c8 missing'));
        expect(normalizeMessage('failed at 2026-08-04T11:22:33.000Z'))
            .toBe(normalizeMessage('failed at 2026-01-01T00:00:00.000Z'));
        expect(normalizeMessage('req deadbeefdeadbeef01 failed'))
            .toBe(normalizeMessage('req cafebabecafebabe02 failed'));
        expect(normalizeMessage('cannot read "alice@example.com"'))
            .toBe(normalizeMessage('cannot read "bob@example.org"'));
    });

    it('drops query strings but keeps the path', () => {
        // Cache busters and tokens vary every request; the path is the bug site.
        expect(normalizeMessage('GET https://api.test/users?token=abc failed'))
            .toBe(normalizeMessage('GET https://api.test/users?token=xyz failed'));
        expect(normalizeMessage('GET https://api.test/users?t=1 failed'))
            .not.toBe(normalizeMessage('GET https://api.test/orders?t=1 failed'));
    });

    it('keeps genuinely different messages different', () => {
        expect(normalizeMessage('Cannot read property x of undefined'))
            .not.toBe(normalizeMessage('Network request failed'));
    });
});

describe('extractCulprit', () => {
    it('skips SDK frames so unrelated errors do not share a culprit', () => {
        // If the SDK's own frame won, EVERY captured error would group together —
        // the quiet, tidy-looking version of total failure.
        const stack = [
            'TypeError: x is not a function',
            '    at capture (https://cdn.test/sdk/v1.js:1:200)',
            '    at handler (https://app.test/main.js:42:9)',
        ].join('\n');
        expect(extractCulprit(stack)).toBe('main.js:42');
    });

    it('uses the basename so hashed asset names stay stable across deploys', () => {
        expect(extractCulprit('    at fn (https://cdn.test/assets/app.js:7:1)')).toBe('app.js:7');
        expect(extractCulprit('    at fn (https://other.test/x/y/app.js:7:1)')).toBe('app.js:7');
    });

    it('returns null rather than throwing for stacks it cannot read', () => {
        expect(extractCulprit(null)).toBeNull();
        expect(extractCulprit(undefined)).toBeNull();
        expect(extractCulprit('')).toBeNull();
        expect(extractCulprit('Error')).toBeNull();
        expect(extractCulprit('total gibberish with no frames')).toBeNull();
    });
});

describe('fingerprintEvent', () => {
    it('groups two occurrences of the same bug', () => {
        expect(fp({ message: 'User 1 not found' })).toBe(fp({ message: 'User 2 not found' }));
    });

    it('separates genuinely different bugs', () => {
        expect(fp({ message: 'Network request failed' }))
            .not.toBe(fp({ message: 'Cannot read property x of undefined' }));
    });

    it('separates projects, so one tenant never sees another tenant grouping', () => {
        expect(fp({ projectId: 1 })).not.toBe(fp({ projectId: 2 }));
    });

    it('separates levels', () => {
        expect(fp({ level: 'error' })).not.toBe(fp({ level: 'warning' }));
    });

    it('is not fooled by a separator that appears inside the message', () => {
        // The parts are joined on a literal NUL precisely so that a shifted
        // boundary cannot collide. If someone "tidies" that to a space or a pipe,
        // this is the test that catches it.
        expect(fp({ level: 'a b', message: 'c' })).not.toBe(fp({ level: 'a', message: 'b c' }));
        expect(fp({ level: 'a|b', message: 'c' })).not.toBe(fp({ level: 'a', message: 'b|c' }));
    });

    it('is stable across calls — no clock, no randomness, no key order', () => {
        // A fingerprint that varies per call turns the ingest upsert into an
        // insert, and one bug into one row per occurrence.
        const a = fingerprintEvent({ projectId: 7, level: 'error', message: 'same', stack: null });
        const b = fingerprintEvent({ level: 'error', projectId: 7, stack: null, message: 'same' });
        expect(a.fingerprint).toBe(b.fingerprint);
        expect(a.fingerprint).toMatch(/^[0-9a-f]{32}$/);
    });

    it('still produces a usable key with no stack and an empty message', () => {
        const grouped = fingerprintEvent({ projectId: 1, level: 'error', message: '', stack: null });
        expect(grouped.fingerprint).toMatch(/^[0-9a-f]{32}$/);
        expect(grouped.title).toBe('Unknown error');
        expect(grouped.culprit).toBeNull();
    });

    it('groups the same message from different sites separately', () => {
        // Same text, different place in the code: two bugs, not one.
        const atA = fp({ stack: '    at fn (https://app.test/a.js:1:1)' });
        const atB = fp({ stack: '    at fn (https://app.test/b.js:1:1)' });
        expect(atA).not.toBe(atB);
    });
});

describe('extractTitle', () => {
    it('takes the first line and caps the length', () => {
        expect(extractTitle('First line\nsecond line')).toBe('First line');
        expect(extractTitle('')).toBe('Unknown error');
    });

    it('truncates a long title to within the cap, with an ellipsis', () => {
        // Asserting the contract (never longer than 200, and visibly truncated)
        // rather than the arithmetic. The implementation slices to 197 and appends
        // a one-char ellipsis for 198 — pinning that exact number would make a
        // harmless change to the ellipsis look like a regression.
        const title = extractTitle('x'.repeat(500));
        expect(title.length).toBeLessThanOrEqual(200);
        expect(title.endsWith('…')).toBe(true);
    });
});
