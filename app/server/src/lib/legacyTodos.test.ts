import { describe, expect, it } from 'vitest';
import { legacyId, normalizeTodos } from './legacyTodos';

/**
 * These cases mirror `app/client/src/lib/dailyTodos.test.ts` deliberately.
 *
 * The migration into `tasks` preserves each todo's id as `Task.clientId`, and the
 * browser derives that same id independently. Any divergence between the two
 * implementations makes the client fail to recognise rows it already owns —
 * it writes them again and the day doubles. So the point of this file is not
 * that the server port works, it is that it works *the same way*.
 */
describe('normalizeTodos (server port)', () => {
    it('reads the current object shape', () => {
        const [t] = normalizeTodos([{ text: 'Ship it', checked: true }]);
        expect(t).toMatchObject({ text: 'Ship it', checked: true });
    });

    it('derives ids that are stable across calls', () => {
        const raw = [{ text: 'One' }, { text: 'Two' }];
        expect(normalizeTodos(raw).map((t) => t.id)).toEqual(normalizeTodos(raw).map((t) => t.id));
    });

    it('keeps two identical texts apart by position', () => {
        const [a, b] = normalizeTodos([{ text: 'Same' }, { text: 'Same' }]);
        expect(a.id).not.toBe(b.id);
    });

    it('preserves an explicit id', () => {
        expect(normalizeTodos([{ id: 't-42', text: 'Keep me' }])[0].id).toBe('t-42');
    });

    it('drops anything without usable text', () => {
        expect(normalizeTodos([{ text: '   ' }, null, 7, {}, { checked: true }])).toEqual([]);
    });

    it('reads the bare-string legacy shape', () => {
        expect(normalizeTodos(['Buy milk'])[0]).toMatchObject({ text: 'Buy milk', checked: false });
    });

    it('returns [] for anything that is not an array', () => {
        expect(normalizeTodos(undefined)).toEqual([]);
        expect(normalizeTodos({ text: 'nope' })).toEqual([]);
    });

    it('ignores completedAt on an unchecked item', () => {
        const [t] = normalizeTodos([{ text: 'x', checked: false, completedAt: '2026-08-11T10:00:00.000Z' }]);
        expect(t.completedAt).toBeNull();
    });

    it('rejects an unparseable completedAt rather than passing it through', () => {
        const [t] = normalizeTodos([{ text: 'x', checked: true, completedAt: 'soon' }]);
        expect(t.completedAt).toBeNull();
    });

    it('accepts the older `done` flag as checked', () => {
        expect(normalizeTodos([{ text: 'x', done: true }])[0].checked).toBe(true);
    });
});

describe('legacyId', () => {
    /**
     * Pinned literally. These exact strings already exist as ids in the browser
     * and, after migration, as `Task.clientId` values in the database — changing
     * the derivation orphans every one of them.
     */
    it('matches the client formula exactly', () => {
        expect(legacyId('Buy milk', 0)).toBe('legacy-0-buy-milk');
        expect(legacyId('Ship it!', 3)).toBe('legacy-3-ship-it');
        expect(legacyId('  Trim  me  ', 1)).toBe('legacy-1-trim-me');
    });

    it('truncates the slug at 24 characters', () => {
        const id = legacyId('a'.repeat(80), 0);
        expect(id).toBe(`legacy-0-${'a'.repeat(24)}`);
    });

    it('strips leading and trailing separators left by punctuation', () => {
        expect(legacyId('!!!hello!!!', 2)).toBe('legacy-2-hello');
    });

    it('handles text with no alphanumerics at all', () => {
        expect(legacyId('!!!', 0)).toBe('legacy-0-');
    });
});
