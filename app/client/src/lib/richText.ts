/**
 * Rich-text document model — the pure half of the note editor.
 *
 * A rich note stores a TipTap (ProseMirror) document in `Note.contentRich` and a
 * **plain-text projection** of that same document in `Note.content`. That split is
 * the whole design, and it exists because `content` already has four readers that
 * treat it as text — the note-card previews and the search haystacks in
 * `pages/NotesCalendar.tsx` and `components/ui/note/utils/index.ts`. Storing
 * markup in `content` would put `<p>` into search results and card previews on
 * the day it shipped.
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
