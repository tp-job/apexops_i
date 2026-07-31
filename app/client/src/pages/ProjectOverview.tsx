import type { FC } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    FiAlertTriangle,
    FiPackage,
    FiRadio,
    FiRotateCcw,
    FiTrendingUp,
} from 'react-icons/fi';
import {
    AccentButton,
    Badge,
    EmptyState,
    SegmentedControl,
    SkeletonText,
    Surface,
} from '@/components/design-system';
import { PageHeader } from '@/components/common/layout';
import ProjectTabs from '@/components/layouts/ProjectTabs';
import EventVolumeChart, { type ChartMarker } from '@/components/charts/EventVolumeChart';
import { useProjectOverview } from '@/hooks/useOverview';
import { formatDate, formatNumber, levelTone, relativeTime } from '@/utils/format';
import type { IssueRange, OverviewIssue } from '@/types/projects';

const RANGES = [
    { value: '24h', label: '24h' },
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
];

const Kpi: FC<{ label: string; value: string; hint?: string; tone?: 'danger' | 'normal' }> = ({
    label,
    value,
    hint,
    tone = 'normal',
}) => (
    <div className="flex flex-col gap-0.5">
        <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
        <p
            className={`font-numbers text-2xl font-bold tabular-nums ${
                tone === 'danger' && value !== '0'
                    ? 'text-global-red'
                    : 'text-brand-dark dark:text-white'
            }`}
        >
            {value}
        </p>
        {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
);

const IssueRow: FC<{ issue: OverviewIssue; slug: string; showReopen?: boolean }> = ({
    issue,
    slug,
    showReopen,
}) => (
    <Link
        to={`/p/${slug}/issues/${issue.id}`}
        className="flex items-center gap-3 rounded-xl px-2 py-2 outline-none transition-colors hover:bg-black/[0.03] focus-visible:bg-black/[0.03] dark:hover:bg-white/5 dark:focus-visible:bg-white/5"
    >
        <Badge tone={levelTone(issue.level)}>{issue.level}</Badge>
        <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-brand-dark dark:text-gray-200">
                {issue.title}
            </span>
            {issue.culprit && (
                <span className="block truncate font-mono text-[11px] text-gray-400">
                    {issue.culprit}
                </span>
            )}
        </span>
        {showReopen ? (
            <span className="shrink-0 text-xs font-semibold text-global-red">
                ×{issue.reopenCount}
            </span>
        ) : (
            <span className="shrink-0 font-numbers text-xs tabular-nums text-gray-400">
                {formatNumber(issue.count)}
            </span>
        )}
    </Link>
);

/**
 * `/p/:slug/overview` — the single-project trend surface.
 *
 * Its job is **trend**, not state: the issue list already answers "what is
 * broken". This answers "is it getting better or worse, and did that start with
 * a deploy?" Any number here that can be read off the issue list unchanged does
 * not earn its place.
 */
const ProjectOverview: FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const { overview, loading, error, range, setRange } = useProjectOverview(slug);

    if (loading && !overview) return <SkeletonText lines={8} lineHeight="h-16" />;

    if (error || !overview) {
        return (
            <Surface variant="panel" padding="md">
                <p className="flex items-center gap-2 text-sm text-global-red">
                    <FiAlertTriangle size={16} />
                    {error ?? 'Project not found'}
                </p>
            </Surface>
        );
    }

    const { kpis, releases, allReleases, topIssues, regressedIssues } = overview;
    const neverReceived = kpis.lastEventAt === null;

    const markers: ChartMarker[] = releases.map((r) => ({
        at: r.firstSeenAt,
        label: r.release,
        kind: 'release',
    }));

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title={overview.project.name}
                subtitle="Trend, releases and regressions"
                actions={
                    <SegmentedControl
                        segments={RANGES}
                        value={range}
                        onChange={(v) => setRange(v as IssueRange)}
                    />
                }
            />

            <ProjectTabs slug={slug!} />

            {/* Never-received is a different problem from quiet, and needs a
                different next action — the snippet, not the issue list. */}
            {neverReceived && (
                <Surface variant="panel" padding="md">
                    <EmptyState
                        icon={<FiRadio size={20} />}
                        title="No events received yet"
                        description="This project has never reported an error. Install the snippet in the app you want to monitor and this page fills in on its own."
                        action={
                            <Link to={`/p/${slug}/settings`}>
                                <AccentButton size="sm">Get the snippet</AccentButton>
                            </Link>
                        }
                    />
                </Surface>
            )}

            {!neverReceived && (
                <>
                    {/* ── Volume + release markers ────────────────── */}
                    <Surface variant="panel" padding="md" className="flex flex-col gap-5">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h2 className="font-heading text-base font-bold text-brand-dark dark:text-white">
                                Event volume
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {formatNumber(kpis.eventsInWindow)} events ·{' '}
                                {releases.length
                                    ? `${releases.length} release${releases.length === 1 ? '' : 's'} in this window`
                                    : 'no releases in this window'}
                            </p>
                        </div>

                        <EventVolumeChart
                            buckets={overview.volume}
                            range={range}
                            markers={markers}
                            unitLabel="events"
                        />

                        {releases.length > 0 ? (
                            <div className="flex flex-wrap gap-2 border-t border-gray-200 pt-4 dark:border-white/10">
                                {releases.map((r) => (
                                    <span
                                        key={r.release}
                                        className="inline-flex items-center gap-2 rounded-lg bg-black/[0.04] px-2.5 py-1.5 text-xs dark:bg-white/[0.07]"
                                    >
                                        <FiPackage size={12} className="text-gray-400" />
                                        <span className="font-mono text-brand-dark dark:text-gray-200">
                                            {r.release}
                                        </span>
                                        <span className="text-gray-400">
                                            first seen {relativeTime(r.firstSeenAt)} ·{' '}
                                            {formatNumber(r.eventsInWindow)} events
                                        </span>
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="border-t border-gray-200 pt-4 text-[11px] text-gray-400 dark:border-white/10">
                                {allReleases.length
                                    ? `No new release appeared in this window. Most recent: ${allReleases[0].release}, first seen ${relativeTime(allReleases[0].firstSeenAt)}.`
                                    : 'No release information. Set data-release on the SDK snippet to pin deploys onto this chart.'}
                            </p>
                        )}
                    </Surface>

                    {/* ── KPIs ────────────────────────────────────── */}
                    <Surface variant="panel" padding="md">
                        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
                            <Kpi label="Unresolved" value={formatNumber(kpis.unresolved)} hint={`of ${formatNumber(kpis.totalIssues)} total`} />
                            <Kpi label="New issues" value={formatNumber(kpis.newIssues)} hint="first seen in window" />
                            <Kpi
                                label="Regressions"
                                value={formatNumber(kpis.regressions)}
                                hint="fixed, then came back"
                                tone="danger"
                            />
                            <Kpi label="Open tickets" value={formatNumber(kpis.openTickets)} hint="on the board" />
                            <Kpi
                                label="Last event"
                                value={relativeTime(kpis.lastEventAt)}
                                hint={formatDate(kpis.lastEventAt)}
                            />
                        </div>
                    </Surface>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {/* ── Regressions ─────────────────────────── */}
                        <Surface variant="panel" padding="md" className="flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <FiRotateCcw size={15} className="text-global-red" />
                                <h2 className="font-heading text-base font-bold text-brand-dark dark:text-white">
                                    Came back
                                </h2>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Issues marked resolved that have since recurred. A count you can
                                click — these are the ones a fix did not hold for.
                            </p>
                            {regressedIssues.length ? (
                                <div className="flex flex-col">
                                    {regressedIssues.map((i) => (
                                        <IssueRow key={i.id} issue={i} slug={slug!} showReopen />
                                    ))}
                                </div>
                            ) : (
                                <EmptyState
                                    size="sm"
                                    title="No regressions"
                                    description="Nothing resolved in this window has come back."
                                />
                            )}
                        </Surface>

                        {/* ── Top issues ──────────────────────────── */}
                        <Surface variant="panel" padding="md" className="flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <FiTrendingUp size={15} className="text-gray-400" />
                                <h2 className="font-heading text-base font-bold text-brand-dark dark:text-white">
                                    Loudest issues
                                </h2>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Unresolved, by total occurrences.
                            </p>
                            {topIssues.length ? (
                                <div className="flex flex-col">
                                    {topIssues.map((i) => (
                                        <IssueRow key={i.id} issue={i} slug={slug!} />
                                    ))}
                                </div>
                            ) : (
                                <EmptyState size="sm" title="Nothing unresolved" />
                            )}
                            <Link
                                to={`/p/${slug}/issues`}
                                className="mt-1 text-xs font-semibold text-brand-dark underline-offset-2 hover:underline dark:text-brand-accent"
                            >
                                All issues →
                            </Link>
                        </Surface>
                    </div>
                </>
            )}
        </div>
    );
};

export default ProjectOverview;
