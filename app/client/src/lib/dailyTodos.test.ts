import { describe, expect, it } from 'vitest';
import dayjs from 'dayjs';
import type { Note } from '@/types/notes';
import {
    DAILY_TAG,
    addTodo,
    clearCompleted,
    dayAnchorIso,
    dayKeyOf,
    filterTodos,
    findDailyNote,
    moveTodo,
    normalizeTodos,
    removeTodo,
    renameTodo,
    serializeTodos,
    todoProgress,
    toggleTodo,
    type DailyTodo,
} from './dailyTodos';

const todo = (over: Partial<DailyTodo> = {}): DailyTodo => ({
    id: 'a',
    text: 'Task',
    checked: false,
    createdAt: '2026-08-11T09:00:00.000Z',
    completedAt: null,
    ...over,
});

const note = (over: Partial<Note> = {}): Note => ({
    id: '1',
    title: 'Daily note',
    content: '',
    type: 'list',
    isPinned: false,
    tags: [DAILY_TAG],
    scheduledFor: dayAnchorIso('2026-08-11'),
    ...over,
});

describe('normalizeTodos', () => {
    it('reads the legacy { text, checked } shape', () => {
        const out = normalizeTodos([{ text: 'Ship it', checked: true }]);
        expect(out).toHaveLength(1);
        expect(out[0]).toMatchObject({ text: 'Ship it', checked: true });
        expect(out[0].id).toBeTruthy();
    });

    it('gives legacy rows the same id on every pass', () => {
        const raw = [{ text: 'Ship it', checked: false }, { text: 'Ship it', checked: false }];
        expect(normalizeTodos(raw).map((t) => t.id)).toEqual(normalizeTodos(raw).map((t) => t.id));
    });

    it('keeps distinct ids for duplicate text', () => {
        const [a, b] = normalizeTodos([{ text: 'Same' }, { text: 'Same' }]);
        expect(a.id).not.toBe(b.id);
    });

    it('preserves an id that is already stored', () => {
        expect(normalizeTodos([{ id: 't-42', text: 'Keep me' }])[0].id).toBe('t-42');
    });

    it('drops entries with no usable text', () => {
        expect(normalizeTodos([{ text: '   ' }, null, 7, {}, { checked: true }])).toEqual([]);
    });

    it('accepts bare strings', () => {
        expect(normalizeTodos(['Buy milk'])[0]).toMatchObject({ text: 'Buy milk', checked: false });
    });

    it('returns an empty list for anything that is not an array', () => {
        expect(normalizeTodos(undefined)).toEqual([]);
        expect(normalizeTodos({ text: 'nope' })).toEqual([]);
    });

    it('clears completedAt on an unchecked item', () => {
        const [t] = normalizeTodos([{ text: 'x', checked: false, completedAt: '2026-08-11T10:00:00.000Z' }]);
        expect(t.completedAt).toBeNull();
    });

    it('ignores a completedAt that is not a date', () => {
        const [t] = normalizeTodos([{ text: 'x', checked: true, completedAt: 'soon' }]);
        expect(t.completedAt).toBeNull();
    });
});

describe('serializeTodos', () => {
    it('round-trips through normalize', () => {
        const before = [todo({ id: 't-1' }), todo({ id: 't-2', checked: true, completedAt: '2026-08-11T10:00:00.000Z' })];
        expect(normalizeTodos(serializeTodos(before))).toEqual(before);
    });

    it('still writes the legacy `checked` field', () => {
        expect(serializeTodos([todo({ checked: true })])[0]).toHaveProperty('checked', true);
    });
});

describe('mutations', () => {
    it('appends a trimmed todo', () => {
        const out = addTodo([], '  Write the spec  ');
        expect(out).toHaveLength(1);
        expect(out[0]).toMatchObject({ text: 'Write the spec', checked: false });
    });

    it('ignores an empty add', () => {
        const list = [todo()];
        expect(addTodo(list, '   ')).toBe(list);
    });

    it('stamps completedAt on check and clears it on uncheck', () => {
        const at = new Date('2026-08-11T12:00:00.000Z');
        const checked = toggleTodo([todo()], 'a', at);
        expect(checked[0]).toMatchObject({ checked: true, completedAt: at.toISOString() });
        expect(toggleTodo(checked, 'a')[0]).toMatchObject({ checked: false, completedAt: null });
    });

    it('renames, but never to blank', () => {
        expect(renameTodo([todo()], 'a', ' Renamed ')[0].text).toBe('Renamed');
        const list = [todo()];
        expect(renameTodo(list, 'a', '  ')).toBe(list);
    });

    it('removes by id and clears only completed', () => {
        expect(removeTodo([todo({ id: 'a' }), todo({ id: 'b' })], 'a').map((t) => t.id)).toEqual(['b']);
        expect(
            clearCompleted([todo({ id: 'a', checked: true }), todo({ id: 'b' })]).map((t) => t.id),
        ).toEqual(['b']);
    });

    it('does not mutate the input array', () => {
        const list = [todo()];
        toggleTodo(list, 'a');
        expect(list[0].checked).toBe(false);
    });
});

describe('moveTodo', () => {
    // Lane order is open-then-done only by coincidence here; the array interleaves
    // them, which is exactly the case a naive neighbour swap gets wrong.
    const list = [
        todo({ id: 'a' }),
        todo({ id: 'x', checked: true }),
        todo({ id: 'b' }),
    ];

    it('skips past the other lane', () => {
        expect(moveTodo(list, 'b', 'up').map((t) => t.id)).toEqual(['b', 'x', 'a']);
    });

    it('is a no-op at the top of a lane', () => {
        expect(moveTodo(list, 'a', 'up')).toBe(list);
    });

    it('is a no-op at the bottom of a lane', () => {
        expect(moveTodo(list, 'b', 'down')).toBe(list);
    });

    it('is a no-op for an unknown id', () => {
        expect(moveTodo(list, 'nope', 'up')).toBe(list);
    });
});

describe('todoProgress', () => {
    it('reports zero percent for an empty list', () => {
        expect(todoProgress([])).toEqual({ total: 0, done: 0, remaining: 0, percent: 0 });
    });

    it('counts and rounds', () => {
        const list = [todo({ id: 'a', checked: true }), todo({ id: 'b' }), todo({ id: 'c' })];
        expect(todoProgress(list)).toEqual({ total: 3, done: 1, remaining: 2, percent: 33 });
    });
});

describe('filterTodos', () => {
    const list = [todo({ id: 'a', checked: true }), todo({ id: 'b' })];

    it('splits the lanes', () => {
        expect(filterTodos(list, 'open').map((t) => t.id)).toEqual(['b']);
        expect(filterTodos(list, 'done').map((t) => t.id)).toEqual(['a']);
        expect(filterTodos(list, 'all')).toBe(list);
    });
});

describe('day anchoring', () => {
    it('round-trips a day key through the stored timestamp', () => {
        for (const key of ['2026-01-01', '2026-08-11', '2026-12-31']) {
            expect(dayKeyOf(dayAnchorIso(key))).toBe(key);
        }
    });

    it('anchors at local noon, so no offset can shift the day', () => {
        expect(dayjs(dayAnchorIso('2026-08-11')).hour()).toBe(12);
    });

    it('returns null for missing or unparseable input', () => {
        expect(dayKeyOf(null)).toBeNull();
        expect(dayKeyOf('not a date')).toBeNull();
    });
});

describe('findDailyNote', () => {
    const day = '2026-08-11';

    it('finds the tagged list note scheduled for the day', () => {
        expect(findDailyNote([note()], day)?.id).toBe('1');
    });

    it('ignores notes that are merely written that day', () => {
        expect(findDailyNote([note({ scheduledFor: null, createdAt: dayAnchorIso(day) })], day)).toBeNull();
    });

    it('ignores untagged notes and non-list notes', () => {
        expect(findDailyNote([note({ tags: [] })], day)).toBeNull();
        expect(findDailyNote([note({ type: 'text' })], day)).toBeNull();
    });

    it('resolves a duplicate day to the numerically lowest id', () => {
        const notes = [note({ id: '10' }), note({ id: '9' })];
        expect(findDailyNote(notes, day)?.id).toBe('9');
    });

    it('returns null when nothing matches', () => {
        expect(findDailyNote([note()], '2026-08-12')).toBeNull();
    });
});
