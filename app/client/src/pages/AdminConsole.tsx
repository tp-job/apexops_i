import type { FC } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    FiAlertTriangle,
    FiCheck,
    FiCopy,
    FiMonitor,
    FiPause,
    FiPlay,
    FiTrash2,
} from 'react-icons/fi';
import { PageHeader, AccentButton, Badge, EmptyState, Surface } from '@/components/design-system';
import AdminRefusal from '@/components/common/AdminRefusal';
import { useConsoleMonitor, type MonitorStatus } from '@/hooks/useConsoleMonitor';
import { formatLogLine, type LogLevel } from '@/lib/consoleBuffer';

/**
 * `/admin/console` — live console output from every connected target app.
 *
 * **Live only.** Nothing on this page is persisted (S9-D6): `server.ts` removed
 * the `prisma.log.create` fan-out because it was an unauthenticated, unbounded
 * write from any socket, and persistence now has exactly one supported path —
 * `POST /api/ingest`, which is keyed, rate limited and project scoped. So the
 * empty state says *live-only* out loud. A blank panel here means "nothing since
 * you opened this tab", never "this application has never errored", and a
 * monitoring view that lets you confuse the two is worse than no view at all.
 *
 * The nav entry is admin-only, but that is presentation. The `monitors` room
 * itself gates on `role === 'admin'` read fresh from the database (S9-D5), so a
 * non-admin reaching this URL gets a refusal on the wire, not an empty list.
 */

const LEVELS: { value: LogLevel | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'error', label: 'Errors' },
    { value: 'warning', label: 'Warnings' },
    { value: 'info', label: 'Info' },
    { value: 'debug', label: 'Debug' },
];

const LEVEL_STYLES: Record<LogLevel, string> = {
    error: 'text-red-500 dark:text-red-400',
    warning: 'text-amber-500 dark:text-amber-400',
    info: 'text-sky-600 dark:text-sky-400',
    debug: 'text-gray-400 dark:text-gray-500',
};

const STATUS_LABEL: Record<MonitorStatus, string> = {
    connecting: 'Connecting',
    live: 'Live',
    offline: 'Offline',
    refused: 'Not permitted',
};

const STATUS_DOT: Record<MonitorStatus, string> = {
    connecting: 'bg-amber-500 animate-pulse',
    live: 'bg-emerald-500',
    offline: 'bg-red-500',
    refused: 'bg-red-500',
};

const timeOf = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '--:--:--' : d.toLocaleTimeString('en-GB', { hour12: false });
};

const AdminConsole: FC = () => {
    const {
        status,
        refusedReason,
        targetApps,
        logs,
        paused,
        pendingCount,
        counts,
        setPaused,
        clear,
    } = useConsoleMonitor();

    const [level, setLevel] = useState<LogLevel | 'all'>('all');
    const [appFilter, setAppFilter] = useState<string | null>(null);
    const [autoScroll, setAutoScroll] = useState(true);
    const [copied, setCopied] = useState(false);
    const streamRef = useRef<HTMLDivElement | null>(null);

    const visible = useMemo(
        () =>
            logs.filter(
                (l) =>
                    (level === 'all' || l.level === level) &&
                    (appFilter === null || l.appName === appFilter),
            ),
        [logs, level, appFilter],
    );

    // Newest is rendered first, so "follow the latest" scrolls to the TOP.
    useEffect(() => {
        if (!autoScroll || paused) return;
        streamRef.current?.scrollTo({ top: 0 });
    }, [visible, autoScroll, paused]);

    // An app filter pinned to an app that has since disconnected would silently
    // show nothing while the panel claims to be live.
    useEffect(() => {
        if (appFilter && !targetApps.some((a) => a.appName === appFilter)) setAppFilter(null);
    }, [targetApps, appFilter]);

    const copyAll = async () => {
        try {
            await navigator.clipboard.writeText(visible.map(formatLogLine).join('\n'));
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            // Clipboard is permission-gated; nothing is lost, the logs are on screen.
        }
    };

    if (status === 'refused') {
        // Two distinct reasons, kept distinct: "sign in again" and "you are not
        // an admin" call for different actions from the reader. The refusal
        // itself comes from the SOCKET, not from a role check on this page —
        // which is why the panel is driven by `status` rather than by `user`.
        return (
            <AdminRefusal
                title="Console Monitor"
                description={
                    refusedReason === 'Authentication required to monitor'
                        ? 'Your session is not signed in. Sign in again to continue.'
                        : 'This feed carries console output from every connected application, so it is limited to administrators.'
                }
            />
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Console Monitor"
                subtitle="Live output from connected applications"
                actions={
                    <span className="flex items-center gap-2 rounded-xl bg-black/5 px-3 py-1.5 text-xs font-semibold dark:bg-white/10">
                        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} aria-hidden />
                        {STATUS_LABEL[status]}
                    </span>
                }
            />

            {/* ── Connected apps ──────────────────────────────── */}
            <Surface className="p-5">
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold">
                        Connected applications{' '}
                        <span className="text-gray-400">({targetApps.length})</span>
                    </h2>
                    {appFilter && (
                        <button
                            type="button"
                            onClick={() => setAppFilter(null)}
                            className="text-xs font-semibold text-gray-500 underline-offset-2 hover:underline dark:text-gray-400"
                        >
                            Clear app filter
                        </button>
                    )}
                </div>

                {targetApps.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {status === 'live'
                            ? 'No applications are connected. Install the console script to see one here.'
                            : 'Not connected to the feed.'}
                    </p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {targetApps.map((app) => {
                            const active = appFilter === app.appName;
                            return (
                                <button
                                    key={app.socketId}
                                    type="button"
                                    onClick={() => setAppFilter(active ? null : app.appName)}
                                    aria-pressed={active}
                                    title={app.url}
                                    className={[
                                        'flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                                        active
                                            ? 'border-brand-accent bg-brand-accent/15'
                                            : 'border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5',
                                    ].join(' ')}
                                >
                                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                                    <span className="font-medium">{app.appName}</span>
                                    <span className="max-w-[16rem] truncate text-xs text-gray-500 dark:text-gray-400">
                                        {app.url}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </Surface>

            {/* ── Stream ──────────────────────────────────────── */}
            <Surface className="flex min-h-0 flex-col p-0">
                <div className="flex flex-wrap items-center gap-2 border-b border-black/5 p-4 dark:border-white/10">
                    <div className="flex flex-wrap gap-1">
                        {LEVELS.map((l) => (
                            <button
                                key={l.value}
                                type="button"
                                onClick={() => setLevel(l.value)}
                                aria-pressed={level === l.value}
                                className={[
                                    'rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors',
                                    level === l.value
                                        ? 'bg-brand-dark text-white dark:bg-brand-accent dark:text-brand-dark'
                                        : 'text-gray-600 hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/10',
                                ].join(' ')}
                            >
                                {l.label}
                            </button>
                        ))}
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                        <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                            <input
                                type="checkbox"
                                checked={autoScroll}
                                onChange={(e) => setAutoScroll(e.target.checked)}
                                className="h-3.5 w-3.5 accent-current"
                            />
                            Auto-scroll
                        </label>

                        <AccentButton onClick={() => setPaused(!paused)}>
                            {paused ? <FiPlay size={14} /> : <FiPause size={14} />}
                            {paused
                                ? `Resume${pendingCount > 0 ? ` (${pendingCount})` : ''}`
                                : 'Pause'}
                        </AccentButton>

                        <button
                            type="button"
                            onClick={copyAll}
                            aria-label="Copy visible logs"
                            className="grid h-9 w-9 place-items-center rounded-xl text-gray-600 transition-colors hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/10"
                        >
                            {copied ? <FiCheck size={15} /> : <FiCopy size={15} />}
                        </button>
                        <button
                            type="button"
                            onClick={clear}
                            aria-label="Clear logs"
                            className="grid h-9 w-9 place-items-center rounded-xl text-gray-600 transition-colors hover:bg-black/5 dark:text-gray-400 dark:hover:bg-white/10"
                        >
                            <FiTrash2 size={15} />
                        </button>
                    </div>
                </div>

                {/* Stats. Counts describe the BUFFER, not all time — saying so
                    stops "3 errors" being read as a project-wide total. */}
                <div className="flex flex-wrap items-center gap-4 border-b border-black/5 px-4 py-2.5 text-xs dark:border-white/10">
                    <span className="text-gray-500 dark:text-gray-400">
                        Buffered <strong className="text-brand-dark dark:text-white">{counts.total}</strong>
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                        Errors <strong className="text-red-500">{counts.error}</strong>
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                        Warnings <strong className="text-amber-500">{counts.warning}</strong>
                    </span>
                    {visible.length !== counts.total && (
                        <span className="text-gray-400">· {visible.length} shown by filter</span>
                    )}
                    {paused && (
                        <Badge tone="outline">
                            Paused{pendingCount > 0 ? ` · ${pendingCount} waiting` : ''}
                        </Badge>
                    )}
                </div>

                <div
                    ref={streamRef}
                    className="max-h-[55vh] min-h-[18rem] overflow-y-auto p-2 font-mono text-[12.5px] leading-relaxed"
                >
                    {visible.length === 0 ? (
                        <div className="p-6">
                            <EmptyState
                                size="sm"
                                icon={<FiMonitor size={20} />}
                                title={counts.total === 0 ? 'No console output yet' : 'Nothing matches this filter'}
                                description={
                                    counts.total === 0
                                        ? 'This feed is live only — it shows what arrives while this page is open, and keeps the last 500 entries. It is not a history of past errors.'
                                        : 'Change the level or clear the app filter to see more.'
                                }
                            />
                        </div>
                    ) : (
                        <ul className="flex flex-col">
                            {visible.map((log) => (
                                <li
                                    key={log.id}
                                    className="flex gap-2 rounded-lg px-2 py-1.5 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                                >
                                    <span className="shrink-0 text-gray-400 dark:text-gray-600">
                                        {timeOf(log.timestamp)}
                                    </span>
                                    <span
                                        className={`w-16 shrink-0 font-semibold uppercase ${LEVEL_STYLES[log.level]}`}
                                    >
                                        {log.level}
                                    </span>
                                    {log.appName && (
                                        <span className="max-w-[9rem] shrink-0 truncate text-gray-500 dark:text-gray-400">
                                            {log.appName}
                                        </span>
                                    )}
                                    {/* Where in the app it came from. Without this a
                                        stack-less warning is untraceable — the message
                                        alone rarely says which file emitted it. */}
                                    <span
                                        title={log.source}
                                        className="max-w-[11rem] shrink-0 truncate text-gray-400 dark:text-gray-500"
                                    >
                                        {log.source}
                                    </span>
                                    <span className="min-w-0 flex-1 break-words">
                                        {log.message}
                                        {log.stack && (
                                            <span className="mt-1 block whitespace-pre-wrap text-[11.5px] text-gray-500 dark:text-gray-400">
                                                {log.stack}
                                            </span>
                                        )}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </Surface>

            {status === 'offline' && (
                <p className="flex items-center gap-2 text-sm text-red-500">
                    <FiAlertTriangle size={15} />
                    Disconnected from the feed. Logs shown are the ones already buffered — new output
                    is not arriving.
                </p>
            )}
        </div>
    );
};

export default AdminConsole;
