import { useCallback, useEffect, useState } from 'react';
import { issuesAPI } from '@/services/projects';
import type { IssueDetail, IssueRange, IssueStatus, PromotedTicket } from '@/types/projects';
import { getErrorMessage } from '@/utils/error';

export interface UseIssueDetailResult {
    issue: IssueDetail | null;
    loading: boolean;
    error: string | null;
    range: IssueRange;
    setRange: (range: IssueRange) => void;
    setStatus: (status: IssueStatus) => Promise<void>;
    promote: () => Promise<PromotedTicket>;
    refetch: () => Promise<void>;
}

/**
 * One issue, with its occurrence timeline.
 *
 * Range changes refetch **without** clearing `issue`, so switching 24h → 7d
 * re-renders the same page with new bars instead of collapsing to a skeleton and
 * back. The spinner is reserved for the first load, where there genuinely is
 * nothing to show.
 */
export function useIssueDetail(
    slug: string | undefined,
    issueId: number | null
): UseIssueDetailResult {
    const [issue, setIssue] = useState<IssueDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [range, setRange] = useState<IssueRange>('24h');

    const load = useCallback(
        async (showSpinner: boolean) => {
            if (!slug || issueId === null) return;
            if (showSpinner) setLoading(true);
            try {
                setIssue(await issuesAPI.get(slug, issueId, range));
                setError(null);
            } catch (err) {
                setError(getErrorMessage(err, 'Failed to load issue'));
            } finally {
                if (showSpinner) setLoading(false);
            }
        },
        [slug, issueId, range]
    );

    // First load shows a skeleton; every later range change swaps data in place.
    useEffect(() => {
        void load(issue === null);
        // `issue` is deliberately not a dependency — including it would refetch
        // on every successful fetch.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load]);

    return {
        issue,
        loading,
        error,
        range,
        setRange,

        setStatus: async (status) => {
            if (!slug || issueId === null) return;
            const updated = await issuesAPI.setStatus(slug, issueId, status);
            // Merge rather than replace: the response is the bare issue row and
            // carries no timeline, so assigning it would blank the chart.
            setIssue((prev) => (prev ? { ...prev, ...updated } : prev));
        },

        promote: async () => {
            if (!slug || issueId === null) throw new Error('No issue');
            const { ticket, issue: updated } = await issuesAPI.promote(slug, issueId);
            setIssue((prev) => (prev ? { ...prev, ...updated } : prev));
            return ticket;
        },

        refetch: () => load(true),
    };
}
