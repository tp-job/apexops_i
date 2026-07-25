import type { FC, ReactNode } from 'react';
import { useMemo } from 'react';
import { motion } from 'motion/react';
import {
    FiActivity,
    FiAlertOctagon,
    FiAlertTriangle,
    FiCheckCircle,
    FiClock,
    FiInbox,
    FiRefreshCw,
    FiShield,
    FiTerminal,
} from 'react-icons/fi';
import {
    Surface,
    StatTile,
    Meter,
    AccentButton,
    Badge,
    AnimatedNumber,
    EmptyState,
} from '@/components/design-system';
import { PageHeader } from '@/components/common/layout';
import { useAuth } from '@/context/auth-context';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import type { FocusItem, LogStats, TicketStats } from '@/types/dashboard';
import { fadeUp, scaleIn, stagger } from '@/lib/motion';

/**
 * Dashboard — the workspace home.
 *
 * Composed from the Luxe primitives only; no template was harvested for the
 * layout because `dashboard-template.html` is the `#ccff33` file that
 * `template-adoption.md` flags as the highest contamination risk. Its IA
 * (KPI band → breakdown → activity) is reflected here; none of its CSS is.
 *
 * Data comes from `GET /api/tickets/stats` and `GET /api/logs/stats` via
 * `useDashboardStats`, which tolerates one endpoint failing without blanking
 * the page.
 */

// ── Panel heading ─────────────────────────────────────────────
const PanelHead: FC<{ icon: ReactNode; title: string; aside?: ReactNode }> = ({ icon, title, aside }) => (
    <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-accent/20 text-brand-dark dark:text-brand-accent">
            {icon}
        </span>
        <h2 className="text-base font-bold font-heading text-brand-dark dark:text-white">{title}</h2>
        {aside && <div className="ml-auto">{aside}</div>}
    </div>
);

// ── Distribution row: label, count, proportional meter ─────────
const DistRow: FC<{ label: string; value: number; total: number }> = ({ label, value, total }) => (
    <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
            <span className="font-numbers text-sm font-semibold text-brand-dark dark:text-white">
                <AnimatedNumber value={value} />
            </span>
        </div>
        {/* Zero total is a real state on a fresh install — guard the division. */}
        <Meter value={total > 0 ? Math.round((value / total) * 100) : 0} knob={false} height={6} />
    </div>
);

/**
 * KPI slot for a metric whose source request failed.
 *
 * Deliberately NOT `value={x ?? 0}`. A zero here is a claim — "you have no
 * errors" — and it is the opposite of the truth when the request simply didn't
 * land. An em-dash says "unknown", which is what we actually know.
 */
const MissingTile: FC<{ label: string; icon: ReactNode }> = ({ label, icon }) => (
    <Surface variant="frost" radius="2xl" padding="md" className="h-full">
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {label}
                </span>
                <span className="text-gray-400 dark:text-gray-500">{icon}</span>
            </div>
            <span className="font-numbers text-3xl font-bold leading-none text-gray-300 dark:text-gray-600" title="Unavailable">
                —
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">Unavailable</span>
        </div>
    </Surface>
);

const SkeletonPanel: FC<{ lines?: number }> = ({ lines = 4 }) => (
    <div className="flex flex-col gap-3" aria-hidden>
        {Array.from({ length: lines }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-xl bg-black/5 dark:bg-white/5" />
        ))}
    </div>
);

/** Panel shown when one endpoint failed but the page still has something to say. */
const DegradedPanel: FC<{ what: string; onRetry: () => void }> = ({ what, onRetry }) => (
    <EmptyState
        size="sm"
        icon={<FiAlertOctagon size={20} />}
        title={`${what} unavailable`}
        description="The rest of the workspace is still live. This panel will fill in once the request succeeds."
        action={
            <AccentButton variant="ghost" size="sm" icon={<FiRefreshCw size={14} />} onClick={onRetry}>
                Retry
            </AccentButton>
        }
    />
);

// ── Focus rail: what actually needs a human ───────────────────
function buildFocus(tickets: TicketStats | null, logs: LogStats | null): FocusItem[] {
    const items: FocusItem[] = [];

    if (tickets) {
        if (tickets.byPriority.critical > 0) {
            items.push({
                id: 'critical',
                label: 'Critical tickets',
                count: tickets.byPriority.critical,
                tone: 'danger',
                hint: 'Highest priority, needs an owner now',
            });
        }
        if (tickets.byStatus.open > 0) {
            items.push({
                id: 'open',
                label: 'Unstarted tickets',
                count: tickets.byStatus.open,
                tone: 'warning',
                hint: 'Open, not yet in progress',
            });
        }
    }

    if (logs && logs.byLevel.errors > 0) {
        items.push({
            id: 'errors',
            label: 'Error-level logs',
            count: logs.byLevel.errors,
            tone: 'danger',
            hint: 'Across all sources',
        });
    }

    return items;
}

const TONE_DOT: Record<FocusItem['tone'], string> = {
    danger: 'bg-red-500',
    warning: 'bg-amber-500',
    accent: 'bg-brand-accent',
    neutral: 'bg-gray-300 dark:bg-white/25',
};

const Dashboard: FC = () => {
    const { user } = useAuth();
    const { tickets, logs, loading, error, partial, hasAuth, refetch } = useDashboardStats();

    const focus = useMemo(() => buildFocus(tickets, logs), [tickets, logs]);

    // Resolution rate is only meaningful once tickets exist — otherwise it reads
    // as "0% resolved", which is a judgement about a team that has no tickets.
    const resolutionRate =
        tickets && tickets.total > 0
            ? Math.round(((tickets.byStatus.resolved + tickets.byStatus.closed) / tickets.total) * 100)
            : null;

    const greeting = user?.firstName ? `Welcome back, ${user.firstName}` : 'Workspace';

    if (!hasAuth) {
        return (
            <div className="mx-auto w-full max-w-7xl">
                <EmptyState
                    icon={<FiShield size={22} />}
                    title="Sign in to see your workspace"
                    description="Dashboard data is scoped to your account."
                />
            </div>
        );
    }

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-7">
            <PageHeader
                title={greeting}
                subtitle="Tickets, logs and everything currently asking for attention."
                actions={
                    <AccentButton
                        variant="ghost"
                        size="sm"
                        icon={<FiRefreshCw size={14} />}
                        onClick={refetch}
                        disabled={loading}
                    >
                        {loading ? 'Refreshing…' : 'Refresh'}
                    </AccentButton>
                }
            />

            {partial && (
                <Surface variant="panel" radius="2xl" padding="sm">
                    <p className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                        <FiAlertOctagon className="shrink-0 text-amber-500" size={16} />
                        Some panels couldn&apos;t load. What you see below is current; the rest is missing, not zero.
                    </p>
                </Surface>
            )}

            {error ? (
                <Surface variant="panel" radius="3xl" padding="lg">
                    <EmptyState
                        icon={<FiAlertOctagon size={22} />}
                        title="Couldn't load the workspace"
                        description={error.message}
                        action={
                            <AccentButton variant="dark" size="sm" icon={<FiRefreshCw size={14} />} onClick={refetch}>
                                Try again
                            </AccentButton>
                        }
                    />
                </Surface>
            ) : (
                <>
                    {/* ── KPI band ───────────────────────────────── */}
                    <motion.div
                        variants={stagger(0.06)}
                        initial="hidden"
                        animate="show"
                        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
                    >
                        <motion.div variants={scaleIn}>
                            {tickets ? (
                                <StatTile
                                    label="Open tickets"
                                    value={tickets.byStatus.open}
                                    icon={<FiInbox size={18} />}
                                    variant="frost"
                                />
                            ) : (
                                <MissingTile label="Open tickets" icon={<FiInbox size={18} />} />
                            )}
                        </motion.div>
                        <motion.div variants={scaleIn}>
                            {tickets ? (
                                <StatTile
                                    label="In progress"
                                    value={tickets.byStatus.inProgress}
                                    icon={<FiClock size={18} />}
                                    variant="frost"
                                />
                            ) : (
                                <MissingTile label="In progress" icon={<FiClock size={18} />} />
                            )}
                        </motion.div>
                        <motion.div variants={scaleIn}>
                            {logs ? (
                                <StatTile
                                    label="Errors logged"
                                    value={logs.byLevel.errors}
                                    icon={<FiAlertTriangle size={18} />}
                                    variant="frost"
                                />
                            ) : (
                                <MissingTile label="Errors logged" icon={<FiAlertTriangle size={18} />} />
                            )}
                        </motion.div>
                        <motion.div variants={scaleIn}>
                            {logs ? (
                                <StatTile
                                    label="Logs, last 24h"
                                    value={logs.last24Hours}
                                    icon={<FiActivity size={18} />}
                                    variant="frost"
                                />
                            ) : (
                                <MissingTile label="Logs, last 24h" icon={<FiActivity size={18} />} />
                            )}
                        </motion.div>
                    </motion.div>

                    <div className="grid gap-5 lg:grid-cols-3">
                        {/* ── Needs attention ────────────────────── */}
                        <motion.div variants={fadeUp} initial="hidden" animate="show" className="lg:col-span-2">
                            <Surface variant="panel" radius="3xl" padding="lg" className="h-full">
                                <div className="flex h-full flex-col gap-5">
                                    <PanelHead
                                        icon={<FiAlertTriangle size={17} />}
                                        title="Needs attention"
                                        aside={
                                            focus.length > 0 ? (
                                                <Badge tone="neutral">{focus.length} signal{focus.length > 1 ? 's' : ''}</Badge>
                                            ) : undefined
                                        }
                                    />

                                    {loading ? (
                                        <SkeletonPanel lines={3} />
                                    ) : focus.length === 0 ? (
                                        <EmptyState
                                            size="sm"
                                            icon={<FiCheckCircle size={20} />}
                                            title="Nothing needs you right now"
                                            description="No critical tickets, no unstarted work, no error-level logs."
                                        />
                                    ) : (
                                        <ul className="flex flex-col gap-2">
                                            {focus.map((item) => (
                                                <li
                                                    key={item.id}
                                                    className="flex items-center gap-3 rounded-2xl bg-black/[0.03] px-4 py-3 dark:bg-white/5"
                                                >
                                                    <span className={`h-2 w-2 shrink-0 rounded-full ${TONE_DOT[item.tone]}`} />
                                                    <div className="flex min-w-0 flex-col">
                                                        <span className="truncate text-sm font-semibold text-brand-dark dark:text-white">
                                                            {item.label}
                                                        </span>
                                                        <span className="truncate text-xs text-gray-500 dark:text-gray-400">
                                                            {item.hint}
                                                        </span>
                                                    </div>
                                                    <span className="ml-auto font-numbers text-xl font-bold text-brand-dark dark:text-white">
                                                        <AnimatedNumber value={item.count} />
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </Surface>
                        </motion.div>

                        {/* ── Resolution ─────────────────────────── */}
                        <motion.div variants={fadeUp} initial="hidden" animate="show">
                            <Surface variant="dark" radius="3xl" padding="lg" className="h-full">
                                <div className="flex h-full flex-col gap-5">
                                    <div className="flex items-center gap-3">
                                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-brand-accent">
                                            <FiCheckCircle size={17} />
                                        </span>
                                        <h2 className="text-base font-bold font-heading text-white">Resolution</h2>
                                    </div>

                                    {loading ? (
                                        <SkeletonPanel lines={2} />
                                    ) : resolutionRate === null ? (
                                        <p className="text-sm leading-relaxed text-gray-400">
                                            No tickets yet — a rate will appear once there&apos;s something to resolve.
                                        </p>
                                    ) : (
                                        <>
                                            <div className="flex items-end gap-2">
                                                <span className="font-numbers text-5xl font-bold leading-none text-white">
                                                    <AnimatedNumber value={resolutionRate} />
                                                </span>
                                                <span className="pb-1 text-lg font-semibold text-brand-accent">%</span>
                                            </div>
                                            <Meter value={resolutionRate} />
                                            <p className="mt-auto text-sm text-gray-400">
                                                <span className="font-numbers font-semibold text-white">
                                                    {(tickets?.byStatus.resolved ?? 0) + (tickets?.byStatus.closed ?? 0)}
                                                </span>{' '}
                                                of{' '}
                                                <span className="font-numbers font-semibold text-white">
                                                    {tickets?.total ?? 0}
                                                </span>{' '}
                                                tickets resolved or closed.
                                            </p>
                                        </>
                                    )}
                                </div>
                            </Surface>
                        </motion.div>
                    </div>

                    {/* ── Breakdowns ─────────────────────────────── */}
                    <div className="grid gap-5 lg:grid-cols-2">
                        <motion.div variants={fadeUp} initial="hidden" animate="show">
                            <Surface variant="panel" radius="3xl" padding="lg" className="h-full">
                                <div className="flex flex-col gap-5">
                                    <PanelHead
                                        icon={<FiAlertTriangle size={17} />}
                                        title="Tickets by priority"
                                        aside={
                                            tickets ? (
                                                <span className="font-numbers text-sm text-gray-500 dark:text-gray-400">
                                                    {tickets.total} total
                                                </span>
                                            ) : undefined
                                        }
                                    />
                                    {loading ? (
                                        <SkeletonPanel />
                                    ) : !tickets ? (
                                        <DegradedPanel what="Ticket stats" onRetry={refetch} />
                                    ) : (
                                        <div className="flex flex-col gap-4">
                                            <DistRow label="Critical" value={tickets.byPriority.critical} total={tickets.total} />
                                            <DistRow label="High" value={tickets.byPriority.high} total={tickets.total} />
                                            <DistRow label="Medium" value={tickets.byPriority.medium} total={tickets.total} />
                                            <DistRow label="Low" value={tickets.byPriority.low} total={tickets.total} />
                                        </div>
                                    )}
                                </div>
                            </Surface>
                        </motion.div>

                        <motion.div variants={fadeUp} initial="hidden" animate="show">
                            <Surface variant="panel" radius="3xl" padding="lg" className="h-full">
                                <div className="flex flex-col gap-5">
                                    <PanelHead
                                        icon={<FiTerminal size={17} />}
                                        title="Logs by level"
                                        aside={
                                            logs ? (
                                                <span className="font-numbers text-sm text-gray-500 dark:text-gray-400">
                                                    {logs.last7Days} in 7d
                                                </span>
                                            ) : undefined
                                        }
                                    />
                                    {loading ? (
                                        <SkeletonPanel />
                                    ) : !logs ? (
                                        <DegradedPanel what="Log stats" onRetry={refetch} />
                                    ) : (
                                        <div className="flex flex-col gap-4">
                                            <DistRow label="Errors" value={logs.byLevel.errors} total={logs.total} />
                                            <DistRow label="Warnings" value={logs.byLevel.warnings} total={logs.total} />
                                            <DistRow label="Info" value={logs.byLevel.info} total={logs.total} />
                                        </div>
                                    )}
                                </div>
                            </Surface>
                        </motion.div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Dashboard;
