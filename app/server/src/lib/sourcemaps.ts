import { SourceMapConsumer } from 'source-map';
import prisma from './prisma';
import { basenameOf, isMappableUrl, parseStack, type ParsedFrame } from './stackFrames';

/**
 * Symbolication — minified stack frame → original file, line, column, function.
 *
 * **This is the only module in the codebase permitted to select
 * `SourceMap.content`.** That column holds the customer's original source. No
 * endpoint returns it, and none may be added; what leaves this module is a
 * resolved *position* — a file path, a line, a column and a name. If you find
 * yourself needing the source text here, that is a v1.1 decision to take
 * consciously (see build-spec, "Out of scope"), not a select to widen quietly.
 *
 * Three properties, each load-bearing:
 *
 * - **Read time, not ingest time.** Maps routinely arrive *after* the first
 *   errors of a deploy, and ingest is the hot path. Resolving on read means a
 *   map uploaded later retroactively fixes events already stored.
 * - **Cached, with the memory actually released.** `SourceMapConsumer` in
 *   `source-map@0.7` holds WASM memory that garbage collection does not reclaim;
 *   a cache that drops references without calling `destroy()` is the leak every
 *   naive integration ships. Eviction destroys.
 * - **Fail open, always.** The issue detail is what people open *during an
 *   incident*. Every failure path here returns the raw frame — a corrupt map, an
 *   unknown stack format, a missing mapping. Making incident response depend on
 *   the health of an uploaded artifact would be a self-inflicted outage.
 */

export interface ResolvedFrame extends ParsedFrame {
    /** True only when a map produced a real original position for this frame. */
    resolved: boolean;
    /** Original source path from the map, e.g. `src/components/Cart.tsx`. */
    originalFile: string | null;
    originalLine: number | null;
    originalColumn: number | null;
    /** The original function name, when the map carries one. Often null. */
    originalFunction: string | null;
}

export interface SymbolicationResult {
    frames: ResolvedFrame[];
    /** True when at least one frame resolved — what the UI's toggle keys off. */
    applied: boolean;
    /** The release the frames were resolved against; null when the event had none. */
    release: string | null;
    /** How many uploaded maps were consulted for this stack. */
    mapsUsed: number;
    resolvedCount: number;
    frameCount: number;
    /**
     * Why nothing happened, when nothing happened. Shown to the user, so it must
     * name the fix rather than the mechanism.
     */
    reason:
        | 'ok'
        | 'no-stack'
        | 'no-release'
        | 'no-maps-for-release'
        | 'no-matching-file'
        | 'no-mappings-hit';
}

// ── consumer cache ───────────────────────────────────────────

/**
 * Small on purpose. Entries are parsed maps of multi-megabyte files; the working
 * set during an incident is one release of one project, which is a handful of
 * bundles. A large cache here buys nothing and holds a lot of WASM memory.
 */
const CACHE_MAX = 8;

interface CacheEntry {
    consumer: SourceMapConsumer;
    /** Row id, so a re-upload (new row content, same key) is not served stale. */
    updatedAt: number;
}

const cache = new Map<number, CacheEntry>();

/** Insertion-order LRU: `Map` preserves it, so the first key is the coldest. */
function remember(id: number, entry: CacheEntry): void {
    if (cache.size >= CACHE_MAX) {
        const coldest = cache.keys().next();
        if (!coldest.done) {
            const evicted = cache.get(coldest.value);
            cache.delete(coldest.value);
            // The whole reason the cache is bounded. Dropping the reference
            // without this leaks the consumer's WASM heap for the process
            // lifetime.
            evicted?.consumer.destroy();
        }
    }
    cache.set(id, entry);
}

function touch(id: number): CacheEntry | undefined {
    const hit = cache.get(id);
    if (!hit) return undefined;
    // Re-insert so it becomes the newest key.
    cache.delete(id);
    cache.set(id, hit);
    return hit;
}

/** Drops a specific map — called when one is deleted or overwritten. */
export function invalidateSourceMap(id: number): void {
    const entry = cache.get(id);
    if (!entry) return;
    cache.delete(id);
    entry.consumer.destroy();
}

/** Test/shutdown seam. Destroys every consumer the process is holding. */
export function clearSourceMapCache(): void {
    cache.forEach((e) => e.consumer.destroy());
    cache.clear();
}

async function consumerFor(row: {
    id: number;
    content: string;
    updatedAt: Date;
}): Promise<SourceMapConsumer | null> {
    const cached = touch(row.id);
    // The id is stable across a re-upload (the row is updated in place), so the
    // timestamp is what tells a stale consumer from a live one.
    if (cached && cached.updatedAt === row.updatedAt.getTime()) return cached.consumer;
    if (cached) invalidateSourceMap(row.id);

    try {
        const consumer = await new SourceMapConsumer(JSON.parse(row.content));
        remember(row.id, { consumer, updatedAt: row.updatedAt.getTime() });
        return consumer;
    } catch (err) {
        // A map that got past upload validation and still will not parse. Log it
        // — someone should fix their build — but do not fail the read.
        console.error(`Source map ${row.id} could not be parsed:`, err);
        return null;
    }
}

// ── the entry point ──────────────────────────────────────────

const passthrough = (
    frames: ParsedFrame[],
    release: string | null,
    reason: SymbolicationResult['reason']
): SymbolicationResult => ({
    frames: frames.map((f) => ({
        ...f,
        resolved: false,
        originalFile: null,
        originalLine: null,
        originalColumn: null,
        originalFunction: null,
    })),
    applied: false,
    release,
    mapsUsed: 0,
    resolvedCount: 0,
    frameCount: frames.filter((f) => !f.isHeader && f.url).length,
    reason,
});

/**
 * Resolve one stack against the maps uploaded for its project and release.
 *
 * Never throws. Never returns fewer frames than it was given.
 */
export async function symbolicate(
    projectId: number,
    release: string | null,
    stack: string | null
): Promise<SymbolicationResult> {
    const frames = parseStack(stack);
    if (!frames.length) return passthrough(frames, release, 'no-stack');

    // Without a release there is nothing to match against. This is the common
    // "why isn't this working" case, so it gets its own reason rather than being
    // folded into "no maps".
    if (!release) return passthrough(frames, release, 'no-release');

    // Only the basenames this stack actually mentions — a project may have
    // dozens of maps per release and this stack touches two of them.
    const wanted = new Set(
        frames
            .filter((f) => isMappableUrl(f.url))
            .map((f) => basenameOf(f.url))
            .filter((b): b is string => !!b)
    );
    if (!wanted.size) return passthrough(frames, release, 'no-matching-file');

    let rows: { id: number; fileName: string; content: string; updatedAt: Date }[];
    try {
        rows = await prisma.sourceMap.findMany({
            where: { projectId, release, fileName: { in: [...wanted] } },
            // `content` — the one permitted select in the codebase. See the
            // module header before adding another.
            select: { id: true, fileName: true, content: true, updatedAt: true },
        });
    } catch (err) {
        console.error('Source map lookup failed:', err);
        return passthrough(frames, release, 'no-maps-for-release');
    }

    if (!rows.length) {
        // Distinguish "this release has no maps at all" from "it has maps, none
        // for these files" — they have different fixes (upload vs. check the
        // file names), and a single vague message would send people to the wrong
        // one.
        const anyForRelease = await prisma.sourceMap
            .count({ where: { projectId, release } })
            .catch(() => 0);
        return passthrough(
            frames,
            release,
            anyForRelease ? 'no-matching-file' : 'no-maps-for-release'
        );
    }

    const byFile = new Map(rows.map((r) => [r.fileName, r]));
    const consumers = new Map<string, SourceMapConsumer | null>();

    const resolved: ResolvedFrame[] = [];
    let resolvedCount = 0;

    for (const frame of frames) {
        const blank: ResolvedFrame = {
            ...frame,
            resolved: false,
            originalFile: null,
            originalLine: null,
            originalColumn: null,
            originalFunction: null,
        };

        if (frame.isHeader || !isMappableUrl(frame.url) || frame.line === null || frame.column === null) {
            resolved.push(blank);
            continue;
        }

        const file = basenameOf(frame.url);
        const row = file ? byFile.get(file) : undefined;
        if (!row) {
            resolved.push(blank);
            continue;
        }

        if (!consumers.has(row.fileName)) {
            consumers.set(row.fileName, await consumerFor(row));
        }
        const consumer = consumers.get(row.fileName);
        if (!consumer) {
            resolved.push(blank);
            continue;
        }

        try {
            const original = consumer.originalPositionFor({
                line: frame.line,
                column: frame.column,
            });
            if (original.source && original.line !== null) {
                resolvedCount += 1;
                resolved.push({
                    ...blank,
                    resolved: true,
                    originalFile: original.source,
                    originalLine: original.line,
                    originalColumn: original.column ?? null,
                    // Falls back to the minified name: `Bt` is worse than
                    // `handleSubmit` but far better than nothing, and plenty of
                    // maps carry no names array at all.
                    originalFunction: original.name ?? frame.functionName,
                });
                continue;
            }
        } catch (err) {
            console.error('Frame resolution failed:', err);
        }

        // A real map that simply has no entry for this position — minifiers do
        // not emit a mapping for every byte. Its neighbours may still resolve.
        resolved.push(blank);
    }

    return {
        frames: resolved,
        applied: resolvedCount > 0,
        release,
        mapsUsed: rows.length,
        resolvedCount,
        frameCount: frames.filter((f) => !f.isHeader && f.url).length,
        reason: resolvedCount > 0 ? 'ok' : 'no-mappings-hit',
    };
}
