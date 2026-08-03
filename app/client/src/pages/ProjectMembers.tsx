import type { FC, FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    FiAlertTriangle,
    FiCheck,
    FiCopy,
    FiLogOut,
    FiMail,
    FiSend,
    FiTrash2,
    FiUserPlus,
    FiUsers,
} from 'react-icons/fi';
import {
    AccentButton,
    Badge,
    ConfirmDialog,
    EmptyState,
    Field,
    Input,
    Modal,
    Select,
    SkeletonText,
    Surface,
} from '@/components/design-system';
import { PageHeader } from '@/components/common/layout';
import ProjectTabs from '@/components/layouts/ProjectTabs';
import { useMembers } from '@/hooks/useMembers';
import { useProject } from '@/hooks/useProject';
import { useAuth } from '@/context/auth-context';
import { getErrorMessage } from '@/utils/error';
import { formatDate, initials, relativeTime } from '@/utils/format';
import { validateEmail } from '@/utils/validators';
import { ASSIGNABLE_ROLES, type AssignableRole, type ProjectMember } from '@/types/team';

const ROLE_OPTIONS = ASSIGNABLE_ROLES.map((r) => ({ value: r, label: r }));

const ROLE_HINT: Record<AssignableRole, string> = {
    admin: 'Can change settings, rotate the ingest key and manage members.',
    member: 'Can triage issues, comment and file tickets. Cannot change settings.',
};

const roleTone = (role: string): 'accent' | 'neutral' | 'outline' =>
    role === 'owner' ? 'accent' : role === 'admin' ? 'outline' : 'neutral';

/** Avatar or initials. Never a broken image — an absent `avatarUrl` is the norm. */
const MemberAvatar: FC<{ member: ProjectMember }> = ({ member }) =>
    member.avatarUrl ? (
        <img
            src={member.avatarUrl}
            alt=""
            className="h-9 w-9 shrink-0 rounded-full object-cover"
        />
    ) : (
        <span
            aria-hidden
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/5 text-[11px] font-semibold text-gray-500 dark:bg-white/10 dark:text-gray-300"
        >
            {initials(member.name || member.email)}
        </span>
    );

/**
 * `/p/:slug/members` — the roster, invites, and every action that changes who
 * can see this workspace.
 *
 * The three destructive paths (leave, remove, transfer) all pass through
 * `ConfirmDialog`, and each dialog names its *blast radius* rather than the
 * mechanism: removal states that the person's tickets become unassigned (T-D5),
 * transfer states that it cannot be undone alone (T-D4). A confirmation that
 * only says "are you sure?" is a click-through, not a gate.
 *
 * Permission comes from the server's `canManage`, not from a role compared in
 * the browser. The hidden button is a courtesy; the API is the boundary, and
 * every one of these routes re-checks.
 */
const ProjectMembers: FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { project, loading: projectLoading, refetch: refetchProject } = useProject(slug);
    const {
        members,
        invites,
        canManage,
        loading,
        error,
        invite,
        revokeInvite,
        setRole,
        removeMember,
        transferOwnership,
    } = useMembers(slug);

    // ── Invite dialog ────────────────────────────────────────
    const [inviteOpen, setInviteOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<AssignableRole>('member');
    const [emailError, setEmailError] = useState<string | undefined>();
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [inviting, setInviting] = useState(false);
    const [createdUrl, setCreatedUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // ── Row-level action state ───────────────────────────────
    const [rowError, setRowError] = useState<string | null>(null);
    const [busyUserId, setBusyUserId] = useState<number | null>(null);
    const [confirmRemove, setConfirmRemove] = useState<ProjectMember | null>(null);
    const [confirmLeave, setConfirmLeave] = useState(false);
    const [transferOpen, setTransferOpen] = useState(false);
    const [transferTarget, setTransferTarget] = useState('');
    const [removalNote, setRemovalNote] = useState<string | null>(null);

    const selfId = user?.id ?? null;
    const self = useMemo(() => members.find((m) => m.userId === selfId) ?? null, [members, selfId]);
    const isOwner = self?.role === 'owner' || project?.role === 'owner';
    const transferCandidates = useMemo(
        () => members.filter((m) => m.userId !== selfId),
        [members, selfId]
    );

    const closeInviteDialog = (open: boolean) => {
        setInviteOpen(open);
        if (!open) {
            // Cleared on close, deliberately: the link is shown once (T-D1), and a
            // dialog that re-renders the previous one on reopen makes it a value
            // that *is* recoverable from the UI, which is the property we spent a
            // hash column to avoid.
            setCreatedUrl(null);
            setEmail('');
            setInviteRole('member');
            setEmailError(undefined);
            setInviteError(null);
            setCopied(false);
        }
    };

    const submitInvite = async (e: FormEvent) => {
        e.preventDefault();
        const invalid = validateEmail(email);
        setEmailError(invalid);
        if (invalid) return;

        setInviting(true);
        setInviteError(null);
        try {
            const created = await invite(email.trim(), inviteRole);
            setCreatedUrl(created.inviteUrl);
        } catch (err) {
            // 409 (already a member) and 429 (20/hour per project) are both
            // specific sentences from the server. Paraphrasing them loses the
            // only actionable part.
            setInviteError(getErrorMessage(err, 'Could not create the invite'));
        } finally {
            setInviting(false);
        }
    };

    const copyLink = async () => {
        if (!createdUrl) return;
        try {
            await navigator.clipboard.writeText(createdUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setInviteError('Could not copy — select the link and copy it manually.');
        }
    };

    const changeRole = async (member: ProjectMember, role: AssignableRole) => {
        setBusyUserId(member.userId);
        setRowError(null);
        try {
            await setRole(member.userId, role);
        } catch (err) {
            // No optimistic write, so the Select still shows the old role — which
            // is the truth. Nothing to roll back.
            setRowError(getErrorMessage(err, 'Could not change that role'));
        } finally {
            setBusyUserId(null);
        }
    };

    if (loading || projectLoading) return <SkeletonText lines={6} lineHeight="h-16" />;

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
            <PageHeader title={project.name} subtitle={`Members · /${project.slug}`} />

            {slug && <ProjectTabs slug={slug} />}

            {/* ── Roster ──────────────────────────────────────────── */}
            <Surface variant="panel" padding="md" className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="font-heading text-base font-bold text-brand-dark dark:text-white">
                            Members
                        </h2>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                            {members.length} {members.length === 1 ? 'person' : 'people'} can see this
                            workspace. Roles take effect on the next request — there is no re-login.
                        </p>
                    </div>
                    {canManage && (
                        <AccentButton
                            size="sm"
                            icon={<FiUserPlus size={14} />}
                            onClick={() => setInviteOpen(true)}
                        >
                            Invite
                        </AccentButton>
                    )}
                </div>

                {rowError && (
                    <p role="alert" className="text-xs font-medium text-global-red">
                        {rowError}
                    </p>
                )}
                {removalNote && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{removalNote}</p>
                )}

                <ul className="flex flex-col divide-y divide-gray-200 dark:divide-white/10">
                    {members.map((m) => {
                        const isSelf = m.userId === selfId;
                        // T-D3: the owner's row is untouchable from here — not by an
                        // admin, and not by the owner themselves. It moves through
                        // transfer-ownership or not at all.
                        const editable = canManage && !m.isOwner;
                        return (
                            <li
                                key={m.userId}
                                className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
                            >
                                <MemberAvatar member={m} />

                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-brand-dark dark:text-gray-100">
                                        {m.name || m.email}
                                        {isSelf && (
                                            <span className="ml-2 text-xs font-normal text-gray-400">
                                                you
                                            </span>
                                        )}
                                    </p>
                                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                                        {m.email} · joined {formatDate(m.joinedAt)}
                                    </p>
                                </div>

                                {editable ? (
                                    <div className="w-32">
                                        <Select
                                            size="sm"
                                            aria-label={`Role for ${m.name || m.email}`}
                                            options={ROLE_OPTIONS}
                                            value={m.role}
                                            disabled={busyUserId === m.userId}
                                            onChange={(e) =>
                                                void changeRole(m, e.target.value as AssignableRole)
                                            }
                                        />
                                    </div>
                                ) : (
                                    <Badge tone={roleTone(m.role)}>{m.role}</Badge>
                                )}

                                {editable && !isSelf && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setRowError(null);
                                            setConfirmRemove(m);
                                        }}
                                        aria-label={`Remove ${m.name || m.email}`}
                                        className="grid h-8 w-8 place-items-center rounded-xl text-gray-400 outline-none transition-colors hover:bg-global-red/10 hover:text-global-red focus-visible:ring-2 focus-visible:ring-global-red/40"
                                    >
                                        <FiTrash2 size={15} />
                                    </button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </Surface>

            {/* ── Pending invites ─────────────────────────────────── */}
            {/* Rendered only for owner/admin. A `member` never receives the array —
                which addresses were approached is administrative, and knowing it
                is not something they can act on. */}
            {canManage && (
                <Surface variant="panel" padding="md" className="flex flex-col gap-4">
                    <div>
                        <h2 className="font-heading text-base font-bold text-brand-dark dark:text-white">
                            Pending invites
                        </h2>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                            An invite is a link you deliver yourself — there is no mail server yet, and
                            pretending otherwise would just lose invitations silently. Each one expires
                            after seven days.
                        </p>
                    </div>

                    {invites.length === 0 ? (
                        <EmptyState
                            size="sm"
                            icon={<FiMail size={18} />}
                            title="No invites outstanding"
                            description="Invite someone by their exact email address and share the link it gives you."
                        />
                    ) : (
                        <ul className="flex flex-col divide-y divide-gray-200 dark:divide-white/10">
                            {invites.map((i) => (
                                <li
                                    key={i.id}
                                    className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
                                >
                                    <span
                                        aria-hidden
                                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/5 text-gray-400 dark:bg-white/10 dark:text-gray-500"
                                    >
                                        <FiMail size={15} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-brand-dark dark:text-gray-100">
                                            {i.email}
                                        </p>
                                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                                            invited by {i.invitedBy} ·{' '}
                                            {i.expired
                                                ? 'expired'
                                                : `expires ${relativeTime(i.expiresAt)}`}
                                        </p>
                                    </div>
                                    <Badge tone={i.expired ? 'outline' : 'neutral'}>
                                        {i.expired ? 'expired' : i.role}
                                    </Badge>
                                    <AccentButton
                                        size="sm"
                                        variant="ghost"
                                        onClick={async () => {
                                            setRowError(null);
                                            try {
                                                await revokeInvite(i.id);
                                            } catch (err) {
                                                setRowError(
                                                    getErrorMessage(err, 'Could not revoke that invite')
                                                );
                                            }
                                        }}
                                    >
                                        Revoke
                                    </AccentButton>
                                </li>
                            ))}
                        </ul>
                    )}
                </Surface>
            )}

            {/* ── Ownership + leaving ─────────────────────────────── */}
            <Surface variant="panel" padding="md" className="flex flex-col gap-5">
                <div>
                    <h2 className="font-heading text-base font-bold text-brand-dark dark:text-white">
                        Your membership
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                        {isOwner
                            ? 'You own this project. Ownership can be handed to another member; it cannot be dropped.'
                            : 'Leaving removes your access immediately. Anything you reported or commented on stays — attribution is history, not access.'}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {isOwner ? (
                        <>
                            <AccentButton
                                size="sm"
                                variant="ghost"
                                icon={<FiSend size={14} />}
                                disabled={transferCandidates.length === 0}
                                onClick={() => {
                                    setRowError(null);
                                    setTransferTarget('');
                                    setTransferOpen(true);
                                }}
                            >
                                Transfer ownership
                            </AccentButton>
                            {transferCandidates.length === 0 && (
                                <span className="text-xs text-gray-400">
                                    Invite someone first — ownership can only move to an existing
                                    member.
                                </span>
                            )}
                            <span className="text-xs text-gray-400">
                                An owner cannot leave. Transfer first.
                            </span>
                        </>
                    ) : (
                        <AccentButton
                            size="sm"
                            variant="ghost"
                            icon={<FiLogOut size={14} />}
                            onClick={() => {
                                setRowError(null);
                                setConfirmLeave(true);
                            }}
                        >
                            Leave project
                        </AccentButton>
                    )}
                </div>
            </Surface>

            {/* ── Invite dialog ───────────────────────────────────── */}
            <Modal
                open={inviteOpen}
                onOpenChange={closeInviteDialog}
                title="Invite to this project"
                description={
                    createdUrl
                        ? 'Copy the link now. It is shown once and cannot be recovered afterwards.'
                        : 'Invites are matched on the exact address — there is no user search, by design.'
                }
                size="md"
                footer={
                    createdUrl ? (
                        <AccentButton size="sm" onClick={() => closeInviteDialog(false)}>
                            Done
                        </AccentButton>
                    ) : (
                        <>
                            <AccentButton
                                size="sm"
                                variant="ghost"
                                onClick={() => closeInviteDialog(false)}
                                disabled={inviting}
                            >
                                Cancel
                            </AccentButton>
                            <AccentButton
                                size="sm"
                                onClick={submitInvite}
                                disabled={inviting || !email.trim()}
                            >
                                {inviting ? 'Creating…' : 'Create invite'}
                            </AccentButton>
                        </>
                    )
                }
            >
                {createdUrl ? (
                    <div className="flex flex-col gap-3">
                        <code className="block overflow-x-auto whitespace-pre rounded-xl border border-gray-200 bg-white/60 px-3.5 py-2.5 font-mono text-xs text-brand-dark dark:border-white/10 dark:bg-white/5 dark:text-gray-200">
                            {createdUrl}
                        </code>
                        <div className="flex items-center gap-3">
                            <AccentButton
                                size="sm"
                                variant={copied ? 'dark' : 'accent'}
                                icon={copied ? <FiCheck size={14} /> : <FiCopy size={14} />}
                                onClick={copyLink}
                            >
                                {copied ? 'Copied' : 'Copy link'}
                            </AccentButton>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Only {email.trim()} can use it, and only for seven days.
                            </p>
                        </div>
                        {inviteError && (
                            <p role="alert" className="text-xs font-medium text-global-red">
                                {inviteError}
                            </p>
                        )}
                    </div>
                ) : (
                    <form onSubmit={submitInvite} noValidate className="flex flex-col gap-4">
                        <Field
                            label="Email"
                            error={emailError}
                            hint="Must match the address they sign in with."
                            required
                            id="invite-email"
                        >
                            <Input
                                type="email"
                                autoComplete="off"
                                placeholder="teammate@company.com"
                                icon={<FiMail size={16} />}
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (emailError) setEmailError(validateEmail(e.target.value));
                                }}
                                disabled={inviting}
                            />
                        </Field>

                        <Field label="Role" hint={ROLE_HINT[inviteRole]} id="invite-role">
                            <Select
                                options={ROLE_OPTIONS}
                                value={inviteRole}
                                onChange={(e) => setInviteRole(e.target.value as AssignableRole)}
                                disabled={inviting}
                            />
                        </Field>

                        {inviteError && (
                            <p role="alert" className="text-xs font-medium text-global-red">
                                {inviteError}
                            </p>
                        )}
                    </form>
                )}
            </Modal>

            {/* ── Remove member ───────────────────────────────────── */}
            <ConfirmDialog
                open={!!confirmRemove}
                onOpenChange={(open) => !open && setConfirmRemove(null)}
                title={`Remove ${confirmRemove ? confirmRemove.name || confirmRemove.email : ''}?`}
                description="They lose access to this workspace immediately, and any pending invite for their address is revoked so an old link cannot undo this."
                confirmLabel="Remove"
                destructive
                onConfirm={async () => {
                    if (!confirmRemove) return;
                    setRowError(null);
                    try {
                        const result = await removeMember(confirmRemove.userId);
                        setRemovalNote(
                            result.ticketsUnassigned === 0
                                ? `${confirmRemove.name || confirmRemove.email} removed.`
                                : result.ticketsUnassigned === 1
                                  ? `${confirmRemove.name || confirmRemove.email} removed. 1 ticket unassigned, with a note on the ticket saying why.`
                                  : `${confirmRemove.name || confirmRemove.email} removed. ${result.ticketsUnassigned} tickets unassigned, each with a note saying why.`
                        );
                        setConfirmRemove(null);
                    } catch (err) {
                        setRowError(getErrorMessage(err, 'Could not remove that member'));
                        throw err; // Keeps the dialog open so the message is next to the action.
                    }
                }}
            >
                <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                    Tickets assigned to them become <strong>unassigned</strong>, each with a note saying
                    why — an assignee who cannot open the ticket is a silently stalled ticket. Their
                    notifications for this project are deleted. What they reported and commented on
                    stays.
                </p>
                {rowError && (
                    <p role="alert" className="mt-3 text-xs font-medium text-global-red">
                        {rowError}
                    </p>
                )}
            </ConfirmDialog>

            {/* ── Leave ───────────────────────────────────────────── */}
            <ConfirmDialog
                open={confirmLeave}
                onOpenChange={setConfirmLeave}
                title={`Leave ${project.name}?`}
                description="You lose access immediately. Rejoining needs a fresh invite from an owner or admin."
                confirmLabel="Leave project"
                destructive
                onConfirm={async () => {
                    if (!selfId) return;
                    setRowError(null);
                    try {
                        await removeMember(selfId);
                        navigate('/projects', { replace: true });
                    } catch (err) {
                        setRowError(getErrorMessage(err, 'Could not leave this project'));
                        throw err;
                    }
                }}
            >
                <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                    Tickets assigned to you here become unassigned, and this project&apos;s
                    notifications leave your bell.
                </p>
                {rowError && (
                    <p role="alert" className="mt-3 text-xs font-medium text-global-red">
                        {rowError}
                    </p>
                )}
            </ConfirmDialog>

            {/* ── Transfer ownership ──────────────────────────────── */}
            <ConfirmDialog
                open={transferOpen}
                onOpenChange={setTransferOpen}
                title="Transfer ownership?"
                description="This is the one action here you cannot reverse on your own — only the new owner can hand it back."
                confirmLabel="Transfer ownership"
                destructive
                onConfirm={async () => {
                    const targetId = Number(transferTarget);
                    if (!Number.isInteger(targetId) || targetId <= 0) {
                        setRowError('Choose who should own this project.');
                        throw new Error('No target');
                    }
                    setRowError(null);
                    try {
                        await transferOwnership(targetId);
                        // The caller's own role changed as a side effect, so the
                        // cached project (which carries `role`) is now wrong and
                        // owner-only controls would keep rendering.
                        await refetchProject();
                        setTransferOpen(false);
                    } catch (err) {
                        setRowError(getErrorMessage(err, 'Could not transfer ownership'));
                        throw err;
                    }
                }}
            >
                <div className="flex flex-col gap-3">
                    <Field
                        label="New owner"
                        hint="Must already be a member — inviting and transferring in one step is two failure modes wearing one button."
                        id="transfer-target"
                    >
                        <Select
                            placeholder="Choose a member"
                            options={transferCandidates.map((m) => ({
                                value: String(m.userId),
                                label: `${m.name || m.email} (${m.role})`,
                            }))}
                            value={transferTarget}
                            onChange={(e) => setTransferTarget(e.target.value)}
                        />
                    </Field>
                    <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                        You become an <strong>admin</strong>: you keep settings and member management,
                        and lose archive and transfer.
                    </p>
                    {rowError && (
                        <p role="alert" className="text-xs font-medium text-global-red">
                            {rowError}
                        </p>
                    )}
                </div>
            </ConfirmDialog>

            {members.length === 0 && (
                <EmptyState
                    icon={<FiUsers size={20} />}
                    title="No members"
                    description="This should be impossible — every project has an owner. Reload, and report it if it persists."
                />
            )}
        </div>
    );
};

export default ProjectMembers;
