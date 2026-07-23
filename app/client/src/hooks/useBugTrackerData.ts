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

export function useBugTrackerData(): UseBugTrackerDataResult {
    const [logs, setLogs] = useState<Log[]>([]);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isOfflineMock, setIsOfflineMock] = useState(false);

    const refetch = useCallback(async () => {
        setLoading(true);
        try {
            const [logsData, ticketsData] = await Promise.all([
                logsAPI.getAll(),
                ticketsAPI.getAll(),
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
    }, []);

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
