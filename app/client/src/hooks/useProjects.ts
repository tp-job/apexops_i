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
    rename: (slug: string, name: string) => Promise<Project>;
    archive: (slug: string) => Promise<void>;
    restore: (slug: string) => Promise<Project>;
}

/**
 * The caller's project list — the `/projects` grid and the Topbar switcher.
 *
 * Mutations update local state rather than refetching. The list is the screen
 * the user is looking at while they act on it, so a full round trip to redraw a
 * row that only changed its name is latency they can see.
 *
 * Errors deliberately **propagate** instead of being swallowed into `error`:
 * that field is for "the list failed to load", which is a whole-page state. A
 * failed rename has to surface next to the rename form, so the caller awaits and
 * catches.
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

    const rename = useCallback(async (slug: string, name: string) => {
        const updated = await projectsAPI.update(slug, { name });
        setProjects((prev) => prev.map((p) => (p.slug === slug ? updated : p)));
        return updated;
    }, []);

    const archive = useCallback(
        async (slug: string) => {
            const { project } = await projectsAPI.archive(slug);
            setProjects((prev) =>
                // When archived projects are hidden the row leaves the list; when
                // they are shown it stays and re-renders as archived. Refetching
                // instead would be one extra round trip for a state we already have.
                includeArchived
                    ? prev.map((p) => (p.slug === slug ? project : p))
                    : prev.filter((p) => p.slug !== slug)
            );
        },
        [includeArchived]
    );

    const restore = useCallback(async (slug: string) => {
        const project = await projectsAPI.restore(slug);
        setProjects((prev) => prev.map((p) => (p.slug === slug ? project : p)));
        return project;
    }, []);

    return { projects, loading, error, refetch, create, rename, archive, restore };
}
