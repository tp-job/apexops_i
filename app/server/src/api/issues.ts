import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { validate } from '../middleware/validate';
import { isProjectMember, resolveMembership } from '../lib/projectAccess';
import { emitToRoom } from '../lib/realtime';
import { buildIssueFrame, projectRoom } from '../lib/issueStream';
import { symbolicate } from '../lib/sourcemaps';
import {
    listIssuesQuerySchema,
    updateIssueSchema,
    promoteIssueSchema,
    issueDetailQuerySchema,
} from '../schemas/issue.schema';
import { eventVolumeByIssue } from '../lib/eventAnalytics';
import { browserFromUserAgent, osFromUserAgent, tally } from '../lib/userAgent';
import { Prisma, TicketPriority } from '@prisma/client';

/**
 * Issue routes, mounted at `/api/projects/:slug/issues` by `api/projects.ts`.
 *
 * `mergeParams` is what makes `:slug` visible here — without it every handler
 * would resolve membership against `undefined` and answer 404 for everything.
 * `authenticate` is applied by the parent router.
 */
const router = express.Router({ mergeParams: true });

const issueSelect = {
    id: true,
    projectId: true,
    fingerprint: true,
    level: true,
    title: true,
    culprit: true,
    status: true,
    count: true,
    firstSeen: true,
    lastSeen: true,
    ticketId: true,
    reopenCount: true,
    lastReopenedAt: true,
} as const;

type IssueRow = Prisma.IssueGetPayload<{ select: typeof issueSelect }>;

/**
 * Push a status or promote change into the project's live issue list.
 *
 * Ingest is not the only thing that changes a row: a resolve in one window has
 * to reach the other windows, or two people work the same bug. Same rules as the
 * ingest push (R-D4) — after the write, detached, and it can never fail the
 * request that triggered it.
 *
 * `isNew: false` always. A human acting on an issue is never a first sighting,
 * whatever the timestamps happen to say.
 */
const pushIssueChange = (projectId: number, issue: IssueRow): void => {
    try {
        emitToRoom(projectRoom(projectId), 'issue-activity', buildIssueFrame({
            projectId,
            fingerprint: issue.fingerprint,
            level: issue.level,
            issue,
            isNew: false,
        }));
    } catch (err) {
        console.error('issue activity emit failed:', err);
    }
};

const formatIssue = (i: IssueRow) => ({
    id: i.id,
    projectId: i.projectId,
    fingerprint: i.fingerprint,
    level: i.level,
    title: i.title,
    culprit: i.culprit,
    status: i.status,
    count: i.count,
    firstSeen: i.firstSeen.toISOString(),
    lastSeen: i.lastSeen.toISOString(),
    // Present means the issue has already been promoted; the UI shows a link to
    // the ticket instead of offering to create a second one.
    ticketId: i.ticketId,
    /** > 0 means this was fixed and came back — the list badges it as a regression. */
    reopenCount: i.reopenCount,
    lastReopenedAt: i.lastReopenedAt?.toISOString() ?? null,
});

const parseId = (raw: string | string[] | undefined): number | null => {
    if (typeof raw !== 'string') return null;
    const id = Number.parseInt(raw, 10);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
};

/**
 * `Event.id` is `BigInt`, which `JSON.stringify` throws on rather than
 * serializing. Every event leaving this file goes through here.
 */
const formatEvent = (e: {
    id: bigint;
    level: string;
    message: string;
    stack: string | null;
    url: string | null;
    userAgent: string | null;
    release: string | null;
    context: Prisma.JsonValue;
    createdAt: Date;
}) => ({
    id: e.id.toString(),
    level: e.level,
    message: e.message,
    stack: e.stack,
    url: e.url,
    userAgent: e.userAgent,
    release: e.release,
    context: e.context,
    createdAt: e.createdAt.toISOString(),
});

/** An `error` deserves a higher default than a `warn` that happens to be noisy. */
const priorityForLevel = (level: string): TicketPriority =>
    level === 'error' ? 'high' : level === 'warn' ? 'medium' : 'low';

/**
 * The occurrence histogram lives in `lib/eventAnalytics.ts` so the project
 * overview reuses the identical bucketing — including the `::timestamp` binding,
 * which is the part a reimplementation would silently get wrong.
 *
 * **It counts stored events, not occurrences.** The SDK collapses repeats inside
 * its dedupe window into one row carrying a `count`, added to the issue total but
 * not stored per event — so the bars will not sum to `issue.count`. The UI says so
 * in words, or the chart looks like it contradicts the headline number.
 */

// ── GET / ────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response): Promise<void> => {
    // Parsed inline rather than via middleware: Express 5 exposes `req.query` as
    // a getter with no setter, so anything that reassigns it throws.
    const parsed = listIssuesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        res.status(400).json({
            error: 'Invalid query parameters',
            details: parsed.error.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
        });
        return;
    }

    try {
        const found = await resolveMembership(req.params.slug, req.user!.id);
        if (!found) { res.status(404).json({ error: 'Project not found' }); return; }

        const { level, status, q, since, sort, direction, limit, offset } = parsed.data;

        const where: Prisma.IssueWhereInput = {
            projectId: found.project.id,
            ...(level && { level }),
            ...(status && { status }),
            ...(since && { lastSeen: { gte: new Date(Date.now() - since * 3600_000) } }),
            ...(q && {
                OR: [
                    { title: { contains: q, mode: 'insensitive' } },
                    { culprit: { contains: q, mode: 'insensitive' } },
                ],
            }),
        };

        // `total` drives the pager, which must reflect the *filtered* count — a
        // pager built on the unfiltered total offers pages that render empty.
        const [rows, total] = await Promise.all([
            prisma.issue.findMany({
                where,
                select: issueSelect,
                orderBy: { [sort]: direction },
                take: limit,
                skip: offset,
            }),
            prisma.issue.count({ where }),
        ]);

        res.json({ issues: rows.map(formatIssue), total, limit, offset });
    } catch (err: any) {
        console.error('Error fetching issues:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch issues' });
    }
});

// ── GET /stats ───────────────────────────────────────────────
// Registered before `/:id` so the literal path is not swallowed by the param route.
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
    try {
        const found = await resolveMembership(req.params.slug, req.user!.id);
        if (!found) { res.status(404).json({ error: 'Project not found' }); return; }

        const projectId = found.project.id;
        const dayAgo = new Date(Date.now() - 24 * 3600_000);

        const [byStatus, eventsLast24h, lastEvent, totalIssues] = await Promise.all([
            prisma.issue.groupBy({
                by: ['status'],
                where: { projectId },
                _count: { _all: true },
            }),
            prisma.event.count({ where: { projectId, createdAt: { gte: dayAgo } } }),
            prisma.event.findFirst({
                where: { projectId },
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true },
            }),
            prisma.issue.count({ where: { projectId } }),
        ]);

        const countFor = (s: string) => byStatus.find((r) => r.status === s)?._count._all ?? 0;

        res.json({
            totalIssues,
            unresolved: countFor('unresolved'),
            resolved: countFor('resolved'),
            ignored: countFor('ignored'),
            eventsLast24h,
            // `null` means *never received an event*, which the UI must render
            // differently from "quiet lately" — see the spec's three states.
            lastEventAt: lastEvent?.createdAt.toISOString() ?? null,
        });
    } catch (err: any) {
        console.error('Error fetching issue stats:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch issue stats' });
    }
});

// ── GET /:id ─────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
    const issueId = parseId(req.params.id);
    if (issueId === null) { res.status(404).json({ error: 'Issue not found' }); return; }

    const parsed = issueDetailQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid range' });
        return;
    }
    const { range } = parsed.data;

    try {
        const found = await resolveMembership(req.params.slug, req.user!.id);
        if (!found) { res.status(404).json({ error: 'Project not found' }); return; }

        const issue = await prisma.issue.findFirst({
            // Scoped by projectId as well as id: without it, a member of project A
            // could read any issue in project B by guessing an integer.
            where: { id: issueId, projectId: found.project.id },
            select: issueSelect,
        });
        if (!issue) { res.status(404).json({ error: 'Issue not found' }); return; }

        const [events, timeline, breakdownRows] = await Promise.all([
            prisma.event.findMany({
                where: { issueId: issue.id },
                orderBy: { createdAt: 'desc' },
                take: 10,
                select: {
                    id: true, level: true, message: true, stack: true, url: true,
                    userAgent: true, release: true, context: true, createdAt: true,
                },
            }),
            eventVolumeByIssue(issue.id, range),
            // Capped: the breakdown is a proportion, and 500 samples answers
            // "is this everyone or just Safari?" as well as 500,000 would.
            prisma.event.findMany({
                where: { issueId: issue.id },
                orderBy: { createdAt: 'desc' },
                take: 500,
                select: { userAgent: true, release: true },
            }),
        ]);

        const storedInRange = timeline.reduce((sum, b) => sum + b.count, 0);

        // Symbolication runs at READ time, on the latest event only.
        //
        // Read time rather than ingest time because maps routinely arrive after
        // the first errors of a deploy — resolving here means a map uploaded
        // later retroactively fixes events already stored, and ingest stays off
        // this path entirely. Latest event only because ten symbolicated stacks
        // per request is work nobody scrolls to, and the panel that renders it
        // shows one.
        //
        // It cannot fail the request: `symbolicate` never throws and always
        // returns at least the raw frames. This endpoint is what people open
        // during an incident.
        const latest = events.length ? events[0] : null;
        const symbolication = latest
            ? await symbolicate(found.project.id, latest.release, latest.stack)
            : null;

        res.json({
            ...formatIssue(issue),
            latestEvent: events.length ? formatEvent(events[0]) : null,
            /**
             * Resolved frames for `latestEvent`, plus why it did or did not work.
             * Null when there is no stored event. `frames` always covers the
             * whole stack, resolved or not, in original order — the client
             * renders from this and keeps `latestEvent.stack` for the
             * `view minified` toggle and for Copy.
             */
            symbolication,
            recentEvents: events.map(formatEvent),
            range,
            timeline,
            /** Events actually stored in the window — never equals `count`; see eventAnalytics. */
            storedInRange,
            /** Total event rows retained for this issue, which retention prunes. */
            storedTotal: await prisma.event.count({ where: { issueId: issue.id } }),
            breakdown: {
                browsers: tally(breakdownRows.map((e) => browserFromUserAgent(e.userAgent))),
                os: tally(breakdownRows.map((e) => osFromUserAgent(e.userAgent))),
                releases: tally(
                    breakdownRows.map((e) => e.release ?? 'unknown')
                ),
                sampledFrom: breakdownRows.length,
            },
        });
    } catch (err: any) {
        console.error('Error fetching issue:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch issue' });
    }
});

// ── PATCH /:id ───────────────────────────────────────────────
router.patch('/:id', validate(updateIssueSchema), async (req: Request, res: Response): Promise<void> => {
    const issueId = parseId(req.params.id);
    if (issueId === null) { res.status(404).json({ error: 'Issue not found' }); return; }

    try {
        const found = await resolveMembership(req.params.slug, req.user!.id);
        if (!found) { res.status(404).json({ error: 'Project not found' }); return; }

        const existing = await prisma.issue.findFirst({
            where: { id: issueId, projectId: found.project.id },
            select: { id: true, status: true },
        });
        if (!existing) { res.status(404).json({ error: 'Issue not found' }); return; }

        const next = req.body.status as typeof existing.status;

        // A no-op PATCH must not write an audit row, or "resolved 4 times" becomes
        // a count of how often someone clicked a button that was already pressed.
        if (next === existing.status) {
            const unchanged = await prisma.issue.findUniqueOrThrow({
                where: { id: existing.id },
                select: issueSelect,
            });
            res.json(formatIssue(unchanged));
            return;
        }

        const [issue] = await prisma.$transaction([
            prisma.issue.update({
                where: { id: existing.id },
                data: { status: next },
                select: issueSelect,
            }),
            prisma.issueStatusChange.create({
                data: {
                    issueId: existing.id,
                    projectId: found.project.id,
                    fromStatus: existing.status,
                    toStatus: next,
                    reason: 'manual',
                    actorId: req.user!.id,
                },
            }),
        ]);

        res.json(formatIssue(issue));
        pushIssueChange(found.project.id, issue);
    } catch (err: any) {
        console.error('Error updating issue:', err);
        res.status(500).json({ error: err.message || 'Failed to update issue' });
    }
});

// ── POST /:id/ticket — promote to tracked work ───────────────
router.post('/:id/ticket', validate(promoteIssueSchema), async (req: Request, res: Response): Promise<void> => {
    const issueId = parseId(req.params.id);
    if (issueId === null) { res.status(404).json({ error: 'Issue not found' }); return; }

    try {
        const found = await resolveMembership(req.params.slug, req.user!.id);
        if (!found) { res.status(404).json({ error: 'Project not found' }); return; }

        const issue = await prisma.issue.findFirst({
            where: { id: issueId, projectId: found.project.id },
            select: issueSelect,
        });
        if (!issue) { res.status(404).json({ error: 'Issue not found' }); return; }

        // `Issue.ticketId` is unique, so a second promote would throw P2002 on the
        // link. Answering 409 with the existing id lets the UI navigate to the
        // ticket that already exists instead of showing a failure.
        if (issue.ticketId !== null) {
            res.status(409).json({
                error: 'This issue has already been promoted to a ticket',
                ticketId: issue.ticketId,
            });
            return;
        }

        // Same rule as the ticket routes (T-D6): an assignee must be a member of
        // the project the ticket is being created in. Promote is a third door
        // into the same `Ticket.assigneeId` column and had the same bare
        // "is a known user" check, so it had the same enumeration oracle.
        if (req.body.assigneeId && !(await isProjectMember(found.project.id, req.body.assigneeId))) {
            res.status(400).json({ error: 'Assignee is not a member of this project' });
            return;
        }

        const latest = await prisma.event.findFirst({
            where: { issueId: issue.id },
            orderBy: { createdAt: 'desc' },
            select: { stack: true, url: true, release: true },
        });

        const description = [
            `Promoted from issue #${issue.id} (${issue.level}).`,
            `First seen ${issue.firstSeen.toISOString()}, ${issue.count} occurrence${issue.count === 1 ? '' : 's'}.`,
            issue.culprit ? `Culprit: ${issue.culprit}` : null,
            latest?.url ? `URL: ${latest.url}` : null,
            latest?.release ? `Release: ${latest.release}` : null,
            latest?.stack ? `\nLatest stack:\n${latest.stack}` : null,
        ]
            .filter(Boolean)
            .join('\n');

        // One transaction: a ticket that exists without the back-link would let
        // the same issue be promoted again, producing duplicate tickets for one bug.
        const ticket = await prisma.$transaction(async (tx) => {
            const created = await tx.ticket.create({
                data: {
                    projectId: issue.projectId,
                    title: req.body.title ?? issue.title,
                    description,
                    status: 'open',
                    priority: (req.body.priority as TicketPriority) ?? priorityForLevel(issue.level),
                    assigneeId: req.body.assigneeId ?? null,
                    reporterId: req.user!.id,
                    tags: ['from-issue', issue.level],
                },
                select: { id: true, title: true, status: true, priority: true, projectId: true },
            });

            await tx.issue.update({ where: { id: issue.id }, data: { ticketId: created.id } });
            return created;
        });

        res.status(201).json({
            ticket: {
                ...ticket,
                // Matches the display id the Bug Tracker board renders.
                displayId: `TICK-${String(ticket.id).padStart(3, '0')}`,
            },
            issue: { ...formatIssue(issue), ticketId: ticket.id },
        });

        // The row that was just linked, not the pre-promote read: another window
        // must stop offering "Create ticket" for work that now has one.
        pushIssueChange(found.project.id, { ...issue, ticketId: ticket.id });
    } catch (err: any) {
        if (err.code === 'P2002') {
            res.status(409).json({ error: 'This issue has already been promoted to a ticket' });
            return;
        }
        console.error('Error promoting issue:', err);
        res.status(500).json({ error: err.message || 'Failed to promote issue' });
    }
});

export default router;
