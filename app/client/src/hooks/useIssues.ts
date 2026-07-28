import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { issuesAPI } from '@/services/projects';
import type { Issue, IssueStatus, PromotedTicket } from '@/types/projects';
import { getErrorMessage } from '@/utils/error';

const PAGE_SIZE = 25;

export interface IssueQuery {
    level: string;
    status: string;
    q: string;
    sort: 'lastSeen' | 'firstSeen' | 'count';
    direction: 'asc' | 'desc';
    page: number;
}

export interface UseIssuesResult {
    issues: Issue[];
    total: number;
    pageSize: number;
    query: IssueQuery;
    loading: boolean;
    error: string | null;
    setFilter: (patch: Partial<Omit<IssueQuery, 'page'>>) => void;
    setPage: (page: number) => void;
    setSort: (key: string, direction: 'asc' | 'desc') => void;
    clearFilters: () => void;
    /** True when filters are active — lets the empty state say "no matches" not "no data". */
    filtered: boolean;
    setStatus: (id: number, status: IssueStatus) => Promise<void>;
    promote: (id: number) => Promise<PromotedTicket>;
    refetch: () => Promise<void>;
}

/**
 * The issue list, with **filter state in the URL query string**.
 *
 * That is the point of using `useSearchParams` rather than `useState`: a
 * filtered issue list you cannot paste into chat is half a feature. Deep links,
 * the back button, and two tabs on two different filters all work for free, and
 * retrofitting URL state later means touching every list page.
 *
 * Sorting and paging are server-side; this hook only reflects them and asks.
 */
export function useIssues(slug: string | undefined): UseIssuesResult {
    const [searchParams, setSearchParams] = useSearchParams();
    const [issues, setIssues] = useState<Issue[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const query = useMemo<IssueQuery>(() => {
        const rawSort = searchParams.get('sort');
        const rawDir = searchParams.get('direction');
        return {
            level: searchParams.get('level') ?? '',
            status: searchParams.get('status') ?? '',
            q: searchParams.get('q') ?? '',
            // Anything unrecognised in the URL falls back to the default rather
            // than being forwarded — the query string is user-editable input.
            sort: rawSort === 'firstSeen' || rawSort === 'count' ? rawSort : 'lastSeen',
            direction: rawDir === 'asc' ? 'asc' : 'desc',
            page: Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1),
        };
    }, [searchParams]);

    const filtered = !!(query.level || query.status || query.q);

    const load = useCallback(async () => {
        if (!slug) return;
        setLoading(true);
        try {
            const res = await issuesAPI.list(slug, {
                level: query.level || undefined,
                status: (query.status || undefined) as IssueStatus | undefined,
                q: query.q || undefined,
                sort: query.sort,
                direction: query.direction,
                limit: PAGE_SIZE,
                offset: (query.page - 1) * PAGE_SIZE,
            });
            setIssues(res.issues);
            setTotal(res.total);
            setError(null);
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to load issues'));
        } finally {
            setLoading(false);
        }
    }, [slug, query.level, query.status, query.q, query.sort, query.direction, query.page]);

    useEffect(() => {
        void load();
    }, [load]);

    const patchParams = useCallback(
        (patch: Record<string, string | number | undefined>, resetPage: boolean) => {
            const next = new URLSearchParams(searchParams);
            Object.entries(patch).forEach(([k, v]) => {
                if (v === undefined || v === '' || v === 0) next.delete(k);
                else next.set(k, String(v));
            });
            // Changing a filter while on page 4 would otherwise land on an empty
            // page of a shorter result set, which reads as "no results".
            if (resetPage) next.delete('page');
            setSearchParams(next, { replace: true });
        },
        [searchParams, setSearchParams]
    );

    return {
        issues,
        total,
        pageSize: PAGE_SIZE,
        query,
        loading,
        error,
        filtered,
        setFilter: (patch) => patchParams(patch as Record<string, string | undefined>, true),
        setPage: (page) => patchParams({ page: page > 1 ? page : undefined }, false),
        setSort: (key, direction) => patchParams({ sort: key, direction }, true),
        clearFilters: () => setSearchParams(new URLSearchParams(), { replace: true }),

        setStatus: async (id, status) => {
            const updated = await issuesAPI.setStatus(slug!, id, status);
            setIssues((prev) => prev.map((i) => (i.id === id ? updated : i)));
        },

        promote: async (id) => {
            const { ticket, issue } = await issuesAPI.promote(slug!, id);
            setIssues((prev) => prev.map((i) => (i.id === id ? issue : i)));
            return ticket;
        },

        refetch: load,
    };
}
