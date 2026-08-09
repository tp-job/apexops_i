import express, { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { revokeAllSessions } from '../lib/sessions';
import { parseRouteId } from '../lib/routeParams';
import {
    listUsersQuerySchema,
    updateUserActiveSchema,
    updateUserRoleSchema,
} from '../schemas/user.schema';

/**
 * User administration — the routes that make the global `admin` role mean
 * something (spec D5/D6/D8).
 *
 * Until this landed, `authorize()` had exactly one caller in the entire codebase
 * (`DELETE /api/logs`). Promoting someone to admin granted the ability to bulk
 * delete logs and nothing else; demoting them removed nothing else. That is why
 * settings.md's S-D5 insists the endpoints get gated in the *same* gate as the
 * role UI — a role screen shipped ahead of them makes the sprint goal false on
 * delivery day.
 *
 * Two rules hold across every route here:
 *
 * 1. **`authorize('admin')` reads the database, not the token.** So a demotion
 *    takes effect on the demoted user's very next request, with no re-login and
 *    no token-version bookkeeping. See `middleware/auth.ts`.
 * 2. **A write that removes access also ends the target's sessions.** Rule 1
 *    covers admin-gated routes instantly; this is what stops their *ordinary*
 *    access from outliving the change for the rest of the access token's life.
 */
const router = express.Router();

router.use(authenticate);
// Gate the whole router, not each route. A route added later that forgets the
// middleware is exactly the hole this file exists to close.
router.use(authorize('admin'));

const userSelect = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    role: true,
    isActive: true,
    avatarUrl: true,
    createdAt: true,
} as const;

/**
 * How many *other* accounts could still administer this instance.
 *
 * Takes the transaction client so the count and the write that depends on it
 * cannot be separated: two admins demoting each other concurrently would
 * otherwise each see the other as a survivor and both succeed, leaving zero
 * admins and no recovery path.
 */
async function otherActiveAdmins(tx: Prisma.TransactionClient, excludingUserId: number): Promise<number> {
    return tx.user.count({
        where: { role: 'admin', isActive: true, id: { not: excludingUserId } },
    });
}

// ── GET / ────────────────────────────────────────────────────
/**
 * The account directory.
 *
 * Admin-gated for a reason beyond tidiness: this is every registered user's name
 * and email in one response. Sprint 6 fixed the same class of leak on the ticket
 * assignee route, where "is a known user" was being checked instead of "is a
 * member of this project".
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
    try {
        // Parsed inline rather than via `validateQuery`: Express 5 exposes
        // `req.query` as a getter, so that middleware throws when it assigns the
        // parsed result back. Same treatment as api/projects.ts and api/tickets.ts.
        const parsed = listUsersQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            res.status(400).json({
                error: 'Invalid query parameters',
                details: parsed.error.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
            });
            return;
        }
        const { q, page, pageSize } = parsed.data;

        const where: Prisma.UserWhereInput = q
            ? {
                OR: [
                    { firstName: { contains: q, mode: 'insensitive' } },
                    { lastName: { contains: q, mode: 'insensitive' } },
                    { email: { contains: q, mode: 'insensitive' } },
                ],
            }
            : {};

        const [total, users] = await Promise.all([
            prisma.user.count({ where }),
            prisma.user.findMany({
                where,
                select: userSelect,
                // id as the tiebreak: ordering by createdAt alone is not a total
                // order here (seeded rows share a timestamp), and a non-total order
                // makes paging drop and repeat rows.
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
        ]);

        res.json({ users, total, page, pageSize });
    } catch (err: any) {
        console.error('List users error:', err);
        res.status(500).json({ error: 'Failed to list users' });
    }
});

// ── PATCH /:id/role ──────────────────────────────────────────
router.patch('/:id/role', validate(updateUserRoleSchema), async (req: Request, res: Response): Promise<void> => {
    const id = parseRouteId(req.params.id);
    if (id === null) { res.status(404).json({ error: 'User not found' }); return; }

    const { role } = req.body as { role: 'admin' | 'user' };

    try {
        const updated = await prisma.$transaction(async (tx) => {
            const target = await tx.user.findUnique({
                where: { id },
                select: { id: true, role: true, isActive: true },
            });
            if (!target) return { error: 'not-found' as const };

            // The last-admin guard. Checked on demotion only — promoting can never
            // reduce the admin count.
            if (target.role === 'admin' && role !== 'admin' && target.isActive !== false) {
                if ((await otherActiveAdmins(tx, id)) === 0) return { error: 'last-admin' as const };
            }

            const user = await tx.user.update({ where: { id }, data: { role }, select: userSelect });
            return { user };
        });

        if ('error' in updated && updated.error === 'not-found') {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        if ('error' in updated && updated.error === 'last-admin') {
            res.status(409).json({
                error: 'This is the last admin',
                detail: 'Promote another user to admin before changing this one, or the instance is left with no way to administer it.',
            });
            return;
        }

        // Losing the admin role should not leave a session that still behaves like
        // one. `authorize()` already refuses them on the next request; ending their
        // sessions closes the ordinary-access window too (spec D6).
        if (role !== 'admin') await revokeAllSessions(id);

        res.json({ user: (updated as { user: unknown }).user });
    } catch (err: any) {
        console.error('Update user role error:', err);
        res.status(500).json({ error: 'Failed to update role' });
    }
});

// ── PATCH /:id/active ────────────────────────────────────────
router.patch('/:id/active', validate(updateUserActiveSchema), async (req: Request, res: Response): Promise<void> => {
    const id = parseRouteId(req.params.id);
    if (id === null) { res.status(404).json({ error: 'User not found' }); return; }

    const { isActive } = req.body as { isActive: boolean };

    try {
        const result = await prisma.$transaction(async (tx) => {
            const target = await tx.user.findUnique({
                where: { id },
                select: { id: true, role: true, isActive: true },
            });
            if (!target) return { error: 'not-found' as const };

            // Deactivating the last admin locks everyone out just as thoroughly as
            // demoting them, so it gets the same guard rather than a different one.
            if (!isActive && target.role === 'admin' && target.isActive !== false) {
                if ((await otherActiveAdmins(tx, id)) === 0) return { error: 'last-admin' as const };
            }

            const user = await tx.user.update({ where: { id }, data: { isActive }, select: userSelect });
            return { user };
        });

        if ('error' in result && result.error === 'not-found') {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        if ('error' in result && result.error === 'last-admin') {
            res.status(409).json({
                error: 'This is the last admin',
                detail: 'Deactivating them would leave the instance with no way to administer it.',
            });
            return;
        }

        // "Deactivated" has to mean signed out, or it is a label rather than a
        // control. /refresh refuses them independently as a backstop.
        if (!isActive) await revokeAllSessions(id);

        res.json({ user: (result as { user: unknown }).user });
    } catch (err: any) {
        console.error('Update user active error:', err);
        res.status(500).json({ error: 'Failed to update account status' });
    }
});

export default router;
