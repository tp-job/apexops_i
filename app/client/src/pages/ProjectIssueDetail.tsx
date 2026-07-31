import type { FC } from 'react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    FiAlertTriangle,
    FiArrowLeft,
    FiCheckCircle,
    FiCopy,
    FiEyeOff,
    FiRotateCcw,
    FiZap,
} from 'react-icons/fi';
import {
    AccentButton,
    Badge,
    SegmentedControl,
    SkeletonText,
    Surface,
    Timeline,
    type TimelineItem,
} from '@/components/design-system';
import { PageHeader } from '@/components/common/layout';
import EventVolumeChart from '@/components/charts/EventVolumeChart';
import { useIssueDetail } from '@/hooks/useIssueDetail';
import { useToast } from '@/context/toast-context';
import { getErrorMessage } from '@/utils/error';
import { formatDate, formatNumber, levelTone, relativeTime } from '@/utils/format';
import type { BreakdownEntry, IssueRange } from '@/types/projects';

const RANGES: { value: IssueRange; label: string }[] = [
    { value: '24h', label: '24h' },
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
];

const Stat: FC<{ label: string; value: string; hint?: string }> = ({ label, value, hint }) => (
    <div className="flex flex-col gap-0.5">
        <p className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
        <p className="font-numbers text-xl font-bold tabular-nums text-brand-dark dark:text-white">
            {value}
        </p>
        {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
);

const BreakdownBars: FC<{ title: string; entries: BreakdownEntry[]; total: number }> = ({
    title,
    entries,
    total,
}) => (
    <div className="flex flex-col gap-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {title}
        </p>
        {entries.slice(0, 5).map((e) => {
            const pct = total === 0 ? 0 : Math.round((e.count / total) * 100);
            return (
                <div key={e.name} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                        <span className="truncate text-brand-dark dark:text-gray-200">{e.name}</span>
                        <span className="shrink-0 font-numbers tabular-nums text-gray-400">{pct}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
                        <div
                            className="h-full rounded-full bg-brand-dark/60 dark:bg-brand-accent/70"
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                </div>
            );
        })}
        {entries.length === 0 && <p className="text-xs text-gray-400">No data</p>}
    </div>
);

const ProjectIssueDetail: FC = () => {
    const { slug, id } = useParams<{ slug: string; id: string }>();
    const numericId = Number.parseInt(id ?? '', 10);
    const issueId = Number.isSafeInteger(numericId) && numericId > 0 ? numericId : null;

    const { issue, loading, error, range, setRange, setStatus, promote } = useIssueDetail(
        slug,
        issueId
    );
    const toast = useToast();
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);

    const act = async (fn: () => Promise<unknown>, ok: string, fail: string) => {
        setBusy(true);
        try {
            await fn();
            toast.showSuccess(ok);
        } catch (err) {
            toast.showError(getErrorMessage(err, fail));
        } finally {
            setBusy(false);
        }
    };

    if (loading && !issue) return <SkeletonText lines={8} lineHeight="h-16" />;

    if (error || !issue) {
        return (
            <Surface variant="panel" padding="md">
                <p className="flex items-center gap-2 text-sm text-global-red">
                    <FiAlertTriangle size={16} />
                    {error ?? 'Issue not found'}
                </p>
                <Link
                    to={`/p/${slug}/issues`}
                    className="mt-3 inline-block text-sm font-semibold underline underline-offset-2 dark:text-brand-accent"
                >
                    Back to issues
                </Link>
            </Surface>
        );
    }

    const latest = issue.latestEvent;
    const eventItems: TimelineItem[] = issue.recentEvents.map((e) => ({
        id: e.id,
        title: e.url ? new URL(e.url, window.location.origin).pathname : e.message.slice(0, 80),
        meta: [e.release, e.userAgent?.slice(0, 60)].filter(Boolean).join(' · ') || undefined,
        timestamp: relativeTime(e.createdAt),
        tone: e.level === 'error' ? 'danger' : e.level === 'warn' ? 'warning' : 'neutral',
    }));

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title={issue.title}
                subtitle={issue.culprit ?? 'No stack frame reported'}
                onBack={() => navigate(`/p/${slug}/issues`)}
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        {issue.status !== 'resolved' && (
                            <AccentButton
                                variant="ghost"
                                size="sm"
                                icon={<FiCheckCircle size={14} />}
                                disabled={busy}
                                onClick={() =>
                                    void act(
                                        () => setStatus('resolved'),
                                        'Marked resolved',
                                        'Could not update status'
                                    )
                                }
                            >
                                Resolve
                            </AccentButton>
                        )}
                        {issue.status === 'resolved' && (
                            <AccentButton
                                variant="ghost"
                                size="sm"
                                icon={<FiRotateCcw size={14} />}
                                disabled={busy}
                                onClick={() =>
                                    void act(
                                        () => setStatus('unresolved'),
                                        'Reopened',
                                        'Could not update status'
                                    )
                                }
                            >
                                Reopen
                            </AccentButton>
                        )}
                        {issue.status !== 'ignored' && (
                            <AccentButton
                                variant="ghost"
                                size="sm"
                                icon={<FiEyeOff size={14} />}
                                disabled={busy}
                                onClick={() =>
                                    void act(
                                        () => setStatus('ignored'),
                                        'Ignored — recurrences will not reopen it',
                                        'Could not update status'
                                    )
                                }
                            >
                                Ignore
                            </AccentButton>
                        )}

                        {issue.ticketId ? (
                            <Link to="/bug-tracker">
                                <AccentButton size="sm" variant="ghost">
                                    TICK-{String(issue.ticketId).padStart(3, '0')}
                                </AccentButton>
                            </Link>
                        ) : (
                            <AccentButton
                                size="sm"
                                icon={<FiZap size={14} />}
                                disabled={busy}
                                onClick={() =>
                                    void act(
                                        async () => {
                                            const t = await promote();
                                            toast.showSuccess(`Created ${t.displayId}`);
                                        },
                                        'Ticket created',
                                        'Could not create ticket'
                                    )
                                }
                            >
                                Create ticket
                            </AccentButton>
                        )}
                    </div>
                }
            />

            <div className="flex flex-wrap items-center gap-2">
                <Badge tone={levelTone(issue.level)}>{issue.level}</Badge>
                <Badge tone="neutral">{issue.status}</Badge>
                {issue.culprit && (
                    <code className="rounded-md bg-black/[0.06] px-2 py-0.5 font-mono text-xs text-gray-600 dark:bg-white/10 dark:text-gray-300">
                        {issue.culprit}
                    </code>
                )}
            </div>

            {/* ── Occurrence timeline ─────────────────────────── */}
            <Surface variant="panel" padding="md" className="flex flex-col gap-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="font-heading text-base font-bold text-brand-dark dark:text-white">
                            When it happened
                        </h2>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            {formatNumber(issue.storedInRange)} events stored in this window
                        </p>
                    </div>
                    <SegmentedControl
                        segments={RANGES}
                        value={range}
                        onChange={(v) => setRange(v as IssueRange)}
                    />
                </div>

                <EventVolumeChart
                    buckets={issue.timeline}
                    range={range}
                    unitLabel="events"
                    markers={[{ at: issue.firstSeen, label: 'First seen', kind: 'event' }]}
                />

                <div className="grid grid-cols-2 gap-5 border-t border-gray-200 pt-4 dark:border-white/10 sm:grid-cols-4">
                    <Stat
                        label="Occurrences"
                        value={formatNumber(issue.count)}
                        hint="Includes repeats the SDK collapsed"
                    />
                    <Stat
                        label="Events stored"
                        value={formatNumber(issue.storedTotal)}
                        hint="Pruned on the retention window"
                    />
                    <Stat label="First seen" value={relativeTime(issue.firstSeen)} hint={formatDate(issue.firstSeen)} />
                    <Stat label="Last seen" value={relativeTime(issue.lastSeen)} hint={formatDate(issue.lastSeen)} />
                </div>

                {/* The chart and the headline count are different numbers by design.
                    Saying so is cheaper than fielding the question every time. */}
                <p className="text-[11px] leading-5 text-gray-400">
                    The bars count <strong>stored events</strong>, not occurrences. The SDK collapses
                    identical repeats inside a 5-second window into one event carrying a count, so the
                    bars will not add up to {formatNumber(issue.count)}.
                </p>
            </Surface>

            {/* ── Latest event ────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Surface variant="panel" padding="md" className="flex flex-col gap-4 lg:col-span-2">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="font-heading text-base font-bold text-brand-dark dark:text-white">
                            Latest event
                        </h2>
                        {latest && (
                            <span className="text-xs text-gray-400">{formatDate(latest.createdAt)}</span>
                        )}
                    </div>

                    {latest ? (
                        <>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{latest.message}</p>

                            {latest.url && (
                                <p className="truncate font-mono text-xs text-gray-400">{latest.url}</p>
                            )}

                            {latest.stack ? (
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            void navigator.clipboard
                                                .writeText(latest.stack ?? '')
                                                .then(() => toast.showSuccess('Stack trace copied'))
                                                .catch(() => toast.showError('Could not copy'));
                                        }}
                                        className="absolute right-2 top-2 z-10 inline-flex items-center gap-1.5 rounded-lg bg-white/80 px-2 py-1 text-[11px] font-semibold text-gray-500 shadow-sm outline-none transition-colors hover:text-brand-dark focus-visible:ring-2 focus-visible:ring-brand-dark/30 dark:bg-white/10 dark:text-gray-300 dark:hover:text-white"
                                    >
                                        <FiCopy size={11} /> Copy
                                    </button>
                                    <pre className="max-h-80 overflow-auto rounded-2xl border border-gray-200 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                                        <code className="font-mono text-[12px] leading-6 text-brand-dark dark:text-gray-200">
                                            {latest.stack}
                                        </code>
                                    </pre>
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400">
                                    No stack trace was reported with this event.
                                </p>
                            )}
                        </>
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            No stored events. Raw events are pruned on the project&apos;s retention
                            window — the issue totals above survive.
                        </p>
                    )}
                </Surface>

                {/* ── Breakdown ───────────────────────────────── */}
                <Surface variant="panel" padding="md" className="flex flex-col gap-5">
                    <div>
                        <h2 className="font-heading text-base font-bold text-brand-dark dark:text-white">
                            Where it happened
                        </h2>
                        <p className="mt-0.5 text-[11px] text-gray-400">
                            From the {formatNumber(issue.breakdown.sampledFrom)} most recent events.
                            User agents are self-reported, so treat these as approximate.
                        </p>
                    </div>
                    <BreakdownBars
                        title="Browser"
                        entries={issue.breakdown.browsers}
                        total={issue.breakdown.sampledFrom}
                    />
                    <BreakdownBars
                        title="OS"
                        entries={issue.breakdown.os}
                        total={issue.breakdown.sampledFrom}
                    />
                    <BreakdownBars
                        title="Release"
                        entries={issue.breakdown.releases}
                        total={issue.breakdown.sampledFrom}
                    />
                </Surface>
            </div>

            {/* ── Recent events rail ──────────────────────────── */}
            {eventItems.length > 0 && (
                <Surface variant="panel" padding="md" className="flex flex-col gap-4">
                    <h2 className="font-heading text-base font-bold text-brand-dark dark:text-white">
                        Recent events
                    </h2>
                    <Timeline items={eventItems} reveal />
                </Surface>
            )}

            <Link
                to={`/p/${slug}/issues`}
                className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition-colors hover:text-brand-dark dark:text-gray-400 dark:hover:text-white"
            >
                <FiArrowLeft size={14} /> All issues
            </Link>
        </div>
    );
};

export default ProjectIssueDetail;
