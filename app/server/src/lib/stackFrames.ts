/**
 * Stack-string → structured frames.
 *
 * Deliberately tolerant. A stack is a **string produced by a browser we do not
 * control**, in a format nobody standardised, from an engine that may be three
 * years newer than this parser. The rule everywhere here is that an unrecognised
 * line is *kept verbatim as an unparsed frame*, never dropped and never thrown
 * on: losing a frame silently is worse than failing to symbolicate it, because
 * the developer reading the panel has no way to know something went missing.
 */

export interface ParsedFrame {
    /** The original line, always. What `view minified` and Copy hand back. */
    raw: string;
    /** Null for the header line, for anonymous frames, and for unparsed lines. */
    functionName: string | null;
    /** Full URL or path of the generated file. Null when the line did not parse. */
    url: string | null;
    /** 1-based, as browsers report it. */
    line: number | null;
    /** 0-based in V8's own reporting; `source-map` expects the same. */
    column: number | null;
    /** True for the `TypeError: ...` line, which is a message and not a frame. */
    isHeader: boolean;
}

/**
 * `    at fnName (https://host/assets/app.js:12:3456)`
 * `    at https://host/assets/app.js:12:3456`
 * `    at async fnName (…)` — the modifier is part of the captured name and
 *   stripped below, because `async` is not what the function is called.
 */
const CHROME_WITH_NAME = /^\s*at\s+(?:(?:async|new|get|set)\s+)?(.+?)\s+\((.+?):(\d+):(\d+)\)\s*$/;
const CHROME_BARE = /^\s*at\s+(.+?):(\d+):(\d+)\s*$/;

/** `fnName@https://host/assets/app.js:12:3456` — Firefox and Safari. */
const FIREFOX = /^\s*(.*?)@(.+?):(\d+):(\d+)\s*$/;

/**
 * A frame's file is matched to an uploaded map by **basename** (build-spec D3):
 * the same bundle is served from a CDN in production, a subpath in staging and
 * localhost in dev, and matching the full URL would mean re-uploading per host.
 *
 * Query strings and hashes are stripped — cache-busting suffixes are a property
 * of the deploy, not of the file the bundler emitted.
 */
export function basenameOf(url: string | null): string | null {
    if (!url) return null;
    const withoutQuery = url.split('?')[0].split('#')[0];
    const segments = withoutQuery.split(/[\\/]/);
    const last = segments[segments.length - 1];
    return last || null;
}

/**
 * Frames only make sense for real files. `<anonymous>`, `eval`, `native` and
 * `data:`/`blob:` URLs can never have an uploaded map, and trying to match them
 * just produces confusing near-misses in the resolution summary.
 */
export function isMappableUrl(url: string | null): boolean {
    if (!url) return false;
    if (url.startsWith('data:') || url.startsWith('blob:')) return false;
    if (url.includes('<anonymous>') || url === 'native') return false;
    return /\.[cm]?jsx?(\?|#|$)/i.test(url.split('?')[0].split('#')[0]) || url.includes('/');
}

export function parseStack(stack: string | null | undefined): ParsedFrame[] {
    if (!stack) return [];

    return stack.split('\n').map<ParsedFrame>((rawLine) => {
        const raw = rawLine.replace(/\s+$/, '');
        const base: ParsedFrame = {
            raw,
            functionName: null,
            url: null,
            line: null,
            column: null,
            isHeader: false,
        };

        // Blank separators keep their place so the reassembled stack matches the
        // original line for line.
        if (!raw.trim()) return base;

        // The header is any leading line that is not a frame — usually
        // `TypeError: Cannot read properties of undefined`. Detected by absence
        // of a frame shape rather than by matching error names, because the set
        // of error names is open (every library defines its own).
        const looksLikeFrame = /^\s*at\s/.test(raw) || /@.+:\d+:\d+\s*$/.test(raw);
        if (!looksLikeFrame) return { ...base, isHeader: true };

        const chromeNamed = CHROME_WITH_NAME.exec(raw);
        if (chromeNamed) {
            return {
                ...base,
                functionName: chromeNamed[1] || null,
                url: chromeNamed[2],
                line: Number(chromeNamed[3]),
                column: Number(chromeNamed[4]),
            };
        }

        const chromeBare = CHROME_BARE.exec(raw);
        if (chromeBare) {
            return {
                ...base,
                url: chromeBare[1],
                line: Number(chromeBare[2]),
                column: Number(chromeBare[3]),
            };
        }

        const firefox = FIREFOX.exec(raw);
        if (firefox) {
            return {
                ...base,
                functionName: firefox[1] || null,
                url: firefox[2],
                line: Number(firefox[3]),
                column: Number(firefox[4]),
            };
        }

        // Matched `looksLikeFrame` but not any concrete shape — an engine format
        // we do not know. Kept, not dropped.
        return base;
    });
}
