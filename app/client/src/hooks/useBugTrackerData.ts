import { useState, useEffect, useCallback } from 'react';
import type { Log, Ticket } from '@/types/bugTrackerApp';
import { hasMockFlag } from '@/types/api';
import { logsAPI, ticketsAPI } from '@/services/api';

export interface UseBugTrackerDataResult {
    logs: Log[];
    setLogs: React.Dispatch<React.SetStateAction<Log[]>>;
    tickets: Ticket[];
    setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>;
    loading: boolean;
    error: string | null;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    isOfflineMock: boolean;
    refetch: () => Promise<void>;
}

/**
 * `projectId` scopes the tickets fetched (and, when creating, is passed
 * separately by the caller — this hook only reads). Passing it also **skips
 * `GET /api/logs`**: `Log` is ApexOps' own internal server log, unrelated to any
 * one project, and `BugTracker.tsx` does not render it — fetching it on every
 * project board would be a wasted round trip for data nothing shows.
 * The unscoped `/bug-tracker` board (no `projectId`) keeps fetching both, since
 * whatever consumes `logs` there may still exist.
 */
export function useBugTrackerData(projectId?: number): UseBugTrackerDataResult {
    const [logs, setLogs] = useState<Log[]>([]);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isOfflineMock, setIsOfflineMock] = useState(false);

    const refetch = useCallback(async () => {
        setLoading(true);
        try {
            const [logsData, ticketsData] = await Promise.all([
                projectId ? Promise.resolve<Log[]>([]) : logsAPI.getAll(),
                ticketsAPI.getAll(projectId ? { projectId } : undefined),
            ]);
            setLogs(logsData ?? []);
            setTickets(ticketsData ?? []);
            const offlineUsed = hasMockFlag(logsData) || hasMockFlag(ticketsData);
            setIsOfflineMock(offlineUsed);
            if (offlineUsed) setError(null);
        } catch (err: unknown) {
            console.error('Failed to fetch bug tracker data', err);
            setError('Failed to load data. Please check connection.');
            setIsOfflineMock(false);
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return {
        logs,
        setLogs,
        tickets,
        setTickets,
        loading,
        error,
        setError,
        isOfflineMock,
        refetch,
    };
}
