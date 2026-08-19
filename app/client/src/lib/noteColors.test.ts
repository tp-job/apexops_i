import { describe, expect, it } from 'vitest';
import { NOTE_COLORS, colorFor } from './noteColors';

/**
 * The palette is now shared by three surfaces — the note form, the edit dialog
 * and the card's right-click menu — so the thing worth pinning down is that a
 * stored value always resolves to *something* renderable. A lookup that returns
 * undefined here is a blank swatch and a crash on `.dot` at the call site.
 */
describe('colorFor', () => {
    it('resolves every id the palette offers', () => {
        for (const c of NOTE_COLORS) {
            expect(colorFor(c.id).id).toBe(c.id);
        }
    });

    it('treats null, undefined and a missing colour as the default', () => {
        expect(colorFor(null).id).toBeNull();
        expect(colorFor(undefined).id).toBeNull();
    });

    it('falls back rather than returning undefined for an unknown stored colour', () => {
        // Older rows carry values this palette never offered. They must render
        // as uncoloured, not blow up the card that reads `.dot`.
        const resolved = colorFor('chartreuse');
        expect(resolved).toBe(NOTE_COLORS[0]);
        expect(resolved.dot).toBeTruthy();
    });

    it('keeps "no colour" first, because the menu and the picker both rely on it', () => {
        expect(NOTE_COLORS[0].id).toBeNull();
    });

    it('has no duplicate ids', () => {
        const ids = NOTE_COLORS.map((c) => c.id);
        expect(new Set(ids).size).toBe(ids.length);
    });
});
