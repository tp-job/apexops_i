import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { validate } from '../middleware/validate';
import { inviteLimiter } from '../middleware/rateLimit';
import { canAdminister, isOwner, resolveMembership } from '../lib/projectAccess';
import {
    buildInviteUrl,
    generateInviteToken,
    hashInviteToken,
    inviteExpiry,
    normalizeEmail,
} from '../lib/invites';
import {
    createInviteSchema,
    transferOwnershipSchema,
    updateMemberRoleSchema,
} from '../schemas/invite.schema';

/**
 * Membership, invites and ownership transfer.
 *
 * Mounted at the projects router root rather than under `/:slug/members`,
 * because these three surfaces share `:slug` but not a path prefix —
 * `/:slug/members`, `/:slug/invites` and `/:slug/transfer-ownership` would
 * otherwise be three mounts of the same file. `authenticate` is applied by the
 * parent router, as it is for the issues and overview routers.
 */
const router = express.Router();

const displayName = (u: { firstName: string; lastName: string }) =>
    [u.firstName, u.lastName].filter(Boolean).join(' ').trim();

const memberUserSelect = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    avatarUrl: true,
} as const;

const parseUserId = (raw: string | string[] | undefined): number | null => {
    if (typeof raw !== 'string') return null;
    const id = Number(raw);
    return Number.isInteger(id) && id > 0 ? id : null;
};

// ── GET /:slug/members ───────────────────────────────────────
router.get('/:slug/members', async (req: Request, res: Response): Promise<void> => {
    try {
        const found = await resolveMembership(req.params.slug, req.user!.id);
        if (!found) { res.status(404).json({ error: 'Project not found' }); return; }

        const members = await prisma.projectMember.findMany({
            where: { projectId: found.project.id },
            select: { role: true, createdAt: true, user: { select: memberUserSelect } },
            // Owner first, then admins, then members — the list is read as a
            // hierarchy, and sorting it by join date buries the person you are
            // usually looking for.
            orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
        });

        // Pending invites are unclaimed access, so they are an administrative
        // detail, not a roster entry. A `member` seeing them would learn which
        // addresses were approached and declined — information they cannot act on.
        const invites = canAdminister(found.role)
            ? await prisma.projectInvite.findMany({
                  where: { projectId: found.project.id, status: 'pending' },
                  select: {
                      id: true,
                      email: true,
                      role: true,
                      expiresAt: true,
                      createdAt: true,
                      invitedBy: { select: { firstName: true, lastName: true } },
                  },
                  orderBy: { createdAt: 'desc' },
              })
            : [];

        res.json({
            members: members.map((m) => ({
                userId: m.user.id,
                name: displayName(m.user),
                email: m.user.email,
                avatarUrl: m.user.avatarUrl,
                role: m.role,
                joinedAt: m.createdAt.toISOString(),
                isOwner: m.role === 'owner',
            })),
            invites: invites.map((i) => ({
                id: i.id,
                email: i.email,
                role: i.role,
                invitedBy: displayName(i.invitedBy),
                // The token is never re-displayed. Same rule as the ingest key
                // rotation flow: a value that cannot be shown twice must not be
                // quietly recoverable from a list endpoint.
                expiresAt: i.expiresAt.toISOString(),
                expired: i.expiresAt.getTime() < Date.now(),
                createdAt: i.createdAt.toISOString(),
            })),
            // The client needs this to decide whether to render the invite button
            // at all, and it is the same role it already has from the project.
            canManage: canAdminister(found.role),
        });
    } catch (err: any) {
        console.error('Error fetching members:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch members' });
    }
});

// ── POST /:slug/invites ──────────────────────────────────────
router.post(
    '/:slug/invites',
    inviteLimiter,
    validate(createInviteSchema),
    async (req: Request, res: Response): Promise<void> => {
        const { email, role } = req.body as { email: string; role: 'admin' | 'member' };

        try {
            const found = await resolveMembership(req.params.slug, req.user!.id);
            if (!found) { res.status(404).json({ error: 'Project not found' }); return; }
            if (!canAdminister(found.role)) {
                res.status(403).json({ error: 'Only a project owner or admin can invite members' });
                return;
            }
            // T-D7: an archived workspace has stopped ingesting. Growing its
            // membership is meaningless, and the invite would land someone in a
            // project with nothing in it.
            if (found.project.archivedAt) {
                res.status(409).json({ error: 'This project is archived. Restore it before inviting members' });
                return;
            }

            const address = normalizeEmail(email);

            // Looked up by address, not searched by prefix (T-D6). The only thing
            // this reveals is whether that exact address is already on a project
            // the caller can already list the members of.
            const existing = await prisma.user.findUnique({
                where: { email: address },
                select: { id: true, firstName: true, lastName: true },
            });
            if (existing) {
                const alreadyIn = await prisma.projectMember.findUnique({
                    where: { projectId_userId: { projectId: found.project.id, userId: existing.id } },
                    select: { userId: true },
                });
                if (alreadyIn) {
                    res.status(409).json({ error: 'That person is already a member of this project' });
                    return;
                }
            }

            const token = generateInviteToken();
            const expiresAt = inviteExpiry();

            // Upsert on (projectId, email): re-inviting the same address replaces
            // the token rather than stacking rows, so the pending list stays a
            // list of live invitations instead of an audit log nobody trusts.
            // The previous token stops working the moment its hash is overwritten.
            const invite = await prisma.projectInvite.upsert({
                where: { projectId_email: { projectId: found.project.id, email: address } },
                create: {
                    projectId: found.project.id,
                    email: address,
                    role,
                    tokenHash: hashInviteToken(token),
                    invitedById: req.user!.id,
                    expiresAt,
                },
                update: {
                    role,
                    tokenHash: hashInviteToken(token),
                    invitedById: req.user!.id,
                    expiresAt,
                    status: 'pending',
                    acceptedAt: null,
                    acceptedById: null,
                },
                select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
            });

            // In-product delivery when the address already has an account — the
            // common case in a small team. When it does not, the link is the only
            // channel, which is correct: open registration exists, so they can
            // sign up and then accept.
            if (existing) {
                await prisma.notification.create({
                    data: {
                        userId: existing.id,
                        kind: 'invite',
                        projectId: found.project.id,
                        title: `You were invited to ${found.project.name}`,
                        body: `${req.user!.email} invited you to join as ${role}.`,
                    },
                });
            }

            res.status(201).json({
                invite: {
                    id: invite.id,
                    email: invite.email,
                    role: invite.role,
                    expiresAt: invite.expiresAt.toISOString(),
                    createdAt: invite.createdAt.toISOString(),
                },
                // Shown once and never again — see the members list, which
                // deliberately cannot return it.
                inviteUrl: buildInviteUrl(token),
            });
        } catch (err: any) {
            console.error('Error creating invite:', err);
            res.status(500).json({ error: err.message || 'Failed to create invite' });
        }
    }
);

// ── DELETE /:slug/invites/:id ────────────────────────────────
router.delete('/:slug/invites/:id', async (req: Request, res: Response): Promise<void> => {
    try {
        const found = await resolveMembership(req.params.slug, req.user!.id);
        if (!found) { res.status(404).json({ error: 'Project not found' }); return; }
        if (!canAdminister(found.role)) {
            res.status(403).json({ error: 'Only a project owner or admin can revoke invites' });
            return;
        }

        const inviteId = parseUserId(req.params.id);
        if (!inviteId) { res.status(404).json({ error: 'Invite not found' }); return; }

        // Scoped by `projectId`, not addressed by bare id: an invite id from
        // another project must 404 here rather than being revocable by anyone who
        // can administer any project.
        const revoked = await prisma.projectInvite.updateMany({
            where: { id: inviteId, projectId: found.project.id, status: 'pending' },
            data: { status: 'revoked' },
        });
        if (!revoked.count) { res.status(404).json({ error: 'Invite not found' }); return; }

        res.json({ revoked: true });
    } catch (err: any) {
        console.error('Error revoking invite:', err);
        res.status(500).json({ error: err.message || 'Failed to revoke invite' });
    }
});

// ── PATCH /:slug/members/:userId ─────────────────────────────
router.patch(
    '/:slug/members/:userId',
    validate(updateMemberRoleSchema),
    async (req: Request, res: Response): Promise<void> => {
        const { role } = req.body as { role: 'admin' | 'member' };

        try {
            const found = await resolveMembership(req.params.slug, req.user!.id);
            if (!found) { res.status(404).json({ error: 'Project not found' }); return; }
            if (!canAdminister(found.role)) {
                res.status(403).json({ error: 'Only a project owner or admin can change roles' });
                return;
            }

            const targetId = parseUserId(req.params.userId);
            if (!targetId) { res.status(404).json({ error: 'Member not found' }); return; }

            const target = await prisma.projectMember.findUnique({
                where: { projectId_userId: { projectId: found.project.id, userId: targetId } },
                select: { role: true },
            });
            if (!target) { res.status(404).json({ error: 'Member not found' }); return; }

            // T-D3. Without this rule `admin` is `owner` with extra steps: any
            // admin could demote the owner and take the project. The owner's role
            // changes through transfer-ownership or not at all.
            if (target.role === 'owner') {
                res.status(403).json({ error: "The owner's role can only be changed by transferring ownership" });
                return;
            }

            const updated = await prisma.projectMember.update({
                where: { projectId_userId: { projectId: found.project.id, userId: targetId } },
                data: { role },
                select: { role: true, user: { select: memberUserSelect } },
            });

            res.json({
                userId: updated.user.id,
                name: displayName(updated.user),
                email: updated.user.email,
                role: updated.role,
            });
        } catch (err: any) {
            console.error('Error updating member role:', err);
            res.status(500).json({ error: err.message || 'Failed to update member role' });
        }
    }
);

// ── DELETE /:slug/members/:userId ────────────────────────────
router.delete('/:slug/members/:userId', async (req: Request, res: Response): Promise<void> => {
    try {
        const found = await resolveMembership(req.params.slug, req.user!.id);
        if (!found) { res.status(404).json({ error: 'Project not found' }); return; }

        const targetId = parseUserId(req.params.userId);
        if (!targetId) { res.status(404).json({ error: 'Member not found' }); return; }

        // Leaving is removing yourself, so `member` reaches this route for exactly
        // one row. Anything else needs administer rights.
        const isSelf = targetId === req.user!.id;
        if (!isSelf && !canAdminister(found.role)) {
            res.status(403).json({ error: 'Only a project owner or admin can remove members' });
            return;
        }

        const target = await prisma.projectMember.findUnique({
            where: { projectId_userId: { projectId: found.project.id, userId: targetId } },
            select: { role: true, user: { select: memberUserSelect } },
        });
        if (!target) { res.status(404).json({ error: 'Member not found' }); return; }

        // 409, not a silent no-op (T-D4): there is exactly one owner, so removing
        // them — including an owner trying to leave — would orphan the project.
        if (target.role === 'owner') {
            res.status(409).json({ error: 'Transfer ownership before removing the project owner' });
            return;
        }

        const removedName = displayName(target.user);
        const actorId = req.user!.id;

        // T-D5 in one interactive transaction. Reading the affected tickets
        // *inside* it is the point: a ticket assigned between the read and the
        // write would otherwise keep an assignee who can no longer open it.
        const ticketsUnassigned = await prisma.$transaction(async (tx) => {
            const stranded = await tx.ticket.findMany({
                where: { projectId: found.project.id, assigneeId: targetId },
                select: { id: true },
            });

            await tx.projectMember.delete({
                where: { projectId_userId: { projectId: found.project.id, userId: targetId } },
            });

            // Otherwise removal is undone by an old link still sitting in a chat
            // thread.
            await tx.projectInvite.updateMany({
                where: {
                    projectId: found.project.id,
                    email: normalizeEmail(target.user.email),
                    status: 'pending',
                },
                data: { status: 'revoked' },
            });

            if (stranded.length) {
                await tx.ticket.updateMany({
                    where: { projectId: found.project.id, assigneeId: targetId },
                    // The legacy display denorm goes too, or the board keeps
                    // rendering a name for a ticket that has no assignee.
                    data: { assigneeId: null, assignee: null },
                });
                // An assignee who cannot open the ticket is a silently stalled
                // ticket. The board has to say so, in the place people look.
                await tx.ticketComment.createMany({
                    data: stranded.map((t) => ({
                        ticketId: t.id,
                        authorId: actorId,
                        kind: 'activity' as const,
                        body: `Unassigned ${removedName} — removed from this project`,
                        meta: { field: 'assignee', from: removedName, to: null },
                    })),
                });
            }

            // These carry issue titles and regression details. Leaving them in a
            // removed member's bell is a post-removal leak of the workspace they
            // just lost access to.
            await tx.notification.deleteMany({
                where: { userId: targetId, projectId: found.project.id },
            });

            // `Ticket.reporterId` and `TicketComment.author` are deliberately
            // untouched: attribution is history, not access. They cannot read any
            // of it without a membership row.

            return stranded.length;
        });

        res.json({ removed: true, userId: targetId, ticketsUnassigned, left: isSelf });
    } catch (err: any) {
        if (err.code === 'P2025') { res.status(404).json({ error: 'Member not found' }); return; }
        console.error('Error removing member:', err);
        res.status(500).json({ error: err.message || 'Failed to remove member' });
    }
});

// ── POST /:slug/transfer-ownership ───────────────────────────
router.post(
    '/:slug/transfer-ownership',
    validate(transferOwnershipSchema),
    async (req: Request, res: Response): Promise<void> => {
        const { userId: targetId } = req.body as { userId: number };

        try {
            const found = await resolveMembership(req.params.slug, req.user!.id);
            if (!found) { res.status(404).json({ error: 'Project not found' }); return; }
            if (!isOwner(found.role)) {
                res.status(403).json({ error: 'Only the project owner can transfer ownership' });
                return;
            }
            if (targetId === req.user!.id) {
                res.status(400).json({ error: 'You already own this project' });
                return;
            }

            // T-D4: the target must already be a member. Transfer-and-invite in
            // one step is two failure modes wearing one button.
            const target = await prisma.projectMember.findUnique({
                where: { projectId_userId: { projectId: found.project.id, userId: targetId } },
                select: { role: true, user: { select: memberUserSelect } },
            });
            if (!target) {
                res.status(400).json({ error: 'That person must already be a member of this project' });
                return;
            }

            // One transaction, three writes. Ownership is stored twice —
            // `Project.ownerId` and the `owner` member row — so any partial
            // application produces a project whose settings screen and whose
            // authorization check disagree about who is in charge.
            await prisma.$transaction([
                prisma.projectMember.update({
                    where: { projectId_userId: { projectId: found.project.id, userId: req.user!.id } },
                    data: { role: 'admin' },
                }),
                prisma.projectMember.update({
                    where: { projectId_userId: { projectId: found.project.id, userId: targetId } },
                    data: { role: 'owner' },
                }),
                prisma.project.update({
                    where: { id: found.project.id },
                    data: { ownerId: targetId },
                }),
            ]);

            res.json({
                transferred: true,
                ownerId: targetId,
                ownerName: displayName(target.user),
                // The caller's own role changed as a side effect of this call, and
                // their cached copy is now wrong. Say so rather than letting the
                // UI keep rendering owner-only controls until the next refetch.
                yourRole: 'admin',
            });
        } catch (err: any) {
            if (err.code === 'P2025') { res.status(404).json({ error: 'Project not found' }); return; }
            console.error('Error transferring ownership:', err);
            res.status(500).json({ error: err.message || 'Failed to transfer ownership' });
        }
    }
);

export default router;
