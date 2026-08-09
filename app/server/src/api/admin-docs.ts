import express, { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { parseRouteId } from '../lib/routeParams';
import {
    createDocPageSchema,
    reorderDocPagesSchema,
    updateDocPageSchema,
} from '../schemas/doc.schema';

/**
 * The documentation CMS write path (F005).
 *
 * **The whole router is gated, not each route.** `Sidebar.tsx:26` says hiding a
 * link is presentation and not access control, and this codebase has already
 * been bitten by a gate applied to four routes out of five — so the middleware
 * goes on the router, where a route added next month inherits it instead of
 * needing someone to remember.
 *
 * `authorize('admin')` reads the role from the database on every request, so an
 * admin demoted while this screen is open starts getting 403s on their next
 * save rather than when their token happens to expire.
 *
 * Unlike `api/docs.ts`, these routes see drafts — that is the entire difference
 * between the two files, and the reason they are two files.
 */
const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));

const pageSelect = {
    id: true,
    slug: true,
    title: true,
    group: true,
    groupOrder: true,
    order: true,
    summary: true,
    body: true,
    status: true,
    updatedAt: true,
    updatedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
} as const;

/**
 * A slug collision is a field error, not a 500.
 *
 * The unique index is the thing that actually enforces it — checking first and
 * then writing is a race two admins can lose — so the constraint violation is
 * caught and translated rather than pre-empted.
 */
function isSlugConflict(err: unknown): boolean {
    return (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002' &&
        String(err.meta?.target ?? '').includes('slug')
    );
}

const slugTaken = (res: Response): void => {
    res.status(409).json({
        error: 'That slug is already in use',
        field: 'slug',
    });
};

// ── GET / ────────────────────────────────────────────────────
/** Every page, drafts included, in rail order. */
router.get('/', async (_req: Request, res: Response): Promise<void> => {
    try {
        const pages = await prisma.docPage.findMany({
            select: { ...pageSelect, body: false },
            orderBy: [{ groupOrder: 'asc' }, { order: 'asc' }, { slug: 'asc' }],
        });
        res.json({ pages });
    } catch (err: any) {
        console.error('Admin list docs error:', err);
        res.status(500).json({ error: 'Failed to list pages' });
    }
});

// ── GET /:id ─────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
    const id = parseRouteId(req.params.id);
    if (id === null) { res.status(404).json({ error: 'Page not found' }); return; }

    try {
        const page = await prisma.docPage.findUnique({ where: { id }, select: pageSelect });
        if (!page) { res.status(404).json({ error: 'Page not found' }); return; }
        res.json({ page });
    } catch (err: any) {
        console.error('Admin read doc error:', err);
        res.status(500).json({ error: 'Failed to load page' });
    }
});

// ── POST / ───────────────────────────────────────────────────
router.post('/', validate(createDocPageSchema), async (req: Request, res: Response): Promise<void> => {
    try {
        const page = await prisma.docPage.create({
            data: { ...req.body, updatedById: req.user?.id ?? null },
            select: pageSelect,
        });
        res.status(201).json({ page });
    } catch (err: any) {
        if (isSlugConflict(err)) { slugTaken(res); return; }
        console.error('Create doc error:', err);
        res.status(500).json({ error: 'Failed to create page' });
    }
});

// ── PATCH /:id ───────────────────────────────────────────────
/**
 * Also the publish/unpublish route: `status` is a field like any other.
 *
 * A separate `POST /:id/publish` would be a second way to write one column, and
 * the two would drift on who may call them — this codebase has that scar.
 * Slug edits are permitted here (S9-D8); the confirmation that names the
 * broken-link consequence lives in the UI, because the API cannot tell an
 * intentional rename from an accidental one.
 */
router.patch('/:id', validate(updateDocPageSchema), async (req: Request, res: Response): Promise<void> => {
    const id = parseRouteId(req.params.id);
    if (id === null) { res.status(404).json({ error: 'Page not found' }); return; }

    try {
        const page = await prisma.docPage.update({
            where: { id },
            data: { ...req.body, updatedById: req.user?.id ?? null },
            select: pageSelect,
        });
        res.json({ page });
    } catch (err: any) {
        if (isSlugConflict(err)) { slugTaken(res); return; }
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
            res.status(404).json({ error: 'Page not found' });
            return;
        }
        console.error('Update doc error:', err);
        res.status(500).json({ error: 'Failed to save page' });
    }
});

// ── POST /reorder ────────────────────────────────────────────
/**
 * Declared before `DELETE /:id` has no effect on routing, but it is written
 * next to the other write routes on purpose: it is the one that moves the
 * public sidebar, and it happens in a transaction so a half-applied order is
 * never what a visitor sees.
 */
router.post('/reorder', validate(reorderDocPagesSchema), async (req: Request, res: Response): Promise<void> => {
    const { pages } = req.body as { pages: { id: number; group: string; groupOrder: number; order: number }[] };

    try {
        await prisma.$transaction(
            pages.map((p) =>
                prisma.docPage.update({
                    where: { id: p.id },
                    data: { group: p.group, groupOrder: p.groupOrder, order: p.order },
                })
            )
        );
        res.json({ updated: pages.length });
    } catch (err: any) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
            res.status(404).json({ error: 'One of those pages no longer exists' });
            return;
        }
        console.error('Reorder docs error:', err);
        res.status(500).json({ error: 'Failed to reorder pages' });
    }
});

// ── DELETE /:id ──────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
    const id = parseRouteId(req.params.id);
    if (id === null) { res.status(404).json({ error: 'Page not found' }); return; }

    try {
        await prisma.docPage.delete({ where: { id } });
        res.status(204).end();
    } catch (err: any) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
            res.status(404).json({ error: 'Page not found' });
            return;
        }
        console.error('Delete doc error:', err);
        res.status(500).json({ error: 'Failed to delete page' });
    }
});

export default router;
