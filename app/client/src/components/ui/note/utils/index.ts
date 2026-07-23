/**
 * Note Utils Index
 *
 * Central export point for all note utilities, selectors and types.
 */

import type { Note, NoteBlock, RichTextBlock } from './noteTypes';

export * from './noteApi';
export * from './noteTypes';
export * from './noteAutosave';
export * from './noteRealtime';

// ── Normalized Note Store Helpers ─────────────────────────────────────────────

export interface NormalizedNotes {
    byId: Record<string, Note>;
    allIds: string[];
}

export const emptyNotesState: NormalizedNotes = {
    byId: {},
    allIds: [],
};

export const normalizeNotes = (notes: Note[]): NormalizedNotes => {
    const byId: Record<string, Note> = {};
    const allIds: string[] = [];
    for (const note of notes) {
        byId[note.id] = note;
        allIds.push(note.id);
    }
    return { byId, allIds };
};

export const upsertNote = (state: NormalizedNotes, note: Note): NormalizedNotes => {
    const exists = !!state.byId[note.id];
    const byId = { ...state.byId, [note.id]: note };
    const allIds = exists ? state.allIds : [note.id, ...state.allIds];
    return { byId, allIds };
};

export const removeNote = (state: NormalizedNotes, noteId: string): NormalizedNotes => {
    if (!state.byId[noteId]) return state;
    const { [noteId]: _removed, ...rest } = state.byId;
    return {
        byId: rest,
        allIds: state.allIds.filter((id) => id !== noteId),
    };
};

export const getAllNotes = (state: NormalizedNotes): Note[] =>
    state.allIds.map((id) => state.byId[id]).filter((n): n is Note => !!n);

export const getFilteredNotes = (state: NormalizedNotes, search: string, filter: string): Note[] => {
    const lower = search.toLowerCase();
    const all = getAllNotes(state);
    return all.filter((note) => {
        const matchesSearch =
            (note.title?.toLowerCase() || '').includes(lower) ||
            (note.content?.toLowerCase() || '').includes(lower);
        const matchesFilter = filter === 'All' || note.type === filter.toLowerCase();
        return matchesSearch && matchesFilter;
    });
};

export const splitPinnedNotes = (notes: Note[]): { pinned: Note[]; others: Note[] } => {
    const pinned: Note[] = [];
    const others: Note[] = [];
    for (const note of notes) {
        if (note.isPinned) pinned.push(note);
        else others.push(note);
    }
    return { pinned, others };
};

// ── Content ↔ Block Model Helpers ─────────────────────────────────────────────

export const contentToBlocks = (content: string): NoteBlock[] => {
    const trimmed = content || '';
    return [
        {
            id: 'block-0',
            type: 'richText',
            html: trimmed,
        },
    ];
};

export const blocksToContent = (blocks: NoteBlock[]): string => {
    if (!blocks || !blocks.length) return '';
    const rich = blocks.find((b): b is RichTextBlock => b.type === 'richText');
    if (rich) return rich.html || '';
    // Fallback: concatenate paragraph texts
    return blocks
        .map((b) => {
            if (b.type === 'paragraph') {
                return b.text || '';
            }
            return '';
        })
        .filter(Boolean)
        .join('\n\n');
};
