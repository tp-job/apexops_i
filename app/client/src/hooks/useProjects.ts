import { useCallback, useEffect, useState } from 'react';
import { projectsAPI } from '@/services/projects';
import type { Project } from '@/types/projects';
import { getErrorMessage } from '@/utils/error';

export interface UseProjectsResult {
    projects: Project[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    create: (body: { name: string; slug?: string }) => Promise<Project>;
}

/**
 * The caller's project list — the `/projects` grid and the Topbar switcher.
 *
 * `create` returns the new project *and* prepends it locally rather than
 * refetching: the caller navigates straight into the new workspace, and waiting
 * on a second round trip to render a list the user is leaving is wasted latency.
 */
export function useProjects(includeArchived = false): UseProjectsResult {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refetch = useCallback(async () => {
        setLoading(true);
        try {
            setProjects(await projectsAPI.list(includeArchived));
            setError(null);
        } catch (err) {
            setError(getErrorMessage(err, 'Failed to load projects'));
        } finally {
            setLoading(false);
        }
    }, [includeArchived]);

    useEffect(() => {
        void refetch();
    }, [refetch]);

    const create = useCallback(async (body: { name: string; slug?: string }) => {
        const project = await projectsAPI.create(body);
        setProjects((prev) => [project, ...prev]);
        return project;
    }, []);

    return { projects, loading, error, refetch, create };
}
