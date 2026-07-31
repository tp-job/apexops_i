import type { FC } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
    FiAlertTriangle,
    FiFolder,
    FiPlus,
    FiRadio,
    FiRotateCcw,
    FiZap,
} from 'react-icons/fi';
import {
    AccentButton,
    DataTable,
    EmptyState,
    SegmentedControl,
    SkeletonText,
    StatTile,
    Surface,
    type Column,
} from '@/components/design-system';
import { PageHeader } from '@/components/common/layout';
import { useRollup } from '@/hooks/useOverview';
import { formatNumber, relativeTime } from '@/utils/format';
import { fadeUp, stagger } from '@/lib/motion';
import type { IssueRange, RollupProject } from '@/types/projects';

const RANGES = [
    { value: '24h', label: '24h' },
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
];

/**
 * The global dashboard: **which project needs attention?**
 *
 * Rewritten 2026-07-29. The previous version charted `GET /api/logs/stats` — the
 * ApexOps server's *own* internal application log — and contained no reference to
 * projects at all. It predated the workspace layer, so it was measuring the
 * monitoring tool rather than the errors it monitors: quietly untrustworthy in a
 * way nobody would notice until they relied on it.
 *
 * The split with the project overview is deliberate and should stay sharp:
 *  - **here** — rank across projects; breadth, no detail
 *  - **`/p/:slug/overview`** — depth inside one project: volume, releases, trend
 *
 * If a number appears on both and means the same thing, one of them is redundant.
 */
const Dashboard: FC = () => {
    const { rollup, loading, error, range, setRange } = useRollup();
    const navigate = useNavigate();

    const columns: Column<RollupProject>[] = [
        {
            key: 'name',
            header: 'Project',
            render: (p) => (
                <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{p.name}</span>
                    <span className="truncate font-mono text-[11px] text-gray-400">/{p.slug}</span>
                </div>
            ),
        },
        {
            key: 'regressions',
            header: 'Regressions',
            className: 'w-32 text-right',
            render: (p) =>
                p.regressions > 0 ? (
                    <span className="inline-flex items-center gap-1.5 font-numbers text-sm font-bold tabular-nums text-global-red">
                        <FiRotateCcw size={12} />
                        {formatNumber(p.regressions)}
                    </span>
                ) : (
                    <span className="font-numbers text-sm tabular-nums text-gray-300 dark:text-gray-600">
                        0
                    </span>
                ),
        },
        {
            key: 'unresolved',
            header: 'Unresolved',
            className: 'w-28 text-right',
            render: (p) => (
                <span className="font-numbers text-sm tabular-nums text-brand-dark dark:text-gray-200">
                    {formatNumber(p.unresolved)}
                </span>
            ),
        },
        {
            key: 'newIssues',
            header: 'New',
            className: 'w-20 text-right',
            hideOnMobile: true,
            render: (p) => (
                <span className="font-numbers text-sm tabular-nums text-gray-500 dark:text-gray-400">
                    {formatNumber(p.newIssues)}
                </span>
            ),
        },
        {
            key: 'events',
            header: 'Events',
            className: 'w-24 text-right',
            hideOnMobile: true,
            render: (p) => (
                <span className="font-numbers text-sm tabular-nums text-gray-500 dark:text-gray-400">
                    {formatNumber(p.events)}
                </span>
            ),
        },
        {
            key: 'lastEventAt',
            header: 'Last event',
            className: 'w-36',
            hideOnMobile: true,
            render: (p) =>
                // Never-received and quiet are different states. Rendering both as a
                // dash is how an uninstalled integration hides as a healthy one.
                p.lastEventAt === null ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-400">
                        <FiRadio size={11} />
                        never
                    </span>
                ) : (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                        {relativeTime(p.lastEventAt)}
                    </span>
                ),
        },
    ];

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Dashboard"
                subtitle="Across every project you belong to"
                actions={
                    <SegmentedControl
                        segments={RANGES}
                        value={range}
                        onChange={(v) => setRange(v as IssueRange)}
                    />
                }
            />

            {error && (
                <Surface variant="panel" padding="md">
                    <p className="flex items-center gap-2 text-sm text-global-red">
                        <FiAlertTriangle size={16} />
                        {error}
                    </p>
                </Surface>
            )}

            {loading && !rollup ? (
                <SkeletonText lines={6} lineHeight="h-20" />
            ) : !rollup || rollup.projects.length === 0 ? (
                <Surface variant="panel" padding="md">
                    <EmptyState
                        icon={<FiFolder size={22} />}
                        title="No projects yet"
                        description="Everything ApexOps reports hangs off a project. Create one to get an ingest key."
                        action={
                            <Link to="/projects">
                                <AccentButton icon={<FiPlus size={16} />}>Create a project</AccentButton>
                            </Link>
                        }
                    />
                </Surface>
            ) : (
                <>
                    <motion.div
                        variants={stagger()}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
                    >
                        <motion.div variants={fadeUp}>
                            <StatTile
                                label="Regressions"
                                value={rollup.totals.regressions}
                                icon={<FiRotateCcw size={18} />}
                            />
                        </motion.div>
                        <motion.div variants={fadeUp}>
                            <StatTile
                                label="Unresolved issues"
                                value={rollup.totals.unresolved}
                                icon={<FiAlertTriangle size={18} />}
                            />
                        </motion.div>
                        <motion.div variants={fadeUp}>
                            <StatTile
                                label="Events"
                                value={rollup.totals.events}
                                icon={<FiZap size={18} />}
                            />
                        </motion.div>
                        <motion.div variants={fadeUp}>
                            <StatTile
                                label="Projects"
                                value={rollup.totals.projects}
                                icon={<FiFolder size={18} />}
                            />
                        </motion.div>
                    </motion.div>

                    {rollup.totals.awaitingFirstEvent > 0 && (
                        <p className="-mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <FiRadio size={12} />
                            {rollup.totals.awaitingFirstEvent} project
                            {rollup.totals.awaitingFirstEvent === 1 ? '' : 's'} still awaiting a first
                            event — the snippet is not installed anywhere yet.
                        </p>
                    )}

                    <Surface variant="panel" padding="md" className="flex flex-col gap-4">
                        <div>
                            <h2 className="font-heading text-base font-bold text-brand-dark dark:text-white">
                                Projects by attention needed
                            </h2>
                            {/* Saying the sort out loud matters: a ranked list whose order
                                you cannot explain reads as arbitrary. */}
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                Ranked by regressions, then unresolved issues, then volume — one
                                regression outranks a pile of stale open issues.
                            </p>
                        </div>

                        <DataTable
                            caption="Projects ranked by attention needed"
                            columns={columns}
                            rows={rollup.projects}
                            rowKey={(p) => p.id}
                            onRowClick={(p) => navigate(`/p/${p.slug}/overview`)}
                        />
                    </Surface>
                </>
            )}
        </div>
    );
};

export default Dashboard;
