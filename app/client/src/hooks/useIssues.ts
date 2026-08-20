import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { issuesAPI } from '@/services/projects';
import type { Issue, IssueStatus, PromotedTicket } from '@/types/projects';
import { getErrorMessage } from '@/utils/error';
import { useIssueStream } from './useIssueStream';
import { reconcileIssueFrame, type IssueActivityFrame, type StreamStatus } from '@/lib/issueStream';

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
    /** Live feed state. Never `live` while the socket is down (R-D5). */
    streamStatus: StreamStatus;
    /** New issues that arrived but were not inserted — the banner's count (R-D2). */
    pendingNew: number;
    /** Show them: refetch the current query and clear the banner. */
    showPendingNew: () => Promise<void>;
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
export function useIssues(slug: string | undefined, projectId: number | null = null): UseIssuesResult {
    const [searchParams, setSearchParams] = useSearchParams();
    const [issues, setIssues] = useState<Issue[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pendingNew, setPendingNew] = useState(0);

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
        // The banner counts new issues *for the current query*. Changing the
        // filter or the page answers the question it was asking, so it resets
        // with the fetch rather than carrying a stale number across views.
        setPendingNew(0);
        void load();
    }, [load]);

    // The live feed. `queryRef` rather than a dependency: the frame handler must
    // see the *current* filter and page without the socket being torn down and
    // rebuilt every time either changes.
    const queryRef = useRef({ issues, filtered, page: query.page, projectId });
    queryRef.current = { issues, filtered, page: query.page, projectId };

    const onFrame = useCallback((frame: IssueActivityFrame) => {
        const { issues: current, filtered: isFiltered, page, projectId: viewing } = queryRef.current;
        const outcome = reconcileIssueFrame(
            { issues: current, total, pageSize: PAGE_SIZE, projectId: viewing, filtered: isFiltered, page },
            frame
        );

        // Deliberately computed OUTSIDE a state updater. An updater that also
        // calls `setTotal` runs twice under StrictMode and double-counts the very
        // number this sprint exists to keep honest.
        if (outcome.kind === 'patched') setIssues(outcome.issues);
        else if (outcome.kind === 'prepended') {
            setIssues(outcome.issues);
            setTotal(outcome.total);
        } else if (outcome.kind === 'deferred') {
            // A row that cannot be shown is counted, not hidden: the banner is the
            // difference between "quiet" and "you are looking at a stale list".
            setPendingNew((n) => n + 1);
        }
    }, [total]);

    const onResync = useCallback(() => {
        // Pushes missed while disconnected are gone (R-D5). One refetch of the
        // current query is the resync, and it is cheaper than any buffer.
        setPendingNew(0);
        void load();
    }, [load]);

    const { status: streamStatus } = useIssueStream({ slug, onFrame, onResync });

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

        streamStatus,
        pendingNew,
        showPendingNew: async () => {
            setPendingNew(0);
            await load();
        },
    };
}
