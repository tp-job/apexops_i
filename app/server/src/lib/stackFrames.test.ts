import { describe, expect, it } from 'vitest';
import { basenameOf, isMappableUrl, parseStack } from './stackFrames';

/**
 * Stack frame parsing (spec E-D2).
 *
 * Named in Sprint 4's gap list as the first thing worth covering. It is the input
 * to symbolication, so a regression here does not throw — it returns raw frames
 * and reads to a user as *"source maps are broken"*, sending whoever investigates
 * to the wrong module entirely.
 *
 * The parser's most important promise is the quiet one: **a line it does not
 * recognise is kept verbatim**. A parser that drops what it cannot read would
 * silently delete frames from an incident stack.
 */

describe('parseStack', () => {
    it('parses a Chrome stack with named and anonymous frames', () => {
        const stack = [
            'TypeError: Cannot read properties of undefined',
            '    at computeTotal (https://cdn.test/assets/index-B1R05.js:1:740)',
            '    at https://cdn.test/assets/index-B1R05.js:1:889',
        ].join('\n');

        const frames = parseStack(stack);
        expect(frames).toHaveLength(3);

        expect(frames[0].isHeader).toBe(true);
        expect(frames[0].url).toBeNull();

        expect(frames[1]).toMatchObject({
            functionName: 'computeTotal',
            url: 'https://cdn.test/assets/index-B1R05.js',
            line: 1,
            column: 740,
        });

        // A bare frame has a location but no name — and must not inherit the
        // previous frame's.
        expect(frames[2].functionName).toBeNull();
        expect(frames[2].column).toBe(889);
    });

    it('strips async/new/get/set modifiers from the function name', () => {
        // `async` is not what the function is called.
        const frames = parseStack('    at async loadUser (https://a.test/x.js:5:6)');
        expect(frames[0].functionName).toBe('loadUser');
        expect(parseStack('    at new Widget (https://a.test/x.js:5:6)')[0].functionName).toBe('Widget');
    });

    it('parses Firefox and Safari frames', () => {
        const frames = parseStack('renderCart@https://a.test/main.js:5:11');
        expect(frames[0]).toMatchObject({
            functionName: 'renderCart',
            url: 'https://a.test/main.js',
            line: 5,
            column: 11,
        });
    });

    it('keeps an unrecognised line verbatim rather than dropping it', () => {
        // The promise that matters most: never lose a line of an incident stack.
        const stack = [
            'Error: boom',
            '    at fn (https://a.test/x.js:1:1)',
            '    --- some runtime noise we do not understand ---',
        ].join('\n');

        const frames = parseStack(stack);
        expect(frames).toHaveLength(3);
        expect(frames[2].raw).toContain('some runtime noise');
        expect(frames[2].url).toBeNull();
    });

    it('preserves line count so the stack can be reassembled unchanged', () => {
        const stack = 'Error: boom\n\n    at fn (https://a.test/x.js:1:1)\n';
        const frames = parseStack(stack);
        expect(frames).toHaveLength(stack.split('\n').length);
    });

    it('returns an empty array for nothing, rather than throwing', () => {
        expect(parseStack(null)).toEqual([]);
        expect(parseStack(undefined)).toEqual([]);
        expect(parseStack('')).toEqual([]);
    });

    it('treats an error name it has never seen as a header', () => {
        // The set of error names is open — every library defines its own — so
        // header detection must be by shape, not by a list of names.
        const frames = parseStack('SomeLibrarySpecificError: it broke\n    at fn (https://a.test/x.js:1:1)');
        expect(frames[0].isHeader).toBe(true);
        expect(frames[1].isHeader).toBe(false);
    });
});

describe('basenameOf', () => {
    it('reduces a URL to the filename so one upload works from any host', () => {
        // The same bundle is served from a CDN in prod, a subpath in staging and
        // localhost in dev. Matching on the full URL would mean re-uploading maps
        // per environment.
        expect(basenameOf('https://cdn.test/assets/index-B1R05.js')).toBe('index-B1R05.js');
        expect(basenameOf('/static/app.js')).toBe('app.js');
        expect(basenameOf('C:\\build\\app.js')).toBe('app.js');
    });

    it('strips cache-busting query strings and hashes', () => {
        expect(basenameOf('https://a.test/app.js?v=123')).toBe('app.js');
        expect(basenameOf('https://a.test/app.js#frag')).toBe('app.js');
    });

    it('handles null and trailing slashes', () => {
        expect(basenameOf(null)).toBeNull();
        expect(basenameOf('https://a.test/')).toBeNull();
    });
});

describe('isMappableUrl', () => {
    it('accepts real script URLs', () => {
        expect(isMappableUrl('https://cdn.test/assets/index.js')).toBe(true);
        expect(isMappableUrl('/static/app.mjs')).toBe(true);
    });

    it('rejects the ones that can never have an uploaded map', () => {
        // Trying to match these produces confusing near-misses in the resolution
        // summary rather than an honest "no map for this file".
        expect(isMappableUrl(null)).toBe(false);
        expect(isMappableUrl('data:text/javascript,alert(1)')).toBe(false);
        expect(isMappableUrl('blob:https://a.test/uuid')).toBe(false);
        expect(isMappableUrl('<anonymous>')).toBe(false);
        expect(isMappableUrl('native')).toBe(false);
    });
});
