import { describe, expect, it } from 'vitest';
import {
    EMPTY_RICH_DOC,
    RICH_TEXT_MAX_BYTES,
    isEmptyRichDoc,
    isRichDocTooLarge,
    legacyContentToRichDoc,
    legacyHtmlToRichDoc,
    looksLikeLegacyHtml,
    noteDisplayText,
    plainTextToRichDoc,
    richDocToPlainText,
    sameRichDoc,
    sanitizeImageSrc,
} from './richText';

/**
 * The projection is the contract.
 *
 * `Note.content` is read as plain text by the card previews and the search
 * haystacks on `/notes`, so what `richDocToPlainText` returns is literally what a
 * user will see on a card and search against. These tests are that promise.
 */

const doc = (...content: unknown[]) => ({ type: 'doc', content });
const p = (...text: string[]) => ({
    type: 'paragraph',
    content: text.map((t) => ({ type: 'text', text: t })),
});

describe('richDocToPlainText', () => {
    it('returns the words, never the markup', () => {
        const d = doc({
            type: 'paragraph',
            content: [
                { type: 'text', text: 'Ship ' },
                { type: 'text', marks: [{ type: 'bold' }], text: 'the editor' },
                { type: 'text', text: ' today' },
            ],
        });
        const out = richDocToPlainText(d);
        expect(out).toBe('Ship the editor today');
        expect(out).not.toContain('<');
        expect(out).not.toContain('bold');
    });

    it('keeps a bolded word findable by search', () => {
        const d = doc(p('review the '), {
            type: 'paragraph',
            content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'migration' }],
        });
        expect(richDocToPlainText(d).toLowerCase()).toContain('migration');
    });

    it('puts each block on its own line', () => {
        expect(richDocToPlainText(doc(p('one'), p('two')))).toBe('one\ntwo');
    });

    it('flattens headings, lists and quotes', () => {
        const d = doc(
            { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Plan' }] },
            {
                type: 'bulletList',
                content: [
                    { type: 'listItem', content: [p('first')] },
                    { type: 'listItem', content: [p('second')] },
                ],
            },
            { type: 'blockquote', content: [p('quoted')] },
        );
        expect(richDocToPlainText(d)).toBe('Plan\nfirst\nsecond\nquoted');
    });

    it('collapses the blank runs empty paragraphs leave behind', () => {
        const d = doc(p('start'), { type: 'paragraph' }, { type: 'paragraph' }, { type: 'paragraph' }, p('end'));
        expect(richDocToPlainText(d)).toBe('start\n\nend');
    });

    it('projects an image as its alt text, never its URL', () => {
        const d = doc({ type: 'image', attrs: { src: 'https://example.com/x.png', alt: 'A chart' } });
        const out = richDocToPlainText(d);
        expect(out).toBe('A chart');
        expect(out).not.toContain('example.com');
    });

    it('is empty, not "undefined", for junk', () => {
        expect(richDocToPlainText(null)).toBe('');
        expect(richDocToPlainText('not a doc')).toBe('');
        expect(richDocToPlainText(EMPTY_RICH_DOC)).toBe('');
    });
});

describe('isEmptyRichDoc', () => {
    it('treats a fresh document as empty', () => {
        expect(isEmptyRichDoc(EMPTY_RICH_DOC)).toBe(true);
        expect(isEmptyRichDoc(doc({ type: 'paragraph' }, { type: 'paragraph' }))).toBe(true);
    });

    it('an image-only document is not empty', () => {
        expect(isEmptyRichDoc(doc({ type: 'image', attrs: { src: 'https://x/y.png' } }))).toBe(false);
    });

    it('text makes it non-empty', () => {
        expect(isEmptyRichDoc(doc(p('a')))).toBe(false);
    });
});

describe('plainTextToRichDoc', () => {
    it('round-trips a legacy note without losing a word', () => {
        const legacy = 'Standup at 9\n\nThen the migration';
        expect(richDocToPlainText(plainTextToRichDoc(legacy))).toBe(legacy);
    });
});

describe('isRichDocTooLarge', () => {
    it('passes an ordinary note', () => {
        expect(isRichDocTooLarge(doc(p('a normal day')))).toBe(false);
    });

    it('refuses a document over the cap', () => {
        const big = doc(p('x'.repeat(RICH_TEXT_MAX_BYTES + 1)));
        expect(isRichDocTooLarge(big)).toBe(true);
    });
});

describe('sameRichDoc', () => {
    /**
     * Observed against the dev database, not assumed: a document sent as
     * `{type,text}` comes back out of the `jsonb` column as `{text,type}`. The
     * editor decides "is this incoming document my own echo?" with this
     * comparison, and a naive stringify answers no every time — which would
     * reset the caret to the top of the document on every autosave.
     */
    it('ignores the key reordering a jsonb round-trip performs', () => {
        const sent = doc({
            type: 'paragraph',
            content: [{ type: 'text', text: 'Ship ', marks: [{ type: 'bold' }] }],
        });
        const returned = {
            content: [{ content: [{ marks: [{ type: 'bold' }], text: 'Ship ', type: 'text' }], type: 'paragraph' }],
            type: 'doc',
        };
        expect(JSON.stringify(sent)).not.toBe(JSON.stringify(returned));
        expect(sameRichDoc(sent, returned)).toBe(true);
    });

    it('still notices a real difference', () => {
        expect(sameRichDoc(doc(p('a')), doc(p('b')))).toBe(false);
        expect(sameRichDoc(doc(p('a')), doc(p('a'), p('b')))).toBe(false);
    });

    it('array order is content, not noise', () => {
        expect(sameRichDoc(doc(p('one'), p('two')), doc(p('two'), p('one')))).toBe(false);
    });
});

describe('sanitizeImageSrc', () => {
    it('accepts http and https', () => {
        expect(sanitizeImageSrc('https://example.com/a.png')).toBe('https://example.com/a.png');
        expect(sanitizeImageSrc('http://example.com/a.png')).toBe('http://example.com/a.png');
    });

    it('refuses javascript:, including the control-character disguise', () => {
        expect(sanitizeImageSrc('javascript:alert(1)')).toBeNull();
        expect(sanitizeImageSrc('java\tscript:alert(1)')).toBeNull();
        expect(sanitizeImageSrc('java\nscript:alert(1)')).toBeNull();
        expect(sanitizeImageSrc('  JavaScript:alert(1)')).toBeNull();
    });

    it('refuses data URIs — one photo would eat the whole document budget', () => {
        expect(sanitizeImageSrc('data:image/png;base64,iVBORw0KGgo=')).toBeNull();
    });

    it('refuses relative and protocol-relative paths', () => {
        expect(sanitizeImageSrc('/uploads/a.png')).toBeNull();
        expect(sanitizeImageSrc('//evil.com/a.png')).toBeNull();
        expect(sanitizeImageSrc('')).toBeNull();
    });
});

describe('looksLikeLegacyHtml', () => {
    it('recognises what the pre-reset editor wrote', () => {
        expect(looksLikeLegacyHtml('<p>hello</p>')).toBe(true);
        expect(looksLikeLegacyHtml('a&nbsp;b')).toBe(true);
        expect(looksLikeLegacyHtml('<DIV>shouty</DIV>')).toBe(true);
    });

    // The narrow test is the point: prose about inequalities is not markup, and
    // running it through the converter would rewrite someone's words.
    it('leaves prose alone', () => {
        expect(looksLikeLegacyHtml('a < b and c > d')).toBe(false);
        expect(looksLikeLegacyHtml('use <- for assignment')).toBe(false);
        expect(looksLikeLegacyHtml('plain note')).toBe(false);
        expect(looksLikeLegacyHtml('')).toBe(false);
        expect(looksLikeLegacyHtml(null)).toBe(false);
    });
});

describe('legacyHtmlToRichDoc', () => {
    it('turns paragraphs into paragraphs, and never leaves markup in the text', () => {
        const doc = legacyHtmlToRichDoc('<p>first</p><p>second</p>');
        expect(doc).toEqual({
            type: 'doc',
            content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'first' }] },
                { type: 'paragraph', content: [{ type: 'text', text: 'second' }] },
            ],
        });
        expect(richDocToPlainText(doc)).toBe('first\nsecond');
    });

    it('decodes the entities the old editor emitted', () => {
        const text = richDocToPlainText(legacyHtmlToRichDoc('<p>a&nbsp;b &amp; c &lt;d&gt;</p>'));
        expect(text).toContain('&');
        expect(text).toContain('<d>');
        expect(text).not.toContain('&nbsp;');
        expect(text).not.toContain('&amp;');
    });

    it('keeps headings, lists and quotes as structure rather than as text', () => {
        const doc = legacyHtmlToRichDoc(
            '<h2>Title</h2><ul><li>one</li><li>two</li></ul><blockquote>said</blockquote>',
        ) as { content: { type: string; attrs?: { level?: number }; content?: unknown[] }[] };
        expect(doc.content.map((n) => n.type)).toEqual(['heading', 'bulletList', 'blockquote']);
        expect(doc.content[0].attrs?.level).toBe(2);
        expect(doc.content[1].content).toHaveLength(2);
    });

    it('groups consecutive items into one list and starts a new one for a new kind', () => {
        const doc = legacyHtmlToRichDoc('<ul><li>a</li><li>b</li></ul><ol><li>c</li></ol>') as {
            content: { type: string }[];
        };
        expect(doc.content.map((n) => n.type)).toEqual(['bulletList', 'orderedList']);
    });

    it('carries bold, italic and links across as marks', () => {
        const doc = legacyHtmlToRichDoc('<p><strong>bold</strong> and <a href="https://x.test">link</a></p>') as {
            content: { content: { text?: string; marks?: { type: string; attrs?: { href?: string } }[] }[] }[];
        };
        const runs = doc.content[0].content;
        expect(runs[0]).toMatchObject({ text: 'bold', marks: [{ type: 'bold' }] });
        expect(runs.at(-1)).toMatchObject({ marks: [{ type: 'link', attrs: { href: 'https://x.test' } }] });
    });

    it('makes <br> a hard break instead of a literal newline in a text node', () => {
        const doc = legacyHtmlToRichDoc('<p>a<br>b</p>') as { content: { content: { type: string }[] }[] };
        expect(doc.content[0].content.map((n) => n.type)).toEqual(['text', 'hardBreak', 'text']);
        expect(richDocToPlainText(doc)).toContain('a');
        expect(richDocToPlainText(doc)).toContain('b');
    });

    it('projects an image as its alt text and never as its URL', () => {
        const text = richDocToPlainText(legacyHtmlToRichDoc('<p><img src="https://x.test/a.png" alt="a chart"></p>'));
        expect(text).toBe('a chart');
        expect(text).not.toContain('http');
    });

    it('drops script and style bodies rather than reading them out', () => {
        const text = richDocToPlainText(
            legacyHtmlToRichDoc('<p>keep</p><script>alert(1)</script><style>.x{color:red}</style>'),
        );
        expect(text).toBe('keep');
    });

    // FAILURE CASE — the property the whole converter exists for. Whatever it is
    // handed, the reader must never be shown markup.
    it('degrades unparseable input to stripped text, never to visible markup', () => {
        const nasty = '<weird-tag data-x="<">  &notanentity; <p unclosed';
        const text = richDocToPlainText(legacyHtmlToRichDoc(nasty));
        expect(text).not.toMatch(/<\s*\/?\s*(p|div|weird-tag)/i);
        expect(text).toContain('&notanentity;');
    });

    it('loses no word from a real legacy note', () => {
        const html = '<p>ดดดด</p><p>&nbsp; &nbsp; keep this</p><p>&nbsp;1&nbsp;</p>';
        const text = richDocToPlainText(legacyHtmlToRichDoc(html));
        expect(text).toContain('ดดดด');
        expect(text).toContain('keep this');
        expect(text).toContain('1');
        expect(text).not.toContain('<p>');
    });
});

describe('noteDisplayText / legacyContentToRichDoc', () => {
    it('passes plain content through untouched', () => {
        expect(noteDisplayText('just a note')).toBe('just a note');
        expect(legacyContentToRichDoc('just a note')).toEqual(plainTextToRichDoc('just a note'));
    });

    it('renders a legacy row as text a person can read', () => {
        expect(noteDisplayText('<p>hello</p><p>world</p>')).toBe('hello\nworld');
    });

    it('opens a legacy row in the editor as structure, not as literal markup', () => {
        const doc = legacyContentToRichDoc('<h1>Plan</h1><p>body</p>') as { content: { type: string }[] };
        expect(doc.content.map((n) => n.type)).toEqual(['heading', 'paragraph']);
    });

    it('is empty, not a crash, for nothing at all', () => {
        expect(noteDisplayText(null)).toBe('');
        expect(legacyContentToRichDoc(null)).toEqual(EMPTY_RICH_DOC);
    });
});
