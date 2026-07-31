import { useCallback, useEffect, useState } from 'react';
import { projectsAPI } from '@/services/projects';
import type { IssueRange, ProjectOverview, RollupResponse } from '@/types/projects';
import { getErrorMessage } from '@/utils/error';

/**
 * Both overview surfaces share one loading shape.
 *
 * Range changes refetch **without** clearing the previous data, so switching
 * 24h → 7d redraws the same page with new numbers instead of collapsing to a
 * skeleton and back. The spinner belongs to the first load, where there really
 * is nothing to show.
 */
function useRanged<T>(
    fetcher: (range: IssueRange) => Promise<T>,
    fallbackMessage: string,
    enabled = true
) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [range, setRange] = useState<IssueRange>('24h');

    const load = useCallback(
        async (showSpinner: boolean) => {
            if (!enabled) return;
            if (showSpinner) setLoading(true);
            try {
                setData(await fetcher(range));
                setError(null);
            } catch (err) {
                setError(getErrorMessage(err, fallbackMessage));
            } finally {
                if (showSpinner) setLoading(false);
            }
        },
        [fetcher, range, fallbackMessage, enabled]
    );

    useEffect(() => {
        void load(data === null);
        // `data` is deliberately excluded — including it would refetch on every
        // successful fetch, forever.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load]);

    return { data, loading, error, range, setRange, refetch: () => load(true) };
}

export function useRollup() {
    const fetcher = useCallback((range: IssueRange) => projectsAPI.rollup(range), []);
    const r = useRanged<RollupResponse>(fetcher, 'Failed to load dashboard');
    return { rollup: r.data, ...r };
}

export function useProjectOverview(slug: string | undefined) {
    const fetcher = useCallback(
        (range: IssueRange) => projectsAPI.overview(slug!, range),
        [slug]
    );
    const r = useRanged<ProjectOverview>(fetcher, 'Failed to load overview', !!slug);
    return { overview: r.data, ...r };
}
