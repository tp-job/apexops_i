import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { hashInviteToken, normalizeEmail } from '../lib/invites';

/**
 * Invite preview and accept — mounted at the API root, NOT under `/:slug`.
 *
 * Every route under `/api/projects/:slug` goes through `resolveMembership`,
 * which 404s a non-member by design so the slug cannot be enumerated. An
 * invitee is by definition not yet a member, so an accept route mounted there
 * would 404 exactly the person it exists for (T-D2).
 */
const router = express.Router();
router.use(authenticate);

const displayName = (u: { firstName: string; lastName: string }) =>
    [u.firstName, u.lastName].filter(Boolean).join(' ').trim();

type InviteLookup = NonNullable<Awaited<ReturnType<typeof findInvite>>>;

async function findInvite(token: string | string[] | undefined) {
    if (typeof token !== 'string' || !token) return null;
    return prisma.projectInvite.findUnique({
        // The plaintext token is never stored, so the lookup is by hash. This is
        // also why a stolen database dump is not a set of working invite links.
        where: { tokenHash: hashInviteToken(token) },
        select: {
            id: true,
            email: true,
            role: true,
            status: true,
            expiresAt: true,
            project: { select: { id: true, name: true, slug: true, archivedAt: true } },
            invitedBy: { select: { firstName: true, lastName: true } },
        },
    });
}

/**
 * `gone` covers revoked, already-accepted and expired alike.
 *
 * All three mean "this link is no longer a way in", and distinguishing them in
 * the response would tell whoever holds a leaked link *why* it failed — which is
 * a small oracle about the project's activity. The accept screen only needs to
 * know that it is dead and that asking the inviter again is the fix.
 */
const isGone = (invite: InviteLookup): boolean =>
    invite.status !== 'pending' || invite.expiresAt.getTime() < Date.now();

/**
 * The binding email comes from the **database**, not from `req.user.email`.
 *
 * The JWT carries the email it was signed with, so an account that changed its
 * address still presents the old one until the token rolls over. Binding is the
 * single control that makes a forwarded link safe (T-D1); it must not be decided
 * by a value that can be stale.
 */
async function callerEmail(userId: number): Promise<string | null> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    return user ? normalizeEmail(user.email) : null;
}

// ── GET /api/invites/:token ──────────────────────────────────
router.get('/:token', async (req: Request, res: Response): Promise<void> => {
    try {
        const invite = await findInvite(req.params.token);
        if (!invite) { res.status(404).json({ error: 'Invite not found' }); return; }
        if (isGone(invite)) {
            res.status(410).json({ error: 'This invite has expired or is no longer valid' });
            return;
        }

        const email = await callerEmail(req.user!.id);

        // Returning the project name to whoever holds the token is deliberate:
        // holding the token is the thing the invite grants, and an accept screen
        // that cannot name the project is unusable.
        res.json({
            project: { name: invite.project.name, slug: invite.project.slug },
            invitedBy: displayName(invite.invitedBy),
            role: invite.role,
            email: invite.email,
            // Drives the "this invite was sent to another address" state (G4)
            // rather than making the user click accept to discover it.
            emailMatches: email === normalizeEmail(invite.email),
            expiresAt: invite.expiresAt.toISOString(),
        });
    } catch (err: any) {
        console.error('Error reading invite:', err);
        res.status(500).json({ error: err.message || 'Failed to read invite' });
    }
});

// ── POST /api/invites/:token/accept ──────────────────────────
router.post('/:token/accept', async (req: Request, res: Response): Promise<void> => {
    try {
        const invite = await findInvite(req.params.token);
        if (!invite) { res.status(404).json({ error: 'Invite not found' }); return; }
        if (isGone(invite)) {
            res.status(410).json({ error: 'This invite has expired or is no longer valid' });
            return;
        }

        const email = await callerEmail(req.user!.id);
        if (!email || email !== normalizeEmail(invite.email)) {
            res.status(403).json({ error: 'This invite was sent to another email address' });
            return;
        }

        // An archived workspace has stopped ingesting; joining one is joining
        // nothing. Checked at accept as well as at create, because a project can
        // be archived during the seven days the link is live.
        if (invite.project.archivedAt) {
            res.status(409).json({ error: 'This project is archived' });
            return;
        }

        const projectId = invite.project.id;
        const userId = req.user!.id;

        const role = await prisma.$transaction(async (tx) => {
            const existing = await tx.projectMember.findUnique({
                where: { projectId_userId: { projectId, userId } },
                select: { role: true },
            });

            // Already a member — accepting is a no-op on the membership rather
            // than a write. An `admin` who is handed a stale `member` invite must
            // not be demoted by clicking a link.
            if (!existing) {
                await tx.projectMember.create({ data: { projectId, userId, role: invite.role } });
            }

            // Burned either way: the token is single-use, and leaving it pending
            // after a successful accept leaves a live credential lying around.
            await tx.projectInvite.update({
                where: { id: invite.id },
                data: { status: 'accepted', acceptedAt: new Date(), acceptedById: userId },
            });

            return existing?.role ?? invite.role;
        });

        res.json({
            accepted: true,
            project: { name: invite.project.name, slug: invite.project.slug },
            role,
        });
    } catch (err: any) {
        console.error('Error accepting invite:', err);
        res.status(500).json({ error: err.message || 'Failed to accept invite' });
    }
});

export default router;
