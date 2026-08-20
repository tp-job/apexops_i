/**
 * Rich-text document model — the pure half of the note editor.
 *
 * A rich note stores a TipTap (ProseMirror) document in `Note.contentRich` and a
 * **plain-text projection** of that same document in `Note.content`. That split is
 * the whole design, and it exists because `content` already has readers that treat
 * it as text — the note-card previews and the search haystack (`matchesQuery`) in
 * `pages/NotesCalendar.tsx`. Storing markup in `content` would put `<p>` into
 * search results and card previews on the day it shipped.
 *
 * So: `contentRich` is what the editor loads, `content` is what everything else
 * reads, and `richDocToPlainText` is the one function that keeps them agreeing.
 *
 * Nothing here imports TipTap. The document is walked as plain JSON, so this file
 * stays testable and the editor bundle stays out of code that only needs the text.
 */

/**
 * Ceiling on a serialised document, mirroring `RICH_TEXT_MAX_BYTES` in
 * `app/server/src/schemas/note.schema.ts`.
 *
 * Checked on the client too, so an oversized paste is refused *before* the
 * request with a message about the document, rather than after it as a 400 about
 * a field name.
 */
export const RICH_TEXT_MAX_BYTES = 256 * 1024;

/**
 * Node types that end a line of text when flattened.
 *
 * Only nodes that hold *text* directly. `listItem`, `blockquote` and `tableRow`
 * are containers of paragraphs, so their children already end the line — listing
 * them here too would flush twice and open a blank line between every bullet.
 */
const BLOCK_NODES = new Set(['paragraph', 'heading', 'codeBlock', 'horizontalRule']);

interface RichNode {
    type?: string;
    text?: string;
    content?: RichNode[];
    attrs?: Record<string, unknown>;
}

const isNode = (v: unknown): v is RichNode => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Flattens a document to the text a human would read.
 *
 * Images contribute their alt text and nothing else — an image-only note should
 * still be findable by whatever it was called, and should not project a bare
 * URL into a card preview.
 */
export function richDocToPlainText(doc: unknown): string {
    if (!isNode(doc)) return '';

    const lines: string[] = [];
    let current = '';

    const flush = () => {
        lines.push(current.trim());
        current = '';
    };

    const walk = (node: RichNode) => {
        if (typeof node.text === 'string') {
            current += node.text;
            return;
        }
        if (node.type === 'image') {
            const alt = node.attrs?.alt;
            if (typeof alt === 'string' && alt.trim()) current += alt.trim();
            return;
        }
        if (node.type === 'hardBreak') {
            flush();
            return;
        }

        (node.content ?? []).forEach((child) => isNode(child) && walk(child));

        if (node.type && BLOCK_NODES.has(node.type)) flush();
    };

    walk(doc);
    if (current.trim()) flush();

    // Collapse the runs of blank lines that empty paragraphs leave behind, but
    // keep single blank lines — they are the paragraph breaks the user typed.
    return lines
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/** A document with no text and no images — i.e. nothing worth persisting. */
export function isEmptyRichDoc(doc: unknown): boolean {
    if (!isNode(doc)) return true;
    if (richDocToPlainText(doc)) return false;

    let hasAtom = false;
    const walk = (node: RichNode) => {
        if (hasAtom) return;
        if (node.type === 'image' || node.type === 'horizontalRule') { hasAtom = true; return; }
        (node.content ?? []).forEach((child) => isNode(child) && walk(child));
    };
    walk(doc);
    return !hasAtom;
}

/**
 * Key-order-independent serialisation.
 *
 * Verified against the dev database: a document stored in a `jsonb` column comes
 * back with its object keys reordered — `{type,text}` in, `{text,type}` out. The
 * values are identical, so a plain `JSON.stringify` comparison reports a change
 * on *every* save round-trip. The editor uses that comparison to decide whether
 * an incoming document is its own echo, so without canonical ordering the caret
 * would jump to the top of the document every time an autosave landed.
 */
function canonical(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') {
        return Object.keys(value as Record<string, unknown>)
            .sort()
            .reduce<Record<string, unknown>>((acc, key) => {
                acc[key] = canonical((value as Record<string, unknown>)[key]);
                return acc;
            }, {});
    }
    return value;
}

/** A stable fingerprint of a document — equal strings mean equal documents. */
export const richDocKey = (doc: unknown): string => JSON.stringify(canonical(doc ?? null));

/** True when two documents carry the same content, whatever order the keys are in. */
export const sameRichDoc = (a: unknown, b: unknown): boolean => richDocKey(a) === richDocKey(b);

/** Serialised size in bytes, or `Infinity` for anything unserialisable. */
export function richDocBytes(doc: unknown): number {
    try {
        return new TextEncoder().encode(JSON.stringify(doc ?? null)).length;
    } catch {
        return Number.POSITIVE_INFINITY;
    }
}

export const isRichDocTooLarge = (doc: unknown): boolean => richDocBytes(doc) > RICH_TEXT_MAX_BYTES;

/**
 * Wraps plain text as a minimal document.
 *
 * Every note written before rich text existed has `contentRich: null`, and this
 * is how one opens in the editor with its text intact instead of blank. Blank
 * lines become paragraph breaks, which is what they already looked like.
 */
export function plainTextToRichDoc(text: string): Record<string, unknown> {
    const paragraphs = text.split(/\n/);
    return {
        type: 'doc',
        content: paragraphs.map((line) =>
            line.trim()
                ? { type: 'paragraph', content: [{ type: 'text', text: line }] }
                : { type: 'paragraph' },
        ),
    };
}

/** The empty document TipTap itself produces, for comparing "did anything change". */
export const EMPTY_RICH_DOC: Record<string, unknown> = { type: 'doc', content: [{ type: 'paragraph' }] };

// ── Toolbar vocabularies ─────────────────────────────────────

/**
 * The font menu.
 *
 * A fixed list, not a free-text field, because a font the app does not load
 * renders as whatever the OS substitutes — the document then looks different on
 * every machine and nobody can tell why. These are the stacks the design system
 * already ships; `''` means "inherit", which is the correct default rather than
 * pinning body text to a name.
 */
export const FONT_FAMILIES: Array<{ value: string; label: string }> = [
    { value: '', label: 'Default' },
    { value: 'var(--font-body)', label: 'Inter' },
    { value: 'var(--font-heading)', label: 'DM Sans' },
    { value: 'Georgia, "Times New Roman", serif', label: 'Serif' },
    { value: 'var(--font-mono)', label: 'Mono' },
];

/**
 * The size menu — a scale, not a px spinner.
 *
 * Arbitrary sizes are how a document ends up with 13px, 14px and 15px text that
 * nobody chose deliberately. `''` inherits the prose styles.
 */
export const FONT_SIZES: Array<{ value: string; label: string }> = [
    { value: '', label: 'Default' },
    { value: '12px', label: '12' },
    { value: '14px', label: '14' },
    { value: '16px', label: '16' },
    { value: '18px', label: '18' },
    { value: '24px', label: '24' },
    { value: '32px', label: '32' },
];

/**
 * The colour swatches.
 *
 * Named CSS custom properties rather than a free hex picker: the design system
 * owns colour, and a picker is how a document acquires a red that is not
 * `--color-global-red` and fails contrast in dark mode. `''` clears the mark and
 * returns the run to the prose colour, which is the only value that is correct in
 * both themes by construction.
 */
export const TEXT_COLORS: Array<{ value: string; label: string }> = [
    { value: '', label: 'Default' },
    { value: 'var(--color-global-red)', label: 'Red' },
    { value: 'var(--color-global-yellow)', label: 'Amber' },
    { value: 'var(--color-global-green)', label: 'Green' },
    { value: 'var(--color-global-blue)', label: 'Blue' },
    { value: 'var(--color-brand-steel)', label: 'Steel' },
];

// ── URL safety ───────────────────────────────────────────────

/**
 * Allowlist for an image `src` typed into the editor.
 *
 * Stricter than the link allowlist on purpose. `data:` is refused even though a
 * browser would render it: a pasted data URI is how one photo consumes the whole
 * 256 KB document budget, and the failure would arrive as a rejected save with no
 * obvious cause. Relative paths are refused too — this app serves no user images,
 * so a relative image src is a typo, not a feature.
 */
export function sanitizeImageSrc(raw: string): string | null {
    const src = raw.trim();
    if (!src) return null;

    // Control characters are stripped before the scheme is read, exactly as
    // sanitizeHref does: `java<TAB>script:` is a live scheme to a browser and an
    // unrecognised one to a check that reads the raw string.
    const cleaned = Array.from(src).filter((ch) => ch.charCodeAt(0) > 0x20).join('');
    const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(cleaned);
    if (!scheme) return null;

    const protocol = scheme[1].toLowerCase();
    return protocol === 'http' || protocol === 'https' ? cleaned : null;
}

// ── Legacy HTML notes (G3 · D4) ──────────────────────────────

/**
 * Notes written before the 2026-07-24 UI reset stored **HTML** in `Note.content`
 * — the column this file's header calls "always plain". Those rows still exist,
 * they have no `contentRich`, and left alone they do two visible kinds of damage:
 * the card preview prints `<p>` and `&nbsp;` at the reader, and the editor loads
 * the markup as literal text, so the first save freezes it as the note's real
 * content forever.
 *
 * Everything below converts such content on the way *out* of the database. No row
 * is rewritten; a note normalises itself the next time it is saved, because
 * saving already writes both projections. See `notes-calendar.md` D4 for why a
 * bulk migration was rejected.
 */

/** Tags the pre-reset editor actually emitted. Used to recognise its output. */
const LEGACY_TAG = 'p|div|br|h[1-6]|ul|ol|li|blockquote|pre|code|strong|b|em|i|u|s|del|span|a|img|font';

/**
 * Does this look like markup rather than prose?
 *
 * Deliberately narrow. A note that says `a < b and c > d` is prose and must not
 * be run through the converter, so a bare angle bracket is not enough — it takes
 * a **known tag** or a character entity.
 */
export function looksLikeLegacyHtml(text: string | null | undefined): boolean {
    if (!text) return false;
    return (
        // No whitespace between `<` and the tag name, because HTML does not allow
        // it either. Permitting it made `a < b and c > d` match as a `<b>` tag —
        // prose being mistaken for markup, which is the one false positive that
        // would rewrite someone's words.
        new RegExp(`</?(${LEGACY_TAG})(\\s[^>]*)?/?>`, 'i').test(text) ||
        /&(nbsp|amp|lt|gt|quot|#\d+|#x[0-9a-fA-F]+);/i.test(text)
    );
}

const ENTITIES: Record<string, string> = {
    nbsp: '\u00a0',
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
};

/** Decodes the entity set the old editor produced, plus any numeric reference. */
function decodeEntities(text: string): string {
    return text.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (whole, name: string) => {
        const key = name.toLowerCase();
        if (ENTITIES[key] !== undefined) return ENTITIES[key];
        if (key.startsWith('#x')) {
            const code = Number.parseInt(key.slice(2), 16);
            return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
        }
        if (key.startsWith('#')) {
            const code = Number.parseInt(key.slice(1), 10);
            return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
        }
        // Unknown entity: left exactly as written. Guessing would silently alter
        // the user's words, which is worse than an unfamiliar `&thing;`.
        return whole;
    });
}

/**
 * Removes tag-shaped fragments the tokeniser could not consume.
 *
 * Written because a test caught it: `'<p unclosed'` — a `<` and a tag name with
 * no closing `>` — never matches the tokeniser and so flowed straight through as
 * *visible markup*, which is the one thing this converter must never do. The
 * tokeniser handles well-formed tags; this handles the rest.
 */
function stripResidualMarkup(text: string): string {
    return text
        // A complete tag the tokeniser skipped (it only starts on a letter).
        .replace(/<[/!?][^>]*>/g, '')
        // A tag left open at the end of the input, with nothing to close it.
        .replace(/<\s*\/?\s*[a-zA-Z][^<>]*$/, '');
}

/** Inline marks worth carrying across. Anything else becomes ordinary text. */
const MARK_FOR_TAG: Record<string, string> = {
    strong: 'bold',
    b: 'bold',
    em: 'italic',
    i: 'italic',
    u: 'underline',
    s: 'strike',
    strike: 'strike',
    del: 'strike',
    code: 'code',
};

interface LegacyRun {
    text: string;
    marks: string[];
    href?: string;
}

interface PendingBlock {
    kind: 'paragraph' | 'heading' | 'listItem' | 'quote' | 'code';
    level?: number;
    list?: 'bullet' | 'ordered';
    runs: LegacyRun[];
}

const BLOCK_TAG = /^(p|div|h[1-6]|li|blockquote|pre)$/;

/**
 * HTML → TipTap document, without a DOM.
 *
 * `vitest.config.ts` runs `environment: 'node'` on purpose, and the failure modes
 * of this function are the whole reason it exists, so it has to be testable
 * there. It is a tokeniser, not an HTML engine: it understands the block and
 * inline tags the old editor emitted and **treats everything else as text it must
 * not lose**. Unparseable input degrades to stripped prose — never to visible
 * markup.
 */
export function legacyHtmlToRichDoc(html: string): Record<string, unknown> {
    const blocks: PendingBlock[] = [];
    const marks: string[] = [];
    let href: string | null = null;
    let listKind: 'bullet' | 'ordered' | null = null;
    let current: PendingBlock | null = null;

    const startBlock = (kind: PendingBlock['kind'], level?: number) => {
        current = {
            kind,
            level,
            list: kind === 'listItem' ? (listKind ?? 'bullet') : undefined,
            runs: [],
        };
    };
    const endBlock = () => {
        if (current && current.runs.some((r) => r.text.trim())) blocks.push(current);
        current = null;
    };
    const pushText = (raw: string) => {
        const text = decodeEntities(stripResidualMarkup(raw));
        if (!text) return;
        if (!current) startBlock('paragraph');
        current!.runs.push({ text, marks: [...marks], ...(href ? { href } : {}) });
    };

    // Script and style hold code, not prose: their bodies go, not just their tags.
    const source = html.replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, '');

    const token = /<\s*(\/)?\s*([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g;
    let cursor = 0;
    let match: RegExpExecArray | null = token.exec(source);

    while (match !== null) {
        pushText(source.slice(cursor, match.index));
        cursor = token.lastIndex;

        const closing = !!match[1];
        const tag = match[2].toLowerCase();
        const attrs = match[3] ?? '';

        if (tag === 'br') {
            // A line break inside a block, not a new block: the old editor used
            // <br> for both, and handling it here is what keeps `a<br>b` two lines.
            if (!current) startBlock('paragraph');
            current!.runs.push({ text: '\n', marks: [] });
        } else if (tag === 'img') {
            const alt =
                /alt\s*=\s*"([^"]*)"/i.exec(attrs)?.[1] ?? /alt\s*=\s*'([^']*)'/i.exec(attrs)?.[1] ?? '';
            // Alt text only, matching what `richDocToPlainText` already does with
            // images: a preview should never show a bare URL.
            if (alt) pushText(alt);
        } else if (tag === 'ul' || tag === 'ol') {
            endBlock();
            listKind = closing ? null : tag === 'ol' ? 'ordered' : 'bullet';
        } else if (BLOCK_TAG.test(tag)) {
            endBlock();
            if (!closing) {
                if (tag === 'li') startBlock('listItem');
                else if (tag === 'blockquote') startBlock('quote');
                else if (tag === 'pre') startBlock('code');
                else if (/^h[1-6]$/.test(tag)) startBlock('heading', Number(tag[1]));
                else startBlock('paragraph');
            }
        } else if (tag === 'a') {
            href = closing
                ? null
                : (/href\s*=\s*"([^"]*)"/i.exec(attrs)?.[1] ?? /href\s*=\s*'([^']*)'/i.exec(attrs)?.[1] ?? null);
        } else if (MARK_FOR_TAG[tag]) {
            const mark = MARK_FOR_TAG[tag];
            if (closing) {
                const at = marks.lastIndexOf(mark);
                if (at !== -1) marks.splice(at, 1);
            } else marks.push(mark);
        }
        // Any other tag (span, font, table…) contributes nothing itself, and its
        // text keeps flowing into the current block.

        match = token.exec(source);
    }
    pushText(source.slice(cursor));
    endBlock();

    if (!blocks.length) {
        // Nothing recognisable survived — fall back to stripped prose rather than
        // to an empty note. Losing the words would be the worse failure.
        const stripped = decodeEntities(html.replace(/<[^>]*>/g, ' '))
            .replace(/[ \t\u00a0]+/g, ' ')
            .trim();
        return plainTextToRichDoc(stripped);
    }

    return { type: 'doc', content: assembleLegacyBlocks(blocks) };
}

/** Turns the flat block list into TipTap's nesting: a run of `listItem` becomes one list. */
function assembleLegacyBlocks(blocks: PendingBlock[]): Record<string, unknown>[] {
    const out: Record<string, unknown>[] = [];
    let list: { type: string; content: Record<string, unknown>[] } | null = null;

    const closeList = () => {
        if (list) out.push(list as unknown as Record<string, unknown>);
        list = null;
    };

    for (const block of blocks) {
        const inline = legacyRunsToNodes(block.runs);

        if (block.kind === 'listItem') {
            const type = block.list === 'ordered' ? 'orderedList' : 'bulletList';
            if (!list || list.type !== type) {
                closeList();
                list = { type, content: [] };
            }
            list.content.push({ type: 'listItem', content: [{ type: 'paragraph', content: inline }] });
            continue;
        }

        closeList();
        if (block.kind === 'heading') {
            out.push({
                type: 'heading',
                attrs: { level: Math.min(6, Math.max(1, block.level ?? 1)) },
                content: inline,
            });
        } else if (block.kind === 'quote') {
            out.push({ type: 'blockquote', content: [{ type: 'paragraph', content: inline }] });
        } else if (block.kind === 'code') {
            // A code block holds text, never marks — bold inside `pre` is an
            // artefact of the old editor's rendering, not part of the code.
            out.push({
                type: 'codeBlock',
                content: [{ type: 'text', text: block.runs.map((r) => r.text).join('').trim() }],
            });
        } else {
            out.push({ type: 'paragraph', content: inline });
        }
    }
    closeList();
    return out;
}

function legacyRunsToNodes(runs: LegacyRun[]): Record<string, unknown>[] {
    const nodes: Record<string, unknown>[] = [];
    for (const run of runs) {
        // A run is split on newlines so `<br>` becomes a real hard break rather
        // than a literal newline inside one text node, which ProseMirror rejects.
        const pieces = run.text.split('\n');
        pieces.forEach((piece, i) => {
            if (i > 0) nodes.push({ type: 'hardBreak' });
            if (!piece) return;
            const marks = [
                ...run.marks.map((type) => ({ type })),
                ...(run.href ? [{ type: 'link', attrs: { href: run.href } }] : []),
            ];
            nodes.push(marks.length ? { type: 'text', text: piece, marks } : { type: 'text', text: piece });
        });
    }
    return nodes;
}

/**
 * The document to load into the editor for a note that has no `contentRich`.
 *
 * One function so every caller — the notes page, the daily page, anything later —
 * makes the same choice. A legacy HTML note opens as *formatted content*; a plain
 * note opens as paragraphs, exactly as before.
 */
export function legacyContentToRichDoc(content: string | null | undefined): Record<string, unknown> {
    if (!content) return { type: 'doc', content: [{ type: 'paragraph' }] };
    return looksLikeLegacyHtml(content) ? legacyHtmlToRichDoc(content) : plainTextToRichDoc(content);
}

/**
 * The text a preview, a calendar chip or the search haystack should read.
 *
 * Plain content passes straight through — this is not a sanitiser bolted onto
 * every render, it is the one place that knows a legacy row can hold markup.
 */
export function noteDisplayText(content: string | null | undefined): string {
    if (!content) return '';
    return looksLikeLegacyHtml(content) ? richDocToPlainText(legacyHtmlToRichDoc(content)) : content;
}
