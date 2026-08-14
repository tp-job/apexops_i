import type { FC } from 'react';
import { useParams } from 'react-router-dom';
import { FiAlertTriangle } from 'react-icons/fi';
import { PageHeader, SkeletonText, Surface } from '@/components/design-system';
import ProjectTabs from '@/components/layout/ProjectTabs';
import BugTracker from './BugTracker';
import { useProject } from '@/hooks/useProject';

/**
 * `/p/:slug/board` — the Bug Tracker board, scoped to one project.
 *
 * A thin wrapper, not a second board: `BugTracker` already does triage +
 * detail + comments, and duplicating 750 lines to change a filter would be the
 * exact four-Select-components failure the design-system plan warned about.
 * This page supplies the project chrome (`PageHeader` + `ProjectTabs`) that
 * `BugTracker` deliberately omits when it is given a `projectId`.
 */
const ProjectBoard: FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const { project, loading, error } = useProject(slug);

    if (loading && !project) return <SkeletonText lines={6} lineHeight="h-16" />;

    if (error || !project) {
        return (
            <Surface variant="panel" padding="md">
                <p className="flex items-center gap-2 text-sm text-global-red">
                    <FiAlertTriangle size={16} />
                    {error ?? 'Project not found'}
                </p>
            </Surface>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <PageHeader title={project.name} subtitle="Tickets for this project" />

            {slug && <ProjectTabs slug={slug} />}

            <BugTracker projectId={project.id} />
        </div>
    );
};

export default ProjectBoard;
