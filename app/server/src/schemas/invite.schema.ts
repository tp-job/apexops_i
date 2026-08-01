import { z } from 'zod';

/**
 * `owner` is deliberately absent from both role fields.
 *
 * There is exactly one owner and it is reached only through
 * `POST /:slug/transfer-ownership` (T-D4), which runs the demote/promote/
 * `Project.ownerId` update in a single transaction. Letting an invite or a role
 * edit write `owner` would mint a second owner row while `Project.ownerId` still
 * named the first — the settings screen and the authorization check would then
 * disagree about who is in charge.
 */
export const INVITABLE_ROLES = ['admin', 'member'] as const;

export const createInviteSchema = z.object({
    // Exact address, not a search (T-D6): the response is the same 201 whether
    // or not this address has an account, so the endpoint cannot be used to test
    // whether someone is registered here.
    email: z.string().trim().toLowerCase().email('A valid email address is required').max(254),
    role: z.enum(INVITABLE_ROLES).default('member'),
});

export const updateMemberRoleSchema = z.object({
    role: z.enum(INVITABLE_ROLES),
});

export const transferOwnershipSchema = z.object({
    // Must already be a member (T-D4). Transfer-and-invite in one step is two
    // failure modes wearing one button.
    userId: z.number().int().positive(),
});
