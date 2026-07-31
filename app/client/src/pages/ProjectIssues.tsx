import type { FC } from 'react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiAlertTriangle, FiInbox, FiRadio, FiRotateCcw, FiSearch, FiZap } from 'react-icons/fi';
import {
    AccentButton,
    Badge,
    DataTable,
    EmptyState,
    Input,
    Pagination,
    SegmentedControl,
    Surface,
    type Column,
} from '@/components/design-system';
import { PageHeader } from '@/components/common/layout';
import ProjectTabs from '@/components/layouts/ProjectTabs';
import { useIssues } from '@/hooks/useIssues';
import { useProject } from '@/hooks/useProject';
import { getErrorMessage } from '@/utils/error';
import { formatNumber, issueStatusTone, levelTone, relativeTime } from '@/utils/format';
import type { Issue } from '@/types/projects';

const STATUS_SEGMENTS = [
    { value: '', label: 'All' },
    { value: 'unresolved', label: 'Unresolved' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'ignored', label: 'Ignored' },
];

const ProjectIssues: FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { project, stats, waitingForFirstEvent } = useProject(slug);
    const {
        issues, total, pageSize, query, loading, error, filtered,
        setFilter, setPage, setSort, clearFilters, promote,
    } = useIssues(slug);

    const [promoting, setPromoting] = useState<number | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [promoted, setPromoted] = useState<{ issueId: number; displayId: string } | null>(null);

    const handlePromote = async (issue: Issue) => {
        setPromoting(issue.id);
        setActionError(null);
        try {
            const ticket = await promote(issue.id);
            setPromoted({ issueId: issue.id, displayId: ticket.displayId });
        } catch (err) {
            setActionError(getErrorMessage(err, 'Could not create ticket'));
        } finally {
            setPromoting(null);
        }
    };

    const columns: Column<Issue>[] = [
        {
            key: 'level',
            header: 'Level',
            className: 'w-20',
            render: (i) => <Badge tone={levelTone(i.level)}>{i.level}</Badge>,
        },
        {
            key: 'title',
            header: 'Issue',
            render: (i) => (
                <div className="flex min-w-0 flex-col">
                    <span className="flex items-center gap-2">
                        <span className="truncate font-medium">{i.title}</span>
                        {/* A fix that did not hold is more urgent than a new bug, so
                            it gets a badge in the list rather than only on detail. */}
                        {i.reopenCount > 0 && (
                            <span
                                title={`Resolved and came back ${i.reopenCount} time${i.reopenCount === 1 ? '' : 's'}`}
                                className="inline-flex shrink-0 items-center gap-1 rounded-md bg-global-red/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-global-red"
                            >
                                <FiRotateCcw size={9} />
                                regression
                            </span>
                        )}
                    </span>
                    {i.culprit && (
                        <span className="truncate font-mono text-[11px] text-gray-400">{i.culprit}</span>
                    )}
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            className: 'w-28',
            hideOnMobile: true,
            render: (i) => <Badge tone={issueStatusTone(i.status)}>{i.status}</Badge>,
        },
        {
            key: 'count',
            header: 'Events',
            sortable: true,
            className: 'w-24 text-right',
            hideOnMobile: true,
            render: (i) => (
                <span className="font-numbers tabular-nums">{formatNumber(i.count)}</span>
            ),
        },
        {
            key: 'lastSeen',
            header: 'Last seen',
            sortable: true,
            className: 'w-32',
            hideOnMobile: true,
            render: (i) => (
                <span className="text-xs text-gray-500 dark:text-gray-400">{relativeTime(i.lastSeen)}</span>
            ),
        },
        {
            key: 'actions',
            header: '',
            className: 'w-36 text-right',
            render: (i) => (
                // The row navigates to the issue; these controls must not. Without
                // stopping propagation, "Create ticket" would also open the detail
                // page and the user would lose sight of what just happened.
                <span
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    role="presentation"
                >
                    {/* Already promoted: link to the ticket rather than offering a
                        second one. `Issue.ticketId` is unique, so a duplicate would
                        409 anyway — this makes that state legible instead of an error. */}
                    {i.ticketId ? (
                        <Link
                            to="/bug-tracker"
                            className="text-xs font-semibold text-brand-dark underline-offset-2 hover:underline dark:text-brand-accent"
                        >
                            TICK-{String(i.ticketId).padStart(3, '0')}
                        </Link>
                    ) : (
                        <AccentButton
                            size="sm"
                            variant="ghost"
                            icon={<FiZap size={13} />}
                            disabled={promoting === i.id}
                            onClick={() => void handlePromote(i)}
                        >
                            {promoting === i.id ? 'Creating…' : 'Create ticket'}
                        </AccentButton>
                    )}
                </span>
            ),
        },
    ];

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title={project?.name ?? 'Issues'}
                subtitle={
                    stats
                        ? `${formatNumber(stats.unresolved)} unresolved · ${formatNumber(stats.eventsLast24h)} events in 24h`
                        : 'Grouped by fingerprint — one row per distinct error'
                }
            />

            {slug && <ProjectTabs slug={slug} />}

            {promoted && (
                <Surface variant="panel" padding="sm">
                    <p className="flex flex-wrap items-center gap-2 text-sm text-brand-dark dark:text-white">
                        <FiZap size={15} />
                        Created <strong>{promoted.displayId}</strong> on this project&apos;s board.
                        <Link
                            to="/bug-tracker"
                            className="font-semibold underline underline-offset-2 dark:text-brand-accent"
                        >
                            Open Bug Tracker
                        </Link>
                    </p>
                </Surface>
            )}

            {(error || actionError) && (
                <Surface variant="panel" padding="sm">
                    <p role="alert" className="flex items-center gap-2 text-sm text-global-red">
                        <FiAlertTriangle size={15} />
                        {error ?? actionError}
                    </p>
                </Surface>
            )}

            <Surface variant="panel" padding="md" className="flex flex-col gap-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <SegmentedControl
                        segments={STATUS_SEGMENTS}
                        value={query.status}
                        onChange={(v) => setFilter({ status: v })}
                    />

                    <div className="flex items-center gap-2">
                        <div className="w-56">
                            <Input
                                id="issue-search"
                                aria-label="Search issues"
                                placeholder="Search title or culprit"
                                icon={<FiSearch size={15} />}
                                value={query.q}
                                onChange={(e) => setFilter({ q: e.target.value })}
                            />
                        </div>
                        {filtered && (
                            <AccentButton variant="ghost" size="sm" onClick={clearFilters}>
                                Clear
                            </AccentButton>
                        )}
                    </div>
                </div>

                <DataTable
                    caption={`Issues for ${project?.name ?? 'project'}`}
                    columns={columns}
                    rows={issues}
                    rowKey={(i) => i.id}
                    loading={loading}
                    onRowClick={(i) => navigate(`/p/${slug}/issues/${i.id}`)}
                    sort={{ key: query.sort, direction: query.direction }}
                    onSortChange={setSort}
                    empty={
                        // Three genuinely different empty states. Collapsing them into
                        // one "No data" is what makes a monitoring tool feel broken:
                        // never-installed, filtered-to-nothing and quiet-but-healthy
                        // need different words and different next actions.
                        waitingForFirstEvent ? (
                            <EmptyState
                                icon={<FiRadio size={20} />}
                                title="Waiting for the first event"
                                description="Nothing has been reported yet. Install the snippet in the app you want to monitor — this page updates on its own."
                                action={
                                    project && (
                                        <Link to={`/p/${project.slug}/settings`}>
                                            <AccentButton size="sm">Get the snippet</AccentButton>
                                        </Link>
                                    )
                                }
                            />
                        ) : filtered ? (
                            <EmptyState
                                icon={<FiSearch size={20} />}
                                title="No issues match these filters"
                                description="Try a different status or clear the search."
                                action={
                                    <AccentButton size="sm" variant="ghost" onClick={clearFilters}>
                                        Clear filters
                                    </AccentButton>
                                }
                            />
                        ) : (
                            <EmptyState
                                icon={<FiInbox size={20} />}
                                title="No issues"
                                description="This project is reporting and has nothing unresolved. That is the good state."
                            />
                        )
                    }
                />

                <Pagination
                    page={query.page}
                    pageSize={pageSize}
                    total={total}
                    onPageChange={setPage}
                    itemLabel="issues"
                />
            </Surface>
        </div>
    );
};

export default ProjectIssues;
