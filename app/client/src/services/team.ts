import { apiRequest } from '@/api/request';
import type {
    AcceptedInvite,
    AssignableRole,
    CreatedInvite,
    InvitePreview,
    MembersResponse,
    ProjectMember,
    RemoveMemberResult,
    TransferResult,
} from '@/types/team';

/**
 * Membership, invites and ownership transfer.
 *
 * Two objects rather than one, because the routes are mounted in two places for
 * a reason (T-D2): everything under `/api/projects/:slug` runs through
 * `resolveMembership`, which 404s a non-member by design — so the accept routes
 * cannot live there, since an invitee is by definition not a member yet.
 * Collapsing these into one namespace would invite exactly that mistake.
 *
 * Built on `apiRequest`, so a failure throws a typed `ApiError` carrying the
 * status *and* the server's message. That matters here more than anywhere else
 * in the client: 403 ("the owner's role can only be changed by transferring
 * ownership"), 409 ("transfer ownership before removing the project owner") and
 * 429 (invite rate limit) are each a specific sentence the user needs to read.
 */

export const teamAPI = {
    members: (slug: string): Promise<MembersResponse> =>
        apiRequest<MembersResponse>(`/api/projects/${slug}/members`),

    /** 201 → `inviteUrl`, shown once and never recoverable. Rate limited 20/hr per project. */
    invite: (slug: string, body: { email: string; role: AssignableRole }): Promise<CreatedInvite> =>
        apiRequest<CreatedInvite>(`/api/projects/${slug}/invites`, {
            method: 'POST',
            json: true,
            body: body as unknown as BodyInit,
        }),

    revokeInvite: (slug: string, id: number): Promise<{ revoked: boolean }> =>
        apiRequest(`/api/projects/${slug}/invites/${id}`, { method: 'DELETE' }),

    /** 403 on the owner's row — ownership moves through `transferOwnership` or not at all. */
    setRole: (slug: string, userId: number, role: AssignableRole): Promise<Partial<ProjectMember>> =>
        apiRequest(`/api/projects/${slug}/members/${userId}`, {
            method: 'PATCH',
            json: true,
            body: { role } as unknown as BodyInit,
        }),

    /** Removing yourself is leaving — same route, and the response says which it was. */
    removeMember: (slug: string, userId: number): Promise<RemoveMemberResult> =>
        apiRequest(`/api/projects/${slug}/members/${userId}`, { method: 'DELETE' }),

    transferOwnership: (slug: string, userId: number): Promise<TransferResult> =>
        apiRequest(`/api/projects/${slug}/transfer-ownership`, {
            method: 'POST',
            json: true,
            body: { userId } as unknown as BodyInit,
        }),
};

export const invitesAPI = {
    /** 404 unknown token · 410 expired, revoked or already accepted. */
    preview: (token: string): Promise<InvitePreview> =>
        apiRequest<InvitePreview>(`/api/invites/${encodeURIComponent(token)}`),

    /** 403 wrong address · 409 archived project · 410 dead link. */
    accept: (token: string): Promise<AcceptedInvite> =>
        apiRequest<AcceptedInvite>(`/api/invites/${encodeURIComponent(token)}/accept`, {
            method: 'POST',
            json: true,
            body: {} as unknown as BodyInit,
        }),
};
