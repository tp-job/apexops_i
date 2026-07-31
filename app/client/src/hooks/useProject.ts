import { useCallback, useEffect, useRef, useState } from 'react';
import { issuesAPI, projectsAPI } from '@/services/projects';
import type { CaptureLevel, IssueStats, Project } from '@/types/projects';
import { getErrorMessage } from '@/utils/error';

/** How often the "waiting for first event" screen re-checks. */
const WAITING_POLL_MS = 4000;

export interface UseProjectResult {
    project: Project | null;
    stats: IssueStats | null;
    loading: boolean;
    error: string | null;
    /** True while the project has never received an event and we are watching for the first. */
    waitingForFirstEvent: boolean;
    refetch: () => Promise<void>;
    update: (body: {
        name?: string;
        captureLevels?: CaptureLevel[];
        allowedOrigins?: string[];
        retentionDays?: number;
        alertOnRegression?: boolean;
        /** Empty string clears it — see project.schema.ts. */
        webhookUrl?: string;
    }) => Promise<Project>;
    rotateKey: () => Promise<Project>;
}

/**
 * One project plus its issue stats, for `/p/:slug/*`.
 *
 * **The polling is the feature, not an optimisation.** A project that has never
 * received an event shows the snippet and a live "waiting for first event…"
 * indicator; the user pastes the snippet into another app, loads it, and this is
 * what flips the screen to success without them having to guess and refresh.
 * Polling stops the moment the first event lands, so the steady state is zero
 * background traffic.
 *
 * Socket-driven updates replace this in Sprint 3. Polling is the honest v1: it
 * is four lines, and it makes the empty state correct today.
 */
export function useProject(slug: string | undefined): UseProjectResult {
    const [project, setProject] = useState<Project | null>(null);
    const [stats, setStats] = useState<IssueStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Read inside the interval without making it a dependency — otherwise the
    // timer tears down and rebuilds on every poll.
    const hasEventsRef = useRef(false);

    const load = useCallback(async (showSpinner: boolean) => {
        if (!slug) return;
        if (showSpinner) setLoading(true);
        try {
            const [p, s] = await Promise.all([projectsAPI.get(slug), issuesAPI.stats(slug)]);
            setProject(p);
            setStats(s);
            hasEventsRef.current = s.lastEventAt !== null;
            setError(null);
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to load project'));
        } finally {
            if (showSpinner) setLoading(false);
        }
    }, [slug]);

    useEffect(() => {
        void load(true);
    }, [load]);

    useEffect(() => {
        if (!slug) return;
        const id = setInterval(() => {
            if (hasEventsRef.current) return;
            void load(false);
        }, WAITING_POLL_MS);
        return () => clearInterval(id);
    }, [slug, load]);

    const update = useCallback(
        async (body: Parameters<UseProjectResult['update']>[0]) => {
            if (!slug) throw new Error('No project');
            const updated = await projectsAPI.update(slug, body);
            setProject(updated);
            return updated;
        },
        [slug]
    );

    const rotateKey = useCallback(async () => {
        if (!slug) throw new Error('No project');
        const { project: updated } = await projectsAPI.rotateKey(slug);
        setProject(updated);
        return updated;
    }, [slug]);

    return {
        project,
        stats,
        loading,
        error,
        waitingForFirstEvent: stats !== null && stats.lastEventAt === null,
        refetch: () => load(true),
        update,
        rotateKey,
    };
}
