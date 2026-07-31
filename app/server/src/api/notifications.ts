import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

/**
 * The in-app alert feed.
 *
 * Every query is scoped by `userId` from the bearer token — never by an id in
 * the path or body. Notifications are fanned out one row per member, so a row
 * belongs to exactly one person and there is no case where reading someone
 * else's is legitimate.
 */
const router = express.Router();
router.use(authenticate);

const MAX_LIMIT = 50;

// ── GET / ────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response): Promise<void> => {
    try {
        const unreadOnly = req.query.unread === 'true';
        const rawLimit = Number.parseInt(String(req.query.limit ?? ''), 10);
        const limit = Number.isSafeInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, MAX_LIMIT) : 20;

        const where = {
            userId: req.user!.id,
            ...(unreadOnly ? { readAt: null } : {}),
        };

        const [rows, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                select: {
                    id: true, kind: true, projectId: true, issueId: true,
                    title: true, body: true, readAt: true, createdAt: true,
                },
            }),
            // Always the *unread* count regardless of the filter — it drives the
            // badge, which must not change meaning when the list is filtered.
            prisma.notification.count({ where: { userId: req.user!.id, readAt: null } }),
        ]);

        // Slugs are resolved in one query rather than a join per row, so the feed
        // can link to /p/:slug/issues/:id without N+1.
        const projectIds = [...new Set(rows.map((r) => r.projectId))];
        const projects = projectIds.length
            ? await prisma.project.findMany({
                  where: { id: { in: projectIds } },
                  select: { id: true, slug: true, name: true },
              })
            : [];
        const slugById = new Map(projects.map((p) => [p.id, p]));

        res.json({
            unreadCount,
            notifications: rows.map((r) => ({
                ...r,
                readAt: r.readAt?.toISOString() ?? null,
                createdAt: r.createdAt.toISOString(),
                projectSlug: slugById.get(r.projectId)?.slug ?? null,
                projectName: slugById.get(r.projectId)?.name ?? null,
            })),
        });
    } catch (err: any) {
        console.error('Error fetching notifications:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch notifications' });
    }
});

// ── POST /read-all ───────────────────────────────────────────
// Before `/:id/read` so the literal path is not captured by the param route.
router.post('/read-all', async (req: Request, res: Response): Promise<void> => {
    try {
        const { count } = await prisma.notification.updateMany({
            where: { userId: req.user!.id, readAt: null },
            data: { readAt: new Date() },
        });
        res.json({ marked: count });
    } catch (err: any) {
        console.error('Error marking notifications read:', err);
        res.status(500).json({ error: err.message || 'Failed to mark read' });
    }
});

// ── POST /:id/read ───────────────────────────────────────────
router.post('/:id/read', async (req: Request, res: Response): Promise<void> => {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isSafeInteger(id) || id <= 0) {
        res.status(404).json({ error: 'Notification not found' });
        return;
    }

    try {
        // `updateMany` with the userId in the filter, not `update` by id: it makes
        // "not yours" and "does not exist" the same outcome, so this cannot be used
        // to probe which notification ids exist.
        const { count } = await prisma.notification.updateMany({
            where: { id, userId: req.user!.id, readAt: null },
            data: { readAt: new Date() },
        });
        if (count === 0) {
            const exists = await prisma.notification.count({ where: { id, userId: req.user!.id } });
            if (!exists) { res.status(404).json({ error: 'Notification not found' }); return; }
        }
        res.json({ read: true });
    } catch (err: any) {
        console.error('Error marking notification read:', err);
        res.status(500).json({ error: err.message || 'Failed to mark read' });
    }
});

export default router;
