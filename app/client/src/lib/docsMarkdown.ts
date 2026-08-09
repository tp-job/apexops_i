/**
 * The `/docs` content format: Markdown plus container directives (spec S9-D1).
 *
 * **Why not plain Markdown.** `Callout`, `Endpoint` and `Table` carry most of
 * what makes the SDK and Quickstart pages readable, and losing them would be a
 * visible downgrade shipped alongside a feature meant to be an improvement. So
 * the dialect adds directives that map onto the primitives that already exist —
 * one rendering path (`DocsPrimitives`), not a second look-alike.
 *
 * **Why not a Markdown library.** Every mainstream one produces an HTML string,
 * and the only way to get an HTML string onto the page is
 * `dangerouslySetInnerHTML`. `/docs` is public and unauthenticated on purpose,
 * so that would turn one compromised admin account into stored XSS on the most
 * public page in the product (S9-D4). This parser produces a *typed tree* that
 * the renderer turns into React elements; there is no HTML string anywhere in
 * the path, which is what makes escaping structural rather than a step someone
 * can forget.
 *
 * Everything here is pure and synchronous so the whole format is unit-testable
 * without a browser — see `docsMarkdown.test.ts`.
 */

export type Inline =
    | { type: 'text'; value: string }
    | { type: 'code'; value: string }
    | { type: 'strong'; children: Inline[] }
    | { type: 'em'; children: Inline[] }
    /** `href: null` means the scheme was refused — the text still renders. */
    | { type: 'link'; href: string | null; children: Inline[] }
    | { type: 'endpoint'; method: string; path: string };

export interface TableColumn {
    header: string;
    /** Optional Tailwind width class, written as `| Attribute {w-44} |`. */
    width?: string;
}

export type Block =
    | { type: 'paragraph'; children: Inline[] }
    | { type: 'list'; ordered: boolean; items: Inline[][] }
    | { type: 'code'; lang?: string; value: string }
    | { type: 'table'; columns: TableColumn[]; rows: Inline[][][] }
    | { type: 'callout'; tone: 'info' | 'warn'; title?: string; children: Block[] }
    | { type: 'endpoint'; method: string; path: string };

export interface DocHeading {
    id: string;
    title: string;
    /** 3 renders as a nested entry in the "On this page" rail. */
    level: 2 | 3;
}

export interface DocSectionNode extends DocHeading {
    blocks: Block[];
}

export interface ParsedDoc {
    /** Blocks before the first heading. Rendered as the page lead. */
    intro: Block[];
    sections: DocSectionNode[];
}

// ── Links ────────────────────────────────────────────────────

/**
 * The href allowlist (S9-D4).
 *
 * `javascript:` is the whole reason this exists, but an allowlist is used rather
 * than a `javascript:`-blocklist because the blocklist has to be right about
 * every scheme that will ever exist (`data:`, `vbscript:`, and whatever a
 * browser ships next), while the allowlist only has to be right about the four
 * we actually use.
 *
 * Returns `null` for a refused href; the link text is still rendered, so a bad
 * href degrades to plain text rather than to a blank page.
 */
export function sanitizeHref(raw: string): string | null {
    const href = raw.trim();
    if (!href) return null;

    // Same-origin relative paths and in-page anchors. `//evil.com` is
    // protocol-relative — it leaves the origin — so a second slash disqualifies.
    if (href.startsWith('#')) return href;
    if (href.startsWith('/')) return href.startsWith('//') ? null : href;

    // Control characters are stripped before the scheme is read: `java\tscript:`
    // and `java\nscript:` are both live links in some parsers for exactly this
    // reason — the browser ignores them, a naive `startsWith` check does not.
    // Matching control characters is the entire point here: they are what a
    // `java<TAB>script:` href uses to slip past a check that reads the raw string,
    // and the rule cannot tell that apart from a typo.
    // eslint-disable-next-line no-control-regex
    const cleaned = href.replace(/[\u0000-\u0020]/g, '');
    const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(cleaned);
    if (!scheme) return cleaned.includes(':') ? null : href; // bare relative, e.g. `docs/sdk`

    const protocol = scheme[1].toLowerCase();
    // The CLEANED value is returned: a browser strips those characters before it
    // resolves the scheme, so handing back the original would return the very
    // string this check exists to neutralize.
    return protocol === 'http' || protocol === 'https' || protocol === 'mailto' ? cleaned : null;
}

// ── Headings ─────────────────────────────────────────────────

/**
 * Anchor id from heading text (S9-D2).
 *
 * The TOC is derived, never stored, so this is the only place an anchor comes
 * from and the rail and the heading cannot disagree. Ids are deduplicated
 * because two `### Limits` on one page would otherwise both answer to
 * `#limits` and the second would be unreachable.
 */
export function slugifyHeading(text: string): string {
    const base = text
        .toLowerCase()
        .replace(/[`*_[\]()]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return base || 'section';
}

// ── Inline ───────────────────────────────────────────────────

/**
 * Order matters: code spans are matched first so that `` `**not bold**` ``
 * inside a snippet stays literal. Everything unmatched falls through as text,
 * which is what makes `<img src=x onerror=alert(1)>` a string rather than an
 * element — the renderer has no path that turns a text node into markup.
 */
const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]*\]\([^)\s]*\))|(:endpoint\[[^\]]+\])/;

export function parseInline(source: string): Inline[] {
    const out: Inline[] = [];
    let rest = source;

    while (rest) {
        const match = INLINE.exec(rest);
        if (!match || match.index === undefined) break;

        if (match.index > 0) out.push({ type: 'text', value: rest.slice(0, match.index) });
        const token = match[0];

        if (token.startsWith('`')) {
            out.push({ type: 'code', value: token.slice(1, -1) });
        } else if (token.startsWith('**')) {
            out.push({ type: 'strong', children: parseInline(token.slice(2, -2)) });
        } else if (token.startsWith(':endpoint[')) {
            const [method, ...pathParts] = token.slice(10, -1).trim().split(/\s+/);
            out.push({ type: 'endpoint', method: method.toUpperCase(), path: pathParts.join(' ') });
        } else if (token.startsWith('[')) {
            const split = token.indexOf('](');
            out.push({
                type: 'link',
                href: sanitizeHref(token.slice(split + 2, -1)),
                children: parseInline(token.slice(1, split)),
            });
        } else {
            out.push({ type: 'em', children: parseInline(token.slice(1, -1)) });
        }

        rest = rest.slice(match.index + token.length);
    }

    if (rest) out.push({ type: 'text', value: rest });
    return out;
}

// ── Directives ───────────────────────────────────────────────

/** `{tone=warn title="Two failure modes"}` → `{ tone: 'warn', title: '…' }`. */
function parseAttrs(raw: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const pattern = /([a-zA-Z][\w-]*)=(?:"([^"]*)"|'([^']*)'|([^\s}]+))/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(raw)) !== null) {
        attrs[match[1]] = match[2] ?? match[3] ?? match[4] ?? '';
    }
    return attrs;
}

// ── Tables ───────────────────────────────────────────────────

const isTableRow = (line: string): boolean => line.trimStart().startsWith('|');
const isTableRule = (line: string): boolean => /^\s*\|[\s:|-]+\|\s*$/.test(line) && line.includes('-');

/** Splits on `|` but not on an escaped `\|`, so a cell can contain a pipe. */
function splitRow(line: string): string[] {
    const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
    return trimmed
        .split(/(?<!\\)\|/)
        .map((cell) => cell.trim().replace(/\\\|/g, '|'));
}

function parseHeaderCell(cell: string): TableColumn {
    const width = /\{([^}]+)\}\s*$/.exec(cell);
    return width
        ? { header: cell.slice(0, width.index).trim(), width: width[1].trim() }
        : { header: cell };
}

// ── Blocks ───────────────────────────────────────────────────

const BULLET = /^\s*[-*]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;

function parseBlocks(lines: string[]): Block[] {
    const blocks: Block[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        if (!line.trim()) { i += 1; continue; }

        // Fenced code. The closing fence is optional at end-of-input: an
        // unterminated fence is a bad edit, and swallowing the rest of the page
        // as a code block is a better failure than throwing on a public route.
        const fence = /^\s*```(\S*)\s*$/.exec(line);
        if (fence) {
            const body: string[] = [];
            i += 1;
            while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) { body.push(lines[i]); i += 1; }
            i += 1;
            blocks.push({ type: 'code', lang: fence[1] || undefined, value: body.join('\n') });
            continue;
        }

        // Directives. `:::name{attrs}` opens a container closed by `:::`;
        // a leaf directive (endpoint) is one line.
        const directive = /^\s*:::([a-zA-Z][\w-]*)\s*(\{[^}]*\})?\s*$/.exec(line);
        if (directive) {
            const name = directive[1].toLowerCase();
            const attrs = parseAttrs(directive[2] ?? '');

            if (name === 'endpoint') {
                blocks.push({
                    type: 'endpoint',
                    method: (attrs.method ?? 'GET').toUpperCase(),
                    path: attrs.path ?? '',
                });
                i += 1;
                continue;
            }

            if (name === 'callout') {
                const body: string[] = [];
                i += 1;
                while (i < lines.length && !/^\s*:::\s*$/.test(lines[i])) { body.push(lines[i]); i += 1; }
                i += 1;
                blocks.push({
                    type: 'callout',
                    tone: attrs.tone === 'warn' ? 'warn' : 'info',
                    title: attrs.title || undefined,
                    children: parseBlocks(body),
                });
                continue;
            }

            // Unknown directive: fall through to the paragraph path below, which
            // renders the line as literal text. One typo must not blank a page.
        }

        // Table: a `|` row followed by a `|---|` rule. Without the rule it is
        // just a paragraph that happens to start with a pipe.
        if (isTableRow(line) && i + 1 < lines.length && isTableRule(lines[i + 1])) {
            const columns = splitRow(line).map(parseHeaderCell);
            i += 2;
            const rows: Inline[][][] = [];
            while (i < lines.length && isTableRow(lines[i])) {
                rows.push(splitRow(lines[i]).map(parseInline));
                i += 1;
            }
            blocks.push({ type: 'table', columns, rows });
            continue;
        }

        // Lists. A blank line ends one; a run of same-kind markers continues it.
        const listMatch = BULLET.exec(line) ?? NUMBERED.exec(line);
        if (listMatch) {
            const ordered = BULLET.exec(line) === null;
            const items: Inline[][] = [];
            while (i < lines.length && lines[i].trim()) {
                const next = ordered ? NUMBERED.exec(lines[i]) : BULLET.exec(lines[i]);
                if (next) {
                    items.push(parseInline(next[1]));
                } else if (items.length) {
                    // Continuation line of the previous item.
                    const tail = items[items.length - 1];
                    tail.push({ type: 'text', value: ' ' }, ...parseInline(lines[i].trim()));
                } else break;
                i += 1;
            }
            if (items.length) { blocks.push({ type: 'list', ordered, items }); continue; }
        }

        // Paragraph: everything up to a blank line or the start of another block.
        const paragraph: string[] = [];
        while (i < lines.length && lines[i].trim()) {
            const l = lines[i];
            if (paragraph.length && (/^\s*```/.test(l) || /^\s*:::/.test(l) || BULLET.test(l) || NUMBERED.test(l) || isTableRow(l))) break;
            paragraph.push(l.trim());
            i += 1;
        }
        blocks.push({ type: 'paragraph', children: parseInline(paragraph.join(' ')) });
    }

    return blocks;
}

// ── Document ─────────────────────────────────────────────────

const HEADING = /^(##|###)\s+(.+?)\s*$/;

/**
 * Split a body into its lead and its `##`/`###` sections.
 *
 * Sections rather than a flat block list because the page renders each heading
 * in its own `<section>` with `scroll-mt` clearing the sticky header, and the
 * rail needs the same list — deriving both from this one function is what keeps
 * a heading from existing without a TOC entry.
 *
 * Headings inside a fenced code block are ignored; `## Not a heading` in a shell
 * snippet is a comment.
 */
export function parseDoc(source: string): ParsedDoc {
    const lines = source.replace(/\r\n?/g, '\n').split('\n');

    const intro: string[] = [];
    const sections: { heading: DocHeading; lines: string[] }[] = [];
    const seen = new Map<string, number>();
    let inFence = false;

    for (const line of lines) {
        if (/^\s*```/.test(line)) inFence = !inFence;

        const heading = inFence ? null : HEADING.exec(line);
        if (heading) {
            const title = heading[2];
            const base = slugifyHeading(title);
            const count = seen.get(base) ?? 0;
            seen.set(base, count + 1);
            sections.push({
                heading: { id: count ? `${base}-${count + 1}` : base, title, level: heading[1] === '###' ? 3 : 2 },
                lines: [],
            });
            continue;
        }

        if (sections.length) sections[sections.length - 1].lines.push(line);
        else intro.push(line);
    }

    return {
        intro: parseBlocks(intro),
        sections: sections.map((s) => ({ ...s.heading, blocks: parseBlocks(s.lines) })),
    };
}

/** The "On this page" rail, derived from the same parse the body renders from. */
export const tocOf = (doc: ParsedDoc): DocHeading[] =>
    doc.sections.map(({ id, title, level }) => ({ id, title, level }));
