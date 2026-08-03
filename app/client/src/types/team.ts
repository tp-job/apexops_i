/**
 * Project membership, invites and ownership transfer.
 *
 * Mirrors `api/team.ts` (project-scoped) and `api/invites.ts` (root-mounted,
 * T-D2). Dates arrive as ISO strings — the API serializes them rather than
 * handing over `Date`.
 *
 * Spec: `.agents/docs/features/team-and-roles.md`
 */
import type { ProjectRole } from './projects';

/** The two roles an invite or a role change can target. `owner` is not settable — T-D4. */
export type AssignableRole = Exclude<ProjectRole, 'owner'>;

export const ASSIGNABLE_ROLES: AssignableRole[] = ['admin', 'member'];

export interface ProjectMember {
    userId: number;
    /** `firstName lastName`, joined server-side. May be empty for a nameless account. */
    name: string;
    email: string;
    avatarUrl: string | null;
    role: ProjectRole;
    joinedAt: string;
    /** Redundant with `role === 'owner'`, but the server is the authority on it. */
    isOwner: boolean;
}

export interface PendingInvite {
    id: number;
    email: string;
    role: AssignableRole;
    invitedBy: string;
    expiresAt: string;
    /**
     * Computed server-side against the server's clock. Do not recompute from
     * `expiresAt` in the browser — a skewed client would strike out live invites.
     */
    expired: boolean;
    createdAt: string;
}

export interface MembersResponse {
    members: ProjectMember[];
    /** Always `[]` for a plain `member` — pending invites are administrative. */
    invites: PendingInvite[];
    /** The server's answer to "render the invite button?", not a local inference. */
    canManage: boolean;
}

export interface CreatedInvite {
    invite: {
        id: number;
        email: string;
        role: AssignableRole;
        expiresAt: string;
        createdAt: string;
    };
    /** Shown once. The members list deliberately cannot return it again (T-D1). */
    inviteUrl: string;
}

export interface RemoveMemberResult {
    removed: boolean;
    userId: number;
    /** T-D5: tickets that lost their assignee, each with a system comment. */
    ticketsUnassigned: number;
    /** True when the caller removed themselves — i.e. they left. */
    left: boolean;
}

export interface TransferResult {
    transferred: boolean;
    ownerId: number;
    ownerName: string;
    /** The caller's own role after the transfer. Their cached copy is now stale. */
    yourRole: ProjectRole;
}

/** `GET /api/invites/:token` — everything the accept screen needs to render. */
export interface InvitePreview {
    project: { name: string; slug: string };
    invitedBy: string;
    role: AssignableRole;
    /** The address the invite is bound to. Shown in the wrong-account state. */
    email: string;
    /**
     * False when the signed-in account's email does not match. Drives the
     * wrong-address state *before* an accept attempt rather than after a 403.
     */
    emailMatches: boolean;
    expiresAt: string;
}

export interface AcceptedInvite {
    accepted: boolean;
    project: { name: string; slug: string };
    role: ProjectRole;
}
