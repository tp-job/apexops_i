import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { generateUniqueIngestKey, generateUniqueSlug } from '../lib/projectKeys';
import {
    createProjectSchema,
    updateProjectSchema,
    listProjectsQuerySchema,
    DEFAULT_CAPTURE_LEVELS,
} from '../schemas/project.schema';
import { ProjectRole } from '@prisma/client';
import {
    asStringArray,
    canAdminister,
    projectSelect,
    resolveMembership,
    type ProjectRow,
} from '../lib/projectAccess';
import { isSafeWebhookTarget } from '../lib/webhook';
import issuesRouter from './issues';
import overviewRouter from './overview';

const router = express.Router();
router.use(authenticate);

/**
 * `role` is the *caller's* role in this project, not a property of the project.
 * The client needs it to decide whether to render destructive controls, and
 * recomputing it per render from a separate members call is the kind of thing
 * that goes stale and shows a delete button to someone who cannot delete.
 */
const formatProject = (p: ProjectRow, role: ProjectRole, stats?: ProjectStats) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    // Safe to return: the ingest key is public by design (spec D4). It is
    // write-only and rate limited; the thing it must never become is a *read*
    // credential, which is why every route in this file is JWT-gated instead.
    ingestKey: p.ingestKey,
    allowedOrigins: asStringArray(p.allowedOrigins),
    captureLevels: asStringArray(p.captureLevels),
    retentionDays: p.retentionDays,
    alertOnRegression: p.alertOnRegression,
    webhookUrl: p.webhookUrl,
    ownerId: p.ownerId,
    role,
    archivedAt: p.archivedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    ...(stats ? { stats } : {}),
});

interface ProjectStats {
    unresolvedIssues: number;
    lastEventAt: string | null;
}

// Issue routes live under the project that scopes them, so `:slug` membership is
// resolved by the same helper for both. Mounted before `/:slug` so the more
// specific path wins.
router.use('/:slug/issues', issuesRouter);

// Overview surfaces: `/rollup` (cross-project) and `/:slug/overview`. Mounted at
// the router root because `/rollup` is a sibling of `/:slug`, not a child — and
// **before** the `/:slug` handlers, or `rollup` is swallowed as a project slug.
// `project.schema.ts` already reserves the word so no project can shadow it.
router.use('/', overviewRouter);

// ── GET / ────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response): Promise<void> => {
    // Parsed inline rather than via `validateQuery`: Express 5 exposes `req.query`
    // as a getter with no setter, so middleware that reassigns it throws.
    const parsed = listProjectsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        res.status(400).json({
            error: 'Invalid query parameters',
            details: parsed.error.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
        });
        return;
    }

    try {
        const memberships = await prisma.projectMember.findMany({
            where: {
                userId: req.user!.id,
                project: parsed.data.includeArchived ? {} : { archivedAt: null },
            },
            select: { role: true, project: { select: projectSelect } },
            orderBy: { project: { createdAt: 'desc' } },
        });

        const projectIds = memberships.map((m) => m.project.id);

        // Two grouped queries rather than a per-project count — the project list is
        // the first screen after sign-in, and N+1 there is felt immediately.
        const [unresolved, lastEvents] = await Promise.all([
            projectIds.length
                ? prisma.issue.groupBy({
                      by: ['projectId'],
                      where: { projectId: { in: projectIds }, status: 'unresolved' },
                      _count: { _all: true },
                  })
                : [],
            projectIds.length
                ? prisma.event.groupBy({
                      by: ['projectId'],
                      where: { projectId: { in: projectIds } },
                      _max: { createdAt: true },
                  })
                : [],
        ]);

        const unresolvedBy = new Map(unresolved.map((r) => [r.projectId, r._count._all]));
        const lastEventBy = new Map(lastEvents.map((r) => [r.projectId, r._max.createdAt]));

        res.json(
            memberships.map((m) =>
                formatProject(m.project, m.role, {
                    unresolvedIssues: unresolvedBy.get(m.project.id) ?? 0,
                    lastEventAt: lastEventBy.get(m.project.id)?.toISOString() ?? null,
                })
            )
        );
    } catch (err: any) {
        console.error('Error fetching projects:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch projects' });
    }
});

// ── POST / ───────────────────────────────────────────────────
router.post('/', validate(createProjectSchema), async (req: Request, res: Response): Promise<void> => {
    const { name, slug, captureLevels, allowedOrigins, retentionDays } = req.body;

    try {
        // An explicit slug must be free outright; a derived one gets suffixed. Two
        // people creating "Dashboard" should both succeed, but someone who *asked*
        // for `dashboard` should be told it is taken rather than silently handed
        // `dashboard-2` and a snippet pointing somewhere they did not expect.
        let finalSlug: string;
        if (slug) {
            const clash = await prisma.project.findUnique({ where: { slug }, select: { id: true } });
            if (clash) { res.status(409).json({ error: 'That slug is already in use' }); return; }
            finalSlug = slug;
        } else {
            finalSlug = await generateUniqueSlug(name);
        }

        const project = await prisma.project.create({
            data: {
                name,
                slug: finalSlug,
                ingestKey: await generateUniqueIngestKey(),
                ownerId: req.user!.id,
                captureLevels: captureLevels ?? [...DEFAULT_CAPTURE_LEVELS],
                ...(allowedOrigins !== undefined && { allowedOrigins }),
                ...(retentionDays !== undefined && { retentionDays }),
                // The owner is also a member row. Keeping ownership in exactly one
                // place means authorization is a single membership lookup rather
                // than "member OR owner" scattered across every handler.
                members: { create: { userId: req.user!.id, role: 'owner' } },
            },
            select: projectSelect,
        });

        res.status(201).json(formatProject(project, 'owner', { unresolvedIssues: 0, lastEventAt: null }));
    } catch (err: any) {
        if (err.code === 'P2002') { res.status(409).json({ error: 'That slug is already in use' }); return; }
        console.error('Error creating project:', err);
        res.status(500).json({ error: err.message || 'Failed to create project' });
    }
});

// ── GET /:slug ───────────────────────────────────────────────
router.get('/:slug', async (req: Request, res: Response): Promise<void> => {
    try {
        const found = await resolveMembership(req.params.slug, req.user!.id);
        if (!found) { res.status(404).json({ error: 'Project not found' }); return; }

        const [unresolvedIssues, lastEvent] = await Promise.all([
            prisma.issue.count({ where: { projectId: found.project.id, status: 'unresolved' } }),
            prisma.event.findFirst({
                where: { projectId: found.project.id },
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true },
            }),
        ]);

        res.json(
            formatProject(found.project, found.role, {
                unresolvedIssues,
                lastEventAt: lastEvent?.createdAt.toISOString() ?? null,
            })
        );
    } catch (err: any) {
        console.error('Error fetching project:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch project' });
    }
});

// ── PATCH /:slug ─────────────────────────────────────────────
router.patch('/:slug', validate(updateProjectSchema), async (req: Request, res: Response): Promise<void> => {
    const { name, captureLevels, allowedOrigins, retentionDays, alertOnRegression, webhookUrl } = req.body;

    try {
        const found = await resolveMembership(req.params.slug, req.user!.id);
        if (!found) { res.status(404).json({ error: 'Project not found' }); return; }
        if (!canAdminister(found.role)) {
            res.status(403).json({ error: 'Only a project owner or admin can change settings' });
            return;
        }

        // Resolve the webhook target before storing it, so an unreachable-or-private
        // URL is rejected at save time with a message, rather than silently failing
        // on every future alert where nobody is watching for it.
        if (webhookUrl) {
            const safe = await isSafeWebhookTarget(webhookUrl);
            if (!safe.ok) {
                res.status(400).json({ error: safe.reason ?? 'Webhook URL is not allowed' });
                return;
            }
        }

        const project = await prisma.project.update({
            where: { id: found.project.id },
            data: {
                ...(name !== undefined && { name }),
                ...(captureLevels !== undefined && { captureLevels }),
                ...(allowedOrigins !== undefined && { allowedOrigins }),
                ...(retentionDays !== undefined && { retentionDays }),
                ...(alertOnRegression !== undefined && { alertOnRegression }),
                // Empty string is the documented "clear it" signal — see the schema.
                ...(webhookUrl !== undefined && { webhookUrl: webhookUrl === '' ? null : webhookUrl }),
            },
            select: projectSelect,
        });

        res.json(formatProject(project, found.role));
    } catch (err: any) {
        if (err.code === 'P2025') { res.status(404).json({ error: 'Project not found' }); return; }
        console.error('Error updating project:', err);
        res.status(500).json({ error: err.message || 'Failed to update project' });
    }
});

// ── POST /:slug/rotate-key ───────────────────────────────────
router.post('/:slug/rotate-key', async (req: Request, res: Response): Promise<void> => {
    try {
        const found = await resolveMembership(req.params.slug, req.user!.id);
        if (!found) { res.status(404).json({ error: 'Project not found' }); return; }
        if (!canAdminister(found.role)) {
            res.status(403).json({ error: 'Only a project owner or admin can rotate the ingest key' });
            return;
        }

        const project = await prisma.project.update({
            where: { id: found.project.id },
            data: { ingestKey: await generateUniqueIngestKey() },
            select: projectSelect,
        });

        // There is no grace period, and that is the point: rotation exists to cut
        // off a key that is being abused. The cost is that every embedded snippet
        // stops reporting until it is updated, so the UI must say so plainly.
        res.json({
            rotated: true,
            previousKeyRevoked: true,
            project: formatProject(project, found.role),
        });
    } catch (err: any) {
        if (err.code === 'P2025') { res.status(404).json({ error: 'Project not found' }); return; }
        console.error('Error rotating ingest key:', err);
        res.status(500).json({ error: err.message || 'Failed to rotate ingest key' });
    }
});

// ── DELETE /:slug — soft archive ─────────────────────────────
router.delete('/:slug', async (req: Request, res: Response): Promise<void> => {
    try {
        const found = await resolveMembership(req.params.slug, req.user!.id);
        if (!found) { res.status(404).json({ error: 'Project not found' }); return; }
        // Archiving hides a workspace and stops its ingest; unlike a settings
        // change, that is the owner's call alone.
        if (found.role !== 'owner') {
            res.status(403).json({ error: 'Only the project owner can archive a project' });
            return;
        }

        const project = await prisma.project.update({
            where: { id: found.project.id },
            data: { archivedAt: new Date() },
            select: projectSelect,
        });

        res.json({ archived: true, project: formatProject(project, found.role) });
    } catch (err: any) {
        if (err.code === 'P2025') { res.status(404).json({ error: 'Project not found' }); return; }
        console.error('Error archiving project:', err);
        res.status(500).json({ error: err.message || 'Failed to archive project' });
    }
});

// ── POST /:slug/restore ──────────────────────────────────────
router.post('/:slug/restore', async (req: Request, res: Response): Promise<void> => {
    try {
        const found = await resolveMembership(req.params.slug, req.user!.id);
        if (!found) { res.status(404).json({ error: 'Project not found' }); return; }
        if (found.role !== 'owner') {
            res.status(403).json({ error: 'Only the project owner can restore a project' });
            return;
        }

        const project = await prisma.project.update({
            where: { id: found.project.id },
            data: { archivedAt: null },
            select: projectSelect,
        });

        res.json(formatProject(project, found.role));
    } catch (err: any) {
        if (err.code === 'P2025') { res.status(404).json({ error: 'Project not found' }); return; }
        console.error('Error restoring project:', err);
        res.status(500).json({ error: err.message || 'Failed to restore project' });
    }
});

export default router;
