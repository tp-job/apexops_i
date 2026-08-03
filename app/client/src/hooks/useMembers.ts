import { useCallback, useEffect, useState } from 'react';
import { teamAPI } from '@/services/team';
import type {
    AssignableRole,
    CreatedInvite,
    PendingInvite,
    ProjectMember,
    RemoveMemberResult,
    TransferResult,
} from '@/types/team';
import { getErrorMessage } from '@/utils/error';

export interface UseMembersResult {
    members: ProjectMember[];
    invites: PendingInvite[];
    /** From the server, not inferred locally — the API is the authority on permission. */
    canManage: boolean;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    invite: (email: string, role: AssignableRole) => Promise<CreatedInvite>;
    revokeInvite: (id: number) => Promise<void>;
    setRole: (userId: number, role: AssignableRole) => Promise<void>;
    removeMember: (userId: number) => Promise<RemoveMemberResult>;
    transferOwnership: (userId: number) => Promise<TransferResult>;
}

/**
 * The roster for `/p/:slug/members`, plus the mutations that change it.
 *
 * **Every mutation refetches rather than patching local state.** That is not
 * laziness about optimistic updates — the server-side effects of these routes
 * are things the client structurally cannot reproduce. Removing a member also
 * revokes their pending invites, nulls their ticket assignments and deletes
 * their notifications (T-D5); transferring ownership rewrites two membership
 * rows *and* `Project.ownerId` in one transaction and demotes the caller (T-D4).
 * A locally-patched roster after either would be a plausible-looking lie, and
 * the whole point of the ownership invariant is that the UI and authorization
 * never disagree about who is in charge.
 *
 * Errors are thrown, not swallowed: these actions are all initiated from a
 * dialog or a row control that has somewhere specific to render the message.
 * `error` here is for the *load* failing, which is the only case with no
 * better home.
 */
export function useMembers(slug: string | undefined): UseMembersResult {
    const [members, setMembers] = useState<ProjectMember[]>([]);
    const [invites, setInvites] = useState<PendingInvite[]>([]);
    const [canManage, setCanManage] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(
        async (showSpinner: boolean) => {
            if (!slug) return;
            if (showSpinner) setLoading(true);
            try {
                const res = await teamAPI.members(slug);
                setMembers(res.members);
                setInvites(res.invites);
                setCanManage(res.canManage);
                setError(null);
            } catch (err) {
                setError(getErrorMessage(err, 'Could not load the member list'));
            } finally {
                if (showSpinner) setLoading(false);
            }
        },
        [slug]
    );

    useEffect(() => {
        // No slug means no project in scope (a route rendered without its param).
        // Fetching `/api/projects/undefined/members` would 404 and paint an error
        // for what is really "nothing to load yet".
        if (!slug) {
            setLoading(false);
            return;
        }
        void load(true);
    }, [slug, load]);

    const require = useCallback((): string => {
        if (!slug) throw new Error('No project in scope');
        return slug;
    }, [slug]);

    return {
        members,
        invites,
        canManage,
        loading,
        error,
        refetch: () => load(true),

        invite: async (email, role) => {
            const created = await teamAPI.invite(require(), { email, role });
            // Refetch so the pending list carries the invite immediately — the
            // create response is not shaped like a list row (it has no
            // `invitedBy`, and `expired` is computed against the server clock).
            await load(false);
            return created;
        },

        revokeInvite: async (id) => {
            await teamAPI.revokeInvite(require(), id);
            await load(false);
        },

        setRole: async (userId, role) => {
            await teamAPI.setRole(require(), userId, role);
            // Refetch rather than patching: the list is sorted by role
            // server-side, so a promoted member changes position.
            await load(false);
        },

        removeMember: async (userId) => {
            const result = await teamAPI.removeMember(require(), userId);
            // Skipped when the caller removed themselves — they have just lost
            // read access, and the refetch would 404 on the way out.
            if (!result.left) await load(false);
            return result;
        },

        transferOwnership: async (userId) => {
            const result = await teamAPI.transferOwnership(require(), userId);
            await load(false);
            return result;
        },
    };
}
