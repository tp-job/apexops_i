import { describe, expect, it } from 'vitest';
import {
    EMPTY_RICH_DOC,
    RICH_TEXT_MAX_BYTES,
    isEmptyRichDoc,
    isRichDocTooLarge,
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
