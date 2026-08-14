import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    FiAlertOctagon,
    FiAlertTriangle,
    FiArchive,
    FiCheckCircle,
    FiClock,
    FiInbox,
    FiMessageSquare,
    FiPlus,
    FiRefreshCw,
    FiSearch,
    FiSend,
    FiX,
} from 'react-icons/fi';
import {
    Surface,
    StatTile,
    AccentButton,
    AvatarStack,
    Badge,
    EmptyState,
    SegmentedControl,
    Input,
    Textarea,
    Field,
    PageHeader,
    type BadgeTone,
    type Person,
} from '@/components/design-system';
import { useBugTrackerData } from '@/hooks/useBugTrackerData';
import { ticketsAPI } from '@/services/api';
import type { Ticket, TicketComment, TicketPriority, TicketStatus } from '@/types/bugTrackerApp';
import { fadeUp, scaleIn, stagger } from '@/lib/motion';

/**
 * Bug Tracker — triage board + detail thread.
 *
 * Built on the untouched `useBugTrackerData` hook and the hardened tickets API
 * (see `.agents/docs/features/bug-tracker.md`). Composed from Luxe primitives
 * only, matching Dashboard's idiom.
 *
 * Two deliberate behaviours worth keeping if this is refactored:
 *  - Edits send `expectedUpdatedAt`, so a 409 surfaces as "someone else changed
 *    this" instead of silently clobbering their work.
 *  - Delete archives. There is no destroy path in the UI at all.
 *
 * **Reused, not duplicated, for the per-project board (`/p/:slug/board`)** —
 * pass `projectId` and this scopes its fetch and every ticket it creates to
 * that project, and drops its own `PageHeader` since the wrapping page
 * (`ProjectBoard.tsx`) already renders one plus `ProjectTabs`. The unscoped
 * `/bug-tracker` route renders this with no props, unchanged.
 */

// ── Presentation maps ─────────────────────────────────────────
const STATUS_LABEL: Record<TicketStatus, string> = {
    open: 'Open',
    'in-progress': 'In progress',
    resolved: 'Resolved',
    closed: 'Closed',
};

/**
 * Status and priority now resolve to `Badge` semantic tones rather than to
 * hand-written class strings. Two local colour maps used to live here; the
 * meaning-to-colour decision belongs in the primitive, where an audit can see it.
 */
const STATUS_TONE: Record<TicketStatus, BadgeTone> = {
    open: 'warning',
    'in-progress': 'info',
    resolved: 'success',
    closed: 'neutral',
};

const PRIORITY_TONE: Record<TicketPriority, BadgeTone> = {
    critical: 'danger',
    high: 'warning',
    medium: 'info',
    low: 'neutral',
};

/** The status dot on a row — same hue as the badge, at 2px. */
const STATUS_DOT: Record<TicketStatus, string> = {
    open: 'bg-amber-500',
    'in-progress': 'bg-sky-500',
    resolved: 'bg-emerald-500',
    closed: 'bg-gray-400 dark:bg-white/25',
};

const STATUS_ORDER: TicketStatus[] = ['open', 'in-progress', 'resolved', 'closed'];
const PRIORITY_ORDER: TicketPriority[] = ['critical', 'high', 'medium', 'low'];

/** Newest-first within a column, but criticals float regardless of age. */
const PRIORITY_RANK: Record<TicketPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };

const relativeTime = (iso: string): string => {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '';
    const mins = Math.round((Date.now() - then) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
};

/** Full date for the `title` attribute — "3d ago" is not enough to act on. */
const absoluteTime = (iso: string): string => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
};

/** `AvatarStack` takes a list; an assignee is a list of one, or none. */
const assigneeAsPeople = (ticket: Ticket): Person[] =>
    ticket.assignee
        ? [{ id: String(ticket.assigneeId ?? ticket.assignee), name: ticket.assignee, src: ticket.assigneeUser?.avatarUrl ?? undefined }]
        : [];

// ── Ticket row ────────────────────────────────────────────────
/**
 * One issue in the list.
 *
 * `showStatus` is off inside a grouped lane — the lane header already says
 * "In progress", and repeating it on all six rows underneath is noise. It goes
 * back on in the flat view, where the row has to carry its own status.
 */
const TicketRow: FC<{
    ticket: Ticket;
    active: boolean;
    showStatus: boolean;
    onSelect: () => void;
}> = ({ ticket, active, showStatus, onSelect }) => {
    const people = assigneeAsPeople(ticket);

    return (
        <motion.li variants={fadeUp} layout>
            <button
                type="button"
                onClick={onSelect}
                aria-current={active}
                className={[
                    'flex w-full flex-col gap-2 rounded-2xl px-4 py-3.5 text-left transition-colors',
                    active
                        ? 'bg-brand-accent/20 ring-1 ring-brand-accent'
                        : 'bg-black/[0.03] hover:bg-black/[0.06] dark:bg-white/5 dark:hover:bg-white/10',
                ].join(' ')}
            >
                <div className="flex items-center gap-2.5">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[ticket.status]}`} aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-brand-dark dark:text-white">
                        {ticket.title}
                    </span>
                    {showStatus && (
                        <Badge tone={STATUS_TONE[ticket.status]} className="shrink-0">
                            {STATUS_LABEL[ticket.status]}
                        </Badge>
                    )}
                    <Badge tone={PRIORITY_TONE[ticket.priority]} className="shrink-0">
                        {ticket.priority}
                    </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-numbers">{ticket.id}</span>
                    <span aria-hidden>·</span>

                    {/* Responsible person. The avatar carries recognition at a glance;
                        the name still renders for anyone who does not know the face. */}
                    {people.length > 0 ? (
                        <span className="flex min-w-0 items-center gap-1.5">
                            <AvatarStack people={people} size="sm" />
                            <span className="truncate">{ticket.assignee}</span>
                        </span>
                    ) : (
                        <span className="italic">Unassigned</span>
                    )}

                    <span aria-hidden>·</span>
                    <span className="shrink-0" title={`Created ${absoluteTime(ticket.createdAt)}`}>
                        opened {relativeTime(ticket.createdAt)}
                    </span>
                    <span aria-hidden>·</span>
                    <span className="shrink-0" title={`Last updated ${absoluteTime(ticket.updatedAt)}`}>
                        updated {relativeTime(ticket.updatedAt)}
                    </span>

                    {(ticket.commentCount ?? 0) > 0 && (
                        <span className="ml-auto flex shrink-0 items-center gap-1">
                            <FiMessageSquare size={12} />
                            {ticket.commentCount}
                        </span>
                    )}
                </div>
            </button>
        </motion.li>
    );
};

/**
 * A status group with a sticky header — the one structural idea worth taking
 * from `.agents/template/zg.html`.
 *
 * A flat, priority-sorted list answers "what is most urgent" and nothing else.
 * Grouping by status answers the question triage actually starts with — how much
 * is open, how much is moving, how much is finished — before a single row is
 * read. The header sticks so that answer survives scrolling past twenty rows.
 */
const StatusLane: FC<{ status: TicketStatus; count: number; children: React.ReactNode }> = ({
    status,
    count,
    children,
}) => (
    <section className="flex flex-col gap-2">
        <div className="sticky top-0 z-10 -mx-1 flex items-center gap-2 bg-light-surface/85 px-1 py-2 backdrop-blur-sm dark:bg-dark-surface/85">
            <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
            <span className="font-numbers rounded-md bg-black/5 px-1.5 py-0.5 text-[11px] font-semibold text-gray-500 dark:bg-white/10 dark:text-gray-400">
                {count}
            </span>
        </div>
        <motion.ul variants={stagger(0.03)} initial="hidden" animate="show" className="flex flex-col gap-2">
            {children}
        </motion.ul>
    </section>
);

// ── Detail thread ─────────────────────────────────────────────
const DetailThread: FC<{
    ticket: Ticket;
    comments: TicketComment[];
    loadingComments: boolean;
    readOnly: boolean;
    busy: boolean;
    onStatusChange: (status: TicketStatus) => void;
    onPriorityChange: (priority: TicketPriority) => void;
    onArchive: () => void;
    onComment: (body: string) => void;
    onClose: () => void;
}> = ({
    ticket,
    comments,
    loadingComments,
    readOnly,
    busy,
    onStatusChange,
    onPriorityChange,
    onArchive,
    onComment,
    onClose,
}) => {
    const [draft, setDraft] = useState('');

    // Clearing on ticket change stops a half-typed comment following you to
    // another ticket and being posted on the wrong thread.
    useEffect(() => setDraft(''), [ticket.id]);

    const submit = () => {
        const body = draft.trim();
        if (!body || readOnly) return;
        onComment(body);
        setDraft('');
    };

    return (
        <Surface variant="panel" radius="3xl" padding="lg" className="h-full">
            <div className="flex h-full flex-col gap-5">
                <div className="flex items-start gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                        <span className="font-numbers text-xs text-gray-500 dark:text-gray-400">{ticket.id}</span>
                        <h2 className="text-base font-bold font-heading text-brand-dark dark:text-white">
                            {ticket.title}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close ticket detail"
                        className="ml-auto shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-black/5 hover:text-brand-dark dark:hover:bg-white/10 dark:hover:text-white"
                    >
                        <FiX size={16} />
                    </button>
                </div>

                {ticket.description && (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                        {ticket.description}
                    </p>
                )}

                <div className="flex flex-col gap-3">
                    <SegmentedControl
                        size="sm"
                        fullWidth
                        segments={STATUS_ORDER.map((s) => ({
                            value: s,
                            label: STATUS_LABEL[s],
                            disabled: readOnly || busy,
                        }))}
                        value={ticket.status}
                        onChange={(v) => onStatusChange(v as TicketStatus)}
                    />
                    <SegmentedControl
                        size="sm"
                        fullWidth
                        segments={PRIORITY_ORDER.map((p) => ({
                            value: p,
                            label: p[0].toUpperCase() + p.slice(1),
                            disabled: readOnly || busy,
                        }))}
                        value={ticket.priority}
                        onChange={(v) => onPriorityChange(v as TicketPriority)}
                    />
                </div>

                <dl className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex flex-col gap-1">
                        <dt className="text-gray-400 dark:text-gray-500">Assignee</dt>
                        <dd className="flex items-center gap-2 font-medium text-brand-dark dark:text-white">
                            {assigneeAsPeople(ticket).length > 0 ? (
                                <>
                                    <AvatarStack people={assigneeAsPeople(ticket)} size="sm" />
                                    <span className="truncate">{ticket.assignee}</span>
                                </>
                            ) : (
                                <span className="italic text-gray-500 dark:text-gray-400">Unassigned</span>
                            )}
                        </dd>
                    </div>
                    <div className="flex flex-col gap-1">
                        <dt className="text-gray-400 dark:text-gray-500">Reporter</dt>
                        <dd className="font-medium text-brand-dark dark:text-white">{ticket.reporter}</dd>
                    </div>
                    <div className="flex flex-col gap-1">
                        <dt className="text-gray-400 dark:text-gray-500">Opened</dt>
                        <dd className="font-medium text-brand-dark dark:text-white" title={absoluteTime(ticket.createdAt)}>
                            {relativeTime(ticket.createdAt)}
                        </dd>
                    </div>
                    <div className="flex flex-col gap-1">
                        <dt className="text-gray-400 dark:text-gray-500">Last updated</dt>
                        <dd className="font-medium text-brand-dark dark:text-white" title={absoluteTime(ticket.updatedAt)}>
                            {relativeTime(ticket.updatedAt)}
                        </dd>
                    </div>
                </dl>

                {ticket.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                        {ticket.tags.map((t) => (
                            <Badge key={t} tone="neutral" plainCase>{t}</Badge>
                        ))}
                    </div>
                )}

                {/* ── Thread ─────────────────────────────────── */}
                <div className="flex min-h-0 flex-1 flex-col gap-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        Activity
                    </h3>

                    <div className="flex-1 overflow-y-auto">
                        {loadingComments ? (
                            <div className="flex flex-col gap-2" aria-hidden>
                                {Array.from({ length: 2 }).map((_, i) => (
                                    <div key={i} className="h-12 animate-pulse rounded-xl bg-black/5 dark:bg-white/5" />
                                ))}
                            </div>
                        ) : comments.length === 0 ? (
                            <p className="py-4 text-sm text-gray-400 dark:text-gray-500">
                                Nothing yet. The first comment starts the thread.
                            </p>
                        ) : (
                            <ul className="flex flex-col gap-3">
                                {comments.map((c) => (
                                    <li key={c.id} className="flex flex-col gap-1">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-xs font-semibold text-brand-dark dark:text-white">
                                                {c.author?.name ?? 'System'}
                                            </span>
                                            <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                                {relativeTime(c.createdAt)}
                                            </span>
                                            {c.kind === 'activity' && <Badge tone="outline">activity</Badge>}
                                        </div>
                                        <p
                                            className={
                                                c.kind === 'activity'
                                                    ? 'text-xs italic text-gray-500 dark:text-gray-400'
                                                    : 'whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300'
                                            }
                                        >
                                            {c.body}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Input
                            aria-label="Add a comment"
                            placeholder={readOnly ? 'Unavailable offline' : 'Add a comment…'}
                            value={draft}
                            disabled={readOnly || busy}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    submit();
                                }
                            }}
                        />
                        <AccentButton
                            size="sm"
                            icon={<FiSend size={14} />}
                            onClick={submit}
                            disabled={readOnly || busy || !draft.trim()}
                        >
                            Send
                        </AccentButton>
                    </div>
                </div>

                <AccentButton
                    variant="ghost"
                    size="sm"
                    icon={<FiArchive size={14} />}
                    onClick={onArchive}
                    disabled={readOnly || busy}
                    className="self-start"
                >
                    Archive ticket
                </AccentButton>
            </div>
        </Surface>
    );
};

// ── Create form ───────────────────────────────────────────────
const CreateTicket: FC<{
    busy: boolean;
    onCancel: () => void;
    onCreate: (input: { title: string; description: string; priority: TicketPriority }) => void;
}> = ({ busy, onCancel, onCreate }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<TicketPriority>('medium');

    return (
        <Surface variant="panel" radius="3xl" padding="lg">
            <form
                className="flex flex-col gap-4"
                onSubmit={(e) => {
                    e.preventDefault();
                    if (!title.trim()) return;
                    onCreate({ title: title.trim(), description: description.trim(), priority });
                }}
            >
                <h2 className="text-base font-bold font-heading text-brand-dark dark:text-white">New ticket</h2>

                <Field label="Title" required>
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="What's broken?"
                        autoFocus
                    />
                </Field>

                <Field label="Description" hint="Steps to reproduce, expected vs actual.">
                    <Textarea
                        rows={4}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Optional"
                    />
                </Field>

                <Field label="Priority">
                    <SegmentedControl
                        size="sm"
                        fullWidth
                        segments={PRIORITY_ORDER.map((p) => ({ value: p, label: p[0].toUpperCase() + p.slice(1) }))}
                        value={priority}
                        onChange={(v) => setPriority(v as TicketPriority)}
                    />
                </Field>

                <div className="flex items-center gap-2">
                    <AccentButton type="submit" size="sm" disabled={busy || !title.trim()}>
                        {busy ? 'Creating…' : 'Create ticket'}
                    </AccentButton>
                    <AccentButton type="button" variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
                        Cancel
                    </AccentButton>
                </div>
            </form>
        </Surface>
    );
};

interface BugTrackerProps {
    /** Scopes the fetch and every created ticket. Omit for the global, unscoped board. */
    projectId?: number;
}

// ── Page ──────────────────────────────────────────────────────
const BugTracker: FC<BugTrackerProps> = ({ projectId }) => {
    const { tickets, setTickets, loading, error, isOfflineMock, refetch } = useBugTrackerData(projectId);

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
    const [query, setQuery] = useState('');
    const [creating, setCreating] = useState(false);
    const [busy, setBusy] = useState(false);
    const [comments, setComments] = useState<TicketComment[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);

    const selected = useMemo(
        () => tickets.find((t) => t.id === selectedId) ?? null,
        [tickets, selectedId],
    );

    // Offline mock data is read-only by contract — disable every mutation rather
    // than letting the user type into controls that will throw on submit.
    const readOnly = isOfflineMock;

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return tickets
            .filter((t) => (statusFilter === 'all' ? true : t.status === statusFilter))
            .filter((t) =>
                q
                    ? t.title.toLowerCase().includes(q) ||
                      t.id.toLowerCase().includes(q) ||
                      (t.assignee ?? '').toLowerCase().includes(q)
                    : true,
            )
            .slice()
            .sort(
                (a, b) =>
                    PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
                    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
            );
    }, [tickets, statusFilter, query]);

    const counts = useMemo(() => {
        const base: Record<TicketStatus, number> = { open: 0, 'in-progress': 0, resolved: 0, closed: 0 };
        tickets.forEach((t) => { base[t.status] += 1; });
        return base;
    }, [tickets]);

    // Group only when showing everything: filtering to one status and then
    // rendering a single group is a header that tells you what you just asked for.
    const grouped = statusFilter === 'all';

    const lanes = useMemo(
        () =>
            STATUS_ORDER.map((status) => ({ status, items: visible.filter((t) => t.status === status) }))
                .filter((lane) => lane.items.length > 0),
        [visible],
    );

    const loadComments = useCallback(async (ticketId: string) => {
        setLoadingComments(true);
        try {
            setComments(await ticketsAPI.getComments(ticketId));
        } catch {
            setComments([]);
        } finally {
            setLoadingComments(false);
        }
    }, []);

    useEffect(() => {
        if (!selectedId) { setComments([]); return; }
        loadComments(selectedId);
    }, [selectedId, loadComments]);

    /** Shared mutation wrapper: surfaces a 409 as a real message, never a silent overwrite. */
    const mutate = useCallback(
        async (run: () => Promise<Ticket>) => {
            setBusy(true);
            setNotice(null);
            try {
                const updated = await run();
                setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
            } catch (err: unknown) {
                const status = (err as { response?: { status?: number } })?.response?.status;
                setNotice(
                    status === 409
                        ? 'Someone else changed this ticket. Refreshing so you can redo your edit.'
                        : (err as Error)?.message || 'That change did not save.',
                );
                if (status === 409) refetch();
            } finally {
                setBusy(false);
            }
        },
        [setTickets, refetch],
    );

    const changeStatus = (status: TicketStatus) => {
        if (!selected) return;
        mutate(() =>
            ticketsAPI.update(selected.id, { status, expectedUpdatedAt: selected.updatedAt }),
        ).then(() => loadComments(selected.id));
    };

    const changePriority = (priority: TicketPriority) => {
        if (!selected) return;
        mutate(() =>
            ticketsAPI.update(selected.id, { priority, expectedUpdatedAt: selected.updatedAt }),
        ).then(() => loadComments(selected.id));
    };

    const archive = async () => {
        if (!selected) return;
        setBusy(true);
        setNotice(null);
        try {
            await ticketsAPI.archive(selected.id);
            setTickets((prev) => prev.filter((t) => t.id !== selected.id));
            setSelectedId(null);
        } catch (err: unknown) {
            setNotice((err as Error)?.message || 'Could not archive that ticket.');
        } finally {
            setBusy(false);
        }
    };

    const addComment = async (body: string) => {
        if (!selected) return;
        setBusy(true);
        try {
            const created = await ticketsAPI.addComment(selected.id, body);
            setComments((prev) => [...prev, created]);
            setTickets((prev) =>
                prev.map((t) =>
                    t.id === selected.id ? { ...t, commentCount: (t.commentCount ?? 0) + 1 } : t,
                ),
            );
        } catch (err: unknown) {
            setNotice((err as Error)?.message || 'Comment did not send.');
        } finally {
            setBusy(false);
        }
    };

    const create = async (input: { title: string; description: string; priority: TicketPriority }) => {
        setBusy(true);
        setNotice(null);
        try {
            const created = await ticketsAPI.create(projectId ? { ...input, projectId } : input);
            setTickets((prev) => [created, ...prev]);
            setSelectedId(created.id);
            setCreating(false);
        } catch (err: unknown) {
            setNotice((err as Error)?.message || 'Could not create that ticket.');
        } finally {
            setBusy(false);
        }
    };

    const headerActions = (
        <>
            <AccentButton
                variant="ghost"
                size="sm"
                icon={<FiRefreshCw size={14} />}
                onClick={refetch}
                disabled={loading}
            >
                {loading ? 'Refreshing…' : 'Refresh'}
            </AccentButton>
            <AccentButton
                size="sm"
                icon={<FiPlus size={14} />}
                onClick={() => setCreating((c) => !c)}
                disabled={readOnly}
            >
                New ticket
            </AccentButton>
        </>
    );

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-7">
            {/* Embedded in a project page: that page's own PageHeader + ProjectTabs
                already carry the title, so a second heading here would be a
                redundant "Bug Tracker" sitting under "Sprint2 Demo". The actions
                (Refresh, New ticket) still need a home — this is it. */}
            {projectId ? (
                <div className="flex items-center justify-end gap-2">{headerActions}</div>
            ) : (
                <PageHeader
                    title="Bug Tracker"
                    subtitle="Triage what's broken, assign it, and keep the conversation on the ticket."
                    actions={headerActions}
                />
            )}

            {isOfflineMock && (
                <Surface variant="panel" radius="2xl" padding="sm">
                    <p className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                        <FiAlertOctagon className="shrink-0 text-amber-500" size={16} />
                        Showing offline sample data — the API isn&apos;t reachable. Editing is disabled.
                    </p>
                </Surface>
            )}

            {notice && (
                <Surface variant="panel" radius="2xl" padding="sm">
                    <p className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                        <FiAlertTriangle className="shrink-0 text-amber-500" size={16} />
                        {notice}
                    </p>
                </Surface>
            )}

            {/* ── KPI band ───────────────────────────────────── */}
            <motion.div
                variants={stagger(0.06)}
                initial="hidden"
                animate="show"
                className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
                <motion.div variants={scaleIn}>
                    <StatTile label="Open" value={counts.open} icon={<FiInbox size={18} />} variant="frost" />
                </motion.div>
                <motion.div variants={scaleIn}>
                    <StatTile
                        label="In progress"
                        value={counts['in-progress']}
                        icon={<FiClock size={18} />}
                        variant="frost"
                    />
                </motion.div>
                <motion.div variants={scaleIn}>
                    <StatTile
                        label="Resolved"
                        value={counts.resolved}
                        icon={<FiCheckCircle size={18} />}
                        variant="frost"
                    />
                </motion.div>
                <motion.div variants={scaleIn}>
                    <StatTile
                        label="Closed"
                        value={counts.closed}
                        icon={<FiArchive size={18} />}
                        variant="frost"
                    />
                </motion.div>
            </motion.div>

            <AnimatePresence>
                {creating && (
                    <motion.div variants={fadeUp} initial="hidden" animate="show" exit="hidden">
                        <CreateTicket busy={busy} onCancel={() => setCreating(false)} onCreate={create} />
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid gap-5 lg:grid-cols-5">
                {/* ── Board ──────────────────────────────────── */}
                <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    animate="show"
                    // `min-w-0`: a grid item defaults to min-width:auto and refuses to
                    // shrink below its content, which is how one wide child blows the
                    // page out sideways instead of scrolling inside itself.
                    className={`min-w-0 ${selected ? 'lg:col-span-3' : 'lg:col-span-5'}`}
                >
                    <Surface variant="panel" radius="3xl" padding="lg" className="h-full">
                        <div className="flex h-full flex-col gap-5">
                            <div className="flex min-w-0 flex-col gap-3">
                                {/* Five segments do not fit 375px and the control cannot
                                    wrap, so it scrolls inside its own track. Without
                                    this it sets the width of the whole board column and
                                    the *page* scrolls sideways instead — measured at
                                    506px against a 375px viewport. */}
                                <div className="-mx-1 overflow-x-auto px-1 pb-1">
                                    <SegmentedControl
                                        size="sm"
                                        className="w-max"
                                        segments={[
                                            { value: 'all', label: `All (${tickets.length})` },
                                            ...STATUS_ORDER.map((s) => ({
                                                value: s,
                                                label: `${STATUS_LABEL[s]} (${counts[s]})`,
                                            })),
                                        ]}
                                        value={statusFilter}
                                        onChange={(v) => setStatusFilter(v as 'all' | TicketStatus)}
                                    />
                                </div>
                                <Input
                                    aria-label="Search tickets"
                                    icon={<FiSearch size={15} />}
                                    placeholder="Search title, id or assignee…"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                />
                            </div>

                            {loading ? (
                                <div className="flex flex-col gap-2" aria-hidden>
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <div key={i} className="h-16 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" />
                                    ))}
                                </div>
                            ) : error ? (
                                <EmptyState
                                    icon={<FiAlertOctagon size={22} />}
                                    title="Couldn't load tickets"
                                    description={error}
                                    action={
                                        <AccentButton
                                            variant="dark"
                                            size="sm"
                                            icon={<FiRefreshCw size={14} />}
                                            onClick={refetch}
                                        >
                                            Try again
                                        </AccentButton>
                                    }
                                />
                            ) : tickets.length === 0 ? (
                                <EmptyState
                                    icon={<FiCheckCircle size={22} />}
                                    title="No tickets yet"
                                    description="Nothing is broken, or nothing has been reported. Create the first ticket to start tracking."
                                    action={
                                        <AccentButton
                                            size="sm"
                                            icon={<FiPlus size={14} />}
                                            onClick={() => setCreating(true)}
                                            disabled={readOnly}
                                        >
                                            New ticket
                                        </AccentButton>
                                    }
                                />
                            ) : visible.length === 0 ? (
                                <EmptyState
                                    size="sm"
                                    icon={<FiSearch size={20} />}
                                    title="Nothing matches"
                                    description="No ticket matches this filter and search combination."
                                    action={
                                        <AccentButton
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => { setQuery(''); setStatusFilter('all'); }}
                                        >
                                            Clear filters
                                        </AccentButton>
                                    }
                                />
                            ) : grouped ? (
                                <div className="flex flex-col gap-5">
                                    {lanes.map((lane) => (
                                        <StatusLane
                                            key={lane.status}
                                            status={lane.status}
                                            count={lane.items.length}
                                        >
                                            {lane.items.map((t) => (
                                                <TicketRow
                                                    key={t.id}
                                                    ticket={t}
                                                    active={t.id === selectedId}
                                                    showStatus={false}
                                                    onSelect={() =>
                                                        setSelectedId(t.id === selectedId ? null : t.id)
                                                    }
                                                />
                                            ))}
                                        </StatusLane>
                                    ))}
                                </div>
                            ) : (
                                <motion.ul
                                    variants={stagger(0.03)}
                                    initial="hidden"
                                    animate="show"
                                    className="flex flex-col gap-2"
                                >
                                    {visible.map((t) => (
                                        <TicketRow
                                            key={t.id}
                                            ticket={t}
                                            active={t.id === selectedId}
                                            showStatus
                                            onSelect={() => setSelectedId(t.id === selectedId ? null : t.id)}
                                        />
                                    ))}
                                </motion.ul>
                            )}
                        </div>
                    </Surface>
                </motion.div>

                {/* ── Detail ─────────────────────────────────── */}
                <AnimatePresence>
                    {selected && (
                        <motion.div
                            key={selected.id}
                            variants={fadeUp}
                            initial="hidden"
                            animate="show"
                            exit="hidden"
                            className="lg:col-span-2"
                        >
                            <DetailThread
                                ticket={selected}
                                comments={comments}
                                loadingComments={loadingComments}
                                readOnly={readOnly}
                                busy={busy}
                                onStatusChange={changeStatus}
                                onPriorityChange={changePriority}
                                onArchive={archive}
                                onComment={addComment}
                                onClose={() => setSelectedId(null)}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default BugTracker;
