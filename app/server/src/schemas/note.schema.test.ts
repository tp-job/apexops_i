import { describe, expect, it } from 'vitest';
import { RICH_TEXT_MAX_BYTES, createNoteSchema, updateNoteSchema } from './note.schema';

/**
 * The rich-document bound.
 *
 * `content` was unbounded for as long as a note was a paragraph. Rich text is
 * what makes an unbounded note body a real request-size problem, so the cap is
 * the thing worth pinning down here — an oversized document must be a 400 with a
 * readable message, not a Postgres error the user sees as "Could not save".
 */

const docOfBytes = (bytes: number) => ({
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x'.repeat(bytes) }] }],
});

describe('createNoteSchema — contentRich', () => {
    it('accepts a note with no rich document at all', () => {
        const parsed = createNoteSchema.safeParse({ title: 'Plain' });
        expect(parsed.success).toBe(true);
    });

    it('accepts a document within the cap', () => {
        const parsed = createNoteSchema.safeParse({ title: 'Rich', contentRich: docOfBytes(100) });
        expect(parsed.success).toBe(true);
    });

    it('refuses a document over the cap', () => {
        const parsed = createNoteSchema.safeParse({
            title: 'Huge',
            contentRich: docOfBytes(RICH_TEXT_MAX_BYTES + 1),
        });
        expect(parsed.success).toBe(false);
    });

    it('refuses an array or a string where a document belongs', () => {
        expect(createNoteSchema.safeParse({ title: 'x', contentRich: [] }).success).toBe(false);
        expect(createNoteSchema.safeParse({ title: 'x', contentRich: '<p>hi</p>' }).success).toBe(false);
    });

    it('counts a rich document as content, so an image-only note can be created', () => {
        // Title and content both empty: without the `contentRich` clause in the
        // refine, a note that is one image would be rejected as empty.
        const parsed = createNoteSchema.safeParse({ title: '', content: '', contentRich: docOfBytes(10) });
        expect(parsed.success).toBe(true);
    });
});

describe('updateNoteSchema — contentRich', () => {
    it('accepts an explicit null, which is how formatting is cleared', () => {
        const parsed = updateNoteSchema.safeParse({ content: 'now plain', contentRich: null });
        expect(parsed.success).toBe(true);
    });

    it('accepts an update that does not mention it', () => {
        expect(updateNoteSchema.safeParse({ title: 'renamed' }).success).toBe(true);
    });

    it('refuses an oversized document on update too', () => {
        const parsed = updateNoteSchema.safeParse({ contentRich: docOfBytes(RICH_TEXT_MAX_BYTES + 1) });
        expect(parsed.success).toBe(false);
    });
});
