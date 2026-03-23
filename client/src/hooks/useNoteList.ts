import { useState, useEffect, useCallback } from 'react';
import type { Note } from '@/components/ui/note/utils/noteTypes';
import { fetchNotes } from '@/components/ui/note/utils/noteApi';

export interface UseNoteListResult {
    notesList: Note[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useNoteList(): UseNoteListResult {
    const [notesList, setNotesList] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refetch = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchNotes();
            if (res.success && res.data) setNotesList(res.data);
            else setError(res.error ?? 'Failed to load notes');
        } catch {
            setError('Failed to load notes');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { notesList, loading, error, refetch };
}
