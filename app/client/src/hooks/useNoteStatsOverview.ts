import { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl, getAuthHeaders, getAuthToken } from '@/api/config';
import type { NoteStats } from '@/types/notes';
import { isMockEnabled, isNetworkFailure } from '@/utils/offlineMock';
import { mockNoteStatsOverview } from '@/utils/mockData';

export interface UseNoteStatsOverviewResult {
    stats: NoteStats | null;
    loading: boolean;
    error: Error | null;
    isOffline: boolean;
    hasAuth: boolean;
    refetch: () => void;
}

export function useNoteStatsOverview(): UseNoteStatsOverviewResult {
    const [stats, setStats] = useState<NoteStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [isOffline, setIsOffline] = useState(false);
    const [hasAuth, setHasAuth] = useState(true);

    const fetchStats = useCallback(async () => {
        const token = getAuthToken();
        if (!token) {
            setHasAuth(false);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${getApiBaseUrl()}/api/notes/stats/overview`, {
                headers: getAuthHeaders(),
            });
            if (res.ok) {
                const data = (await res.json()) as NoteStats;
                setStats(data);
                setIsOffline(false);
            } else {
                setError(new Error('Failed to load note stats'));
            }
        } catch (err) {
            console.error('Error fetching note stats:', err);
            setIsOffline(true);
            if (isMockEnabled() && isNetworkFailure(err)) {
                setStats(mockNoteStatsOverview as NoteStats);
            } else {
                setError(err instanceof Error ? err : new Error('Failed to load note stats'));
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return { stats, loading, error, isOffline, hasAuth, refetch: fetchStats };
}
