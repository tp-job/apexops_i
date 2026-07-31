import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { resolveMembership } from '../lib/projectAccess';
import {
    eventVolumeByProject,
    issueStatusCounts,
    regressionCount,
    releaseMarkers,
    windowFor,
    type Range,
} from '../lib/eventAnalytics';

/**
 * Overview surfaces, mounted under `/api/projects` by `api/projects.ts`.
 *
 * Two shapes, deliberately different questions:
 *  - `GET /rollup`          — across every project I belong to: *which one is on fire?*
 *  - `GET /:slug/overview`  — inside one project: *is it getting better or worse,
 *                             and did that start with a deploy?*
 *
 * Neither restates the issue list. The issue list answers **state**; these answer
 * **trend**. If a number here can be read off the issue list unchanged, it does
 * not belong here.
 */
const router = express.Router({ mergeParams: true });

const RANGES: Range[] = ['24h', '7d', '30d'];
const parseRange = (raw: unknown): Range =>
    typeof raw === 'string' && (RANGES as string[]).includes(raw) ? (raw as Range) : '24h';

// ── GET /rollup ──────────────────────────────────────────────
/**
 * Cross-project ranking for the global dashboard.
 *
 * Every aggregate is one grouped query over the caller's project ids rather than
 * a per-project loop: this is the first screen after sign-in, and N+1 there is
 * felt immediately once someone has more than a couple of projects.
 */
router.get('/rollup', async (req: Request, res: Response): Promise<void> => {
    try {
        const range = parseRange(req.query.range);
        const w = windowFor(range);

        const memberships = await prisma.projectMember.findMany({
            where: { userId: req.user!.id, project: { archivedAt: null } },
            select: {
                role: true,
                project: { select: { id: true, name: true, slug: true } },
            },
        });

        const projectIds = memberships.map((m) => m.project.id);
        if (!projectIds.length) {
            res.json({ range, projects: [], totals: { projects: 0, unresolved: 0, events: 0, regressions: 0 } });
            return;
        }

        const [unresolvedRows, eventRows, lastEventRows, regressionRows, newIssueRows] =
            await Promise.all([
                prisma.issue.groupBy({
                    by: ['projectId'],
                    where: { projectId: { in: projectIds }, status: 'unresolved' },
                    _count: { _all: true },
                }),
                prisma.event.groupBy({
                    by: ['projectId'],
                    where: { projectId: { in: projectIds }, createdAt: { gte: w.since } },
                    _count: { _all: true },
                }),
                prisma.event.groupBy({
                    by: ['projectId'],
                    where: { projectId: { in: projectIds } },
                    _max: { createdAt: true },
                }),
                prisma.issueStatusChange.groupBy({
                    by: ['projectId'],
                    where: {
                        projectId: { in: projectIds },
                        reason: 'regression',
                        createdAt: { gte: w.since },
                    },
                    _count: { _all: true },
                }),
                prisma.issue.groupBy({
                    by: ['projectId'],
                    where: { projectId: { in: projectIds }, firstSeen: { gte: w.since } },
                    _count: { _all: true },
                }),
            ]);

        const byId = <T extends { projectId: number }>(rows: T[]) =>
            new Map(rows.map((r) => [r.projectId, r]));
        const unresolvedBy = byId(unresolvedRows);
        const eventsBy = byId(eventRows);
        const lastBy = byId(lastEventRows);
        const regressionsBy = byId(regressionRows);
        const newBy = byId(newIssueRows);

        const projects = memberships.map((m) => {
            const id = m.project.id;
            return {
                id,
                name: m.project.name,
                slug: m.project.slug,
                role: m.role,
                unresolved: unresolvedBy.get(id)?._count._all ?? 0,
                events: eventsBy.get(id)?._count._all ?? 0,
                regressions: regressionsBy.get(id)?._count._all ?? 0,
                newIssues: newBy.get(id)?._count._all ?? 0,
                lastEventAt: lastBy.get(id)?._max.createdAt?.toISOString() ?? null,
            };
        });

        /**
         * Ranking is the whole point of this screen, so the order is opinionated
         * rather than alphabetical:
         *   regressions first — something you already fixed is broken again
         *   then unresolved   — open work
         *   then volume       — noise
         * A project with one regression outranks a quiet project with fifty stale
         * unresolved issues, which is the judgement a human on-call would make.
         */
        projects.sort(
            (a, b) =>
                b.regressions - a.regressions ||
                b.unresolved - a.unresolved ||
                b.events - a.events ||
                a.name.localeCompare(b.name)
        );

        res.json({
            range,
            projects,
            totals: {
                projects: projects.length,
                unresolved: projects.reduce((s, p) => s + p.unresolved, 0),
                events: projects.reduce((s, p) => s + p.events, 0),
                regressions: projects.reduce((s, p) => s + p.regressions, 0),
                // Projects that have never received an event — the integration is
                // installed nowhere, which is a different problem from being quiet.
                awaitingFirstEvent: projects.filter((p) => p.lastEventAt === null).length,
            },
        });
    } catch (err: any) {
        console.error('Error building rollup:', err);
        res.status(500).json({ error: err.message || 'Failed to build rollup' });
    }
});

// ── GET /:slug/overview ──────────────────────────────────────
router.get('/:slug/overview', async (req: Request, res: Response): Promise<void> => {
    try {
        const found = await resolveMembership(req.params.slug, req.user!.id);
        if (!found) { res.status(404).json({ error: 'Project not found' }); return; }

        const range = parseRange(req.query.range);
        const w = windowFor(range);
        const projectId = found.project.id;

        const [volume, markers, statuses, regressions, newIssues, eventsInWindow, topIssues, lastEvent, regressedIssues, openTickets] =
            await Promise.all([
                eventVolumeByProject(projectId, range),
                releaseMarkers(projectId, range),
                issueStatusCounts({ projectId }),
                regressionCount(projectId, range),
                prisma.issue.count({ where: { projectId, firstSeen: { gte: w.since } } }),
                prisma.event.count({ where: { projectId, createdAt: { gte: w.since } } }),
                prisma.issue.findMany({
                    where: { projectId, status: 'unresolved' },
                    orderBy: [{ count: 'desc' }],
                    take: 5,
                    select: {
                        id: true, title: true, culprit: true, level: true, count: true,
                        lastSeen: true, reopenCount: true, ticketId: true,
                    },
                }),
                prisma.event.findFirst({
                    where: { projectId },
                    orderBy: { createdAt: 'desc' },
                    select: { createdAt: true },
                }),
                // The regressions themselves, not just the count — a number you
                // cannot click is a number you cannot act on.
                prisma.issue.findMany({
                    where: { projectId, reopenCount: { gt: 0 }, lastReopenedAt: { gte: w.since } },
                    orderBy: { lastReopenedAt: 'desc' },
                    take: 5,
                    select: {
                        id: true, title: true, culprit: true, level: true, count: true,
                        reopenCount: true, lastReopenedAt: true, status: true,
                    },
                }),
                prisma.ticket.count({ where: { projectId, archivedAt: null, status: { in: ['open', 'in_progress'] } } }),
            ]);

        res.json({
            project: { id: projectId, name: found.project.name, slug: found.project.slug, role: found.role },
            range,
            windowStart: w.since.toISOString(),
            bucket: w.unit,
            kpis: {
                unresolved: statuses.unresolved,
                totalIssues: statuses.total,
                newIssues,
                regressions,
                eventsInWindow,
                openTickets,
                lastEventAt: lastEvent?.createdAt.toISOString() ?? null,
            },
            volume,
            // Markers outside the visible window are dropped here rather than in the
            // client, so the chart never has to reason about off-axis positions.
            releases: markers.filter((m) => new Date(m.firstSeenAt).getTime() >= w.since.getTime()),
            /** Every known release, newest first — context even when none deployed in-window. */
            allReleases: markers,
            topIssues: topIssues.map((i) => ({
                ...i,
                lastSeen: i.lastSeen.toISOString(),
            })),
            regressedIssues: regressedIssues.map((i) => ({
                ...i,
                lastReopenedAt: i.lastReopenedAt?.toISOString() ?? null,
            })),
        });
    } catch (err: any) {
        console.error('Error building project overview:', err);
        res.status(500).json({ error: err.message || 'Failed to build overview' });
    }
});

export default router;
