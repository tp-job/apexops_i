import { useState, useEffect, useCallback } from 'react';
import { getAuthToken } from '@/api/config';
import { fetchWithAuth } from '@/api/client';
import type { TicketStats, LogStats } from '@/types/dashboard';

/**
 * Dashboard workspace data.
 *
 * Fetches ticket and log stats together, following the shape/error conventions
 * already established by `useNoteStatsOverview.ts`.
 *
 * Deliberate: the two requests are independent and **partial failure is a real
 * state**, not an error state. If tickets resolve and logs 500, the workspace
 * shows ticket KPIs and a degraded panel for logs rather than blanking the whole
 * page — a dashboard that hides everything because one endpoint hiccuped is
 * worse than one that admits what it doesn't know.
 */
export interface UseDashboardStatsResult {
    tickets: TicketStats | null;
    logs: LogStats | null;
    loading: boolean;
    /** Set only when *both* requests failed — i.e. nothing to show at all. */
    error: Error | null;
    /** True when at least one panel is missing while another rendered. */
    partial: boolean;
    hasAuth: boolean;
    refetch: () => void;
}

async function getJson<T>(path: string): Promise<T> {
    const res = await fetchWithAuth(path);
    if (!res.ok) throw new Error(`${path} responded ${res.status}`);
    return (await res.json()) as T;
}

export function useDashboardStats(): UseDashboardStatsResult {
    const [tickets, setTickets] = useState<TicketStats | null>(null);
    const [logs, setLogs] = useState<LogStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [partial, setPartial] = useState(false);
    const [hasAuth, setHasAuth] = useState(true);

    const fetchStats = useCallback(async () => {
        if (!getAuthToken()) {
            setHasAuth(false);
            setLoading(false);
            return;
        }

        setHasAuth(true);
        setLoading(true);
        setError(null);

        const [ticketResult, logResult] = await Promise.allSettled([
            getJson<TicketStats>('/api/tickets/stats'),
            getJson<LogStats>('/api/logs/stats'),
        ]);

        const nextTickets = ticketResult.status === 'fulfilled' ? ticketResult.value : null;
        const nextLogs = logResult.status === 'fulfilled' ? logResult.value : null;

        setTickets(nextTickets);
        setLogs(nextLogs);

        if (!nextTickets && !nextLogs) {
            const reason =
                ticketResult.status === 'rejected' ? ticketResult.reason : logResult.status === 'rejected' ? logResult.reason : null;
            setError(reason instanceof Error ? reason : new Error('Failed to load dashboard stats'));
            setPartial(false);
        } else {
            setPartial(!nextTickets || !nextLogs);
        }

        setLoading(false);
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    return { tickets, logs, loading, error, partial, hasAuth, refetch: fetchStats };
}
