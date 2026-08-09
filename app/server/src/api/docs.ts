import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';

/**
 * The **public** documentation read path (spec S9-D3, criterion 2).
 *
 * No `authenticate`, deliberately and permanently. Whoever is pasting the SDK
 * snippet into another app needs the install instructions, and gating them is
 * how a one-line integration turns into a support conversation. Nothing here is
 * project data — it is reference material an admin chose to publish.
 *
 * Two rules hold on every route in this file:
 *
 * 1. **`status: 'published'` is in the `where`, never in a filter applied after
 *    the read.** A draft is an admin's in-progress writing; it must not be
 *    reachable by guessing its slug, and it must not appear in the rail.
 * 2. **A draft slug 404s exactly like a slug that does not exist.** Anything
 *    else — a 403, a different message — tells an anonymous visitor which
 *    unpublished pages exist.
 */
const router = express.Router();

/** The sidebar payload. `body` is not selected: the rail does not need it. */
const listSelect = {
    slug: true,
    title: true,
    group: true,
    groupOrder: true,
    order: true,
    summary: true,
} as const;

// ── GET / ────────────────────────────────────────────────────
router.get('/', async (_req: Request, res: Response): Promise<void> => {
    try {
        const pages = await prisma.docPage.findMany({
            where: { status: 'published' },
            select: listSelect,
            // slug last as the tiebreak: two pages sharing a position would
            // otherwise swap places between requests, and the rail would appear
            // to reshuffle itself on reload.
            orderBy: [{ groupOrder: 'asc' }, { order: 'asc' }, { slug: 'asc' }],
        });

        res.json({ pages });
    } catch (err: any) {
        console.error('List docs error:', err);
        res.status(500).json({ error: 'Failed to load documentation' });
    }
});

// ── GET /:slug ───────────────────────────────────────────────
router.get('/:slug', async (req: Request, res: Response): Promise<void> => {
    try {
        const page = await prisma.docPage.findFirst({
            where: { slug: String(req.params.slug), status: 'published' },
            select: { ...listSelect, body: true, updatedAt: true },
        });

        if (!page) {
            res.status(404).json({ error: 'Page not found' });
            return;
        }

        res.json({ page });
    } catch (err: any) {
        console.error('Read doc error:', err);
        res.status(500).json({ error: 'Failed to load documentation' });
    }
});

export default router;
