import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
    createTicketSchema,
    updateTicketSchema,
    createTicketCommentSchema,
    listTicketsQuerySchema,
} from '../schemas/ticket.schema';
import { Prisma, TicketStatus, TicketPriority } from '@prisma/client';

const router = express.Router();
router.use(authenticate);

// ── Wire <-> enum mapping ────────────────────────────────────
// The DB enum member is `in_progress`; the client's discriminated union has always
// been `in-progress`. Mapping here keeps the wire contract stable so no frontend
// type had to change when status/priority stopped being free-text strings.
const toWireStatus = (s: TicketStatus): string => (s === 'in_progress' ? 'in-progress' : s);
const toDbStatus = (s: string): TicketStatus => (s === 'in-progress' ? 'in_progress' : s) as TicketStatus;

const displayId = (id: number) => `TICK-${String(id).padStart(3, '0')}`;

/**
 * Parses `TICK-003` or `3` into a row id. Returns null for anything else so the
 * caller can answer 404 instead of handing `NaN` to Prisma and 500-ing.
 */
const parseTicketId = (raw: string | string[] | undefined): number | null => {
    if (typeof raw !== 'string') return null;
    const id = Number.parseInt(raw.replace(/^TICK-/i, ''), 10);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
};

const fullName = (u: { firstName: string; lastName: string } | null | undefined) =>
    u ? `${u.firstName} ${u.lastName}`.trim() : undefined;

const userSelect = { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } as const;

const ticketInclude = {
    assigneeUser: { select: userSelect },
    reporterUser: { select: userSelect },
    _count: { select: { comments: true } },
} as const;

type TicketWithRelations = Prisma.TicketGetPayload<{ include: typeof ticketInclude }>;

const formatTicket = (t: TicketWithRelations) => ({
    id: displayId(t.id),
    title: t.title,
    description: t.description ?? '',
    status: toWireStatus(t.status),
    priority: t.priority as TicketPriority,
    // FK is the source of truth (spec D2); the legacy string is only a fallback
    // for rows written before the migration.
    assignee: fullName(t.assigneeUser) ?? t.assignee ?? undefined,
    assigneeId: t.assigneeId ?? null,
    assigneeUser: t.assigneeUser ?? null,
    reporter: fullName(t.reporterUser) ?? t.reporter ?? 'System',
    reporterId: t.reporterId ?? null,
    tags: Array.isArray(t.tags) ? t.tags : [],
    relatedLogs: Array.isArray(t.relatedLogs) ? t.relatedLogs : [],
    commentCount: t._count.comments,
    archivedAt: t.archivedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
});

const commentInclude = { author: { select: userSelect } } as const;
type CommentWithAuthor = Prisma.TicketCommentGetPayload<{ include: typeof commentInclude }>;

const formatComment = (c: CommentWithAuthor) => ({
    id: c.id,
    ticketId: displayId(c.ticketId),
    kind: c.kind,
    body: c.body,
    meta: c.meta ?? {},
    author: c.author ? { ...c.author, name: fullName(c.author) } : null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
});

// ── GET / ────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response): Promise<void> => {
    // Parsed inline rather than via `validateQuery`: Express 5 exposes `req.query`
    // as a getter with no setter, so middleware that reassigns it throws.
    const parsed = listTicketsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        res.status(400).json({
            error: 'Invalid query parameters',
            details: parsed.error.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
        });
        return;
    }

    const { status, priority, assigneeId, assignee, includeArchived, limit, offset } = parsed.data;

    try {
        const where: Prisma.TicketWhereInput = {};
        if (status) where.status = toDbStatus(status);
        if (priority) where.priority = priority as TicketPriority;
        if (assigneeId !== undefined) where.assigneeId = assigneeId;
        else if (assignee) where.assignee = assignee;
        if (!includeArchived) where.archivedAt = null;

        const [tickets, total] = await Promise.all([
            prisma.ticket.findMany({
                where,
                include: ticketInclude,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.ticket.count({ where }),
        ]);

        res.setHeader('X-Total-Count', String(total));
        res.json(tickets.map(formatTicket));
    } catch (err: any) {
        console.error('Error fetching tickets:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch tickets' });
    }
});

// ── GET /stats ───────────────────────────────────────────────
// Declared before `/:id` so `stats` is never parsed as a ticket id.
router.get('/stats', async (_req: Request, res: Response): Promise<void> => {
    try {
        const live: Prisma.TicketWhereInput = { archivedAt: null };

        const [byStatus, byPriority, total] = await Promise.all([
            prisma.ticket.groupBy({ by: ['status'], where: live, _count: { _all: true } }),
            prisma.ticket.groupBy({ by: ['priority'], where: live, _count: { _all: true } }),
            prisma.ticket.count({ where: live }),
        ]);

        const countOf = <T extends { _count: { _all: number } }>(rows: T[], match: (r: T) => boolean) =>
            rows.find(match)?._count._all ?? 0;

        res.json({
            total,
            byStatus: {
                open: countOf(byStatus, (r) => r.status === 'open'),
                inProgress: countOf(byStatus, (r) => r.status === 'in_progress'),
                resolved: countOf(byStatus, (r) => r.status === 'resolved'),
                closed: countOf(byStatus, (r) => r.status === 'closed'),
            },
            byPriority: {
                critical: countOf(byPriority, (r) => r.priority === 'critical'),
                high: countOf(byPriority, (r) => r.priority === 'high'),
                medium: countOf(byPriority, (r) => r.priority === 'medium'),
                low: countOf(byPriority, (r) => r.priority === 'low'),
            },
        });
    } catch (err: any) {
        console.error('Error fetching ticket stats:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch stats' });
    }
});

// ── GET /:id ─────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseTicketId(req.params.id);
    if (ticketId === null) { res.status(404).json({ error: 'Ticket not found' }); return; }

    try {
        const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, include: ticketInclude });
        if (!ticket) { res.status(404).json({ error: 'Ticket not found' }); return; }
        res.json(formatTicket(ticket));
    } catch (err: any) {
        console.error('Error fetching ticket:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch ticket' });
    }
});

// ── POST / ───────────────────────────────────────────────────
router.post('/', validate(createTicketSchema), async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, description, status, priority, assigneeId, tags, relatedLogs } = req.body;

        if (assigneeId) {
            const assignee = await prisma.user.count({ where: { id: assigneeId } });
            if (!assignee) { res.status(400).json({ error: 'Assignee is not a known user' }); return; }
        }

        const ticket = await prisma.ticket.create({
            data: {
                title,
                description,
                status: toDbStatus(status),
                priority: priority as TicketPriority,
                assigneeId: assigneeId ?? null,
                reporterId: req.user?.id ?? null,
                tags,
                relatedLogs,
            },
            include: ticketInclude,
        });

        res.status(201).json(formatTicket(ticket));
    } catch (err: any) {
        console.error('Error creating ticket:', err);
        res.status(500).json({ error: err.message || 'Failed to create ticket' });
    }
});

// ── PUT /:id ─────────────────────────────────────────────────
router.put('/:id', validate(updateTicketSchema), async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseTicketId(req.params.id);
    if (ticketId === null) { res.status(404).json({ error: 'Ticket not found' }); return; }

    const { title, description, status, priority, assigneeId, tags, relatedLogs, expectedUpdatedAt } = req.body;

    try {
        if (assigneeId) {
            const assignee = await prisma.user.count({ where: { id: assigneeId } });
            if (!assignee) { res.status(400).json({ error: 'Assignee is not a known user' }); return; }
        }

        const updated = await prisma.$transaction(async (tx) => {
            const current = await tx.ticket.findUnique({ where: { id: ticketId }, include: ticketInclude });
            if (!current) return { conflict: false as const, ticket: null };

            // Optimistic concurrency: reject if the row moved since the client read it.
            if (expectedUpdatedAt && current.updatedAt.toISOString() !== new Date(expectedUpdatedAt).toISOString()) {
                return { conflict: true as const, ticket: formatTicket(current) };
            }

            const nextStatus = status !== undefined ? toDbStatus(status) : undefined;
            const nextPriority = priority !== undefined ? (priority as TicketPriority) : undefined;

            const ticket = await tx.ticket.update({
                where: { id: ticketId },
                data: {
                    ...(title !== undefined && { title }),
                    ...(description !== undefined && { description }),
                    ...(nextStatus !== undefined && { status: nextStatus }),
                    ...(nextPriority !== undefined && { priority: nextPriority }),
                    ...(assigneeId !== undefined && { assigneeId: assigneeId ?? null }),
                    ...(tags !== undefined && { tags }),
                    ...(relatedLogs !== undefined && { relatedLogs }),
                },
                include: ticketInclude,
            });

            // Field changes become `activity` entries so the detail thread reads as
            // one chronological history rather than a comment list with no context.
            const activity: { field: string; from: unknown; to: unknown }[] = [];
            if (nextStatus !== undefined && nextStatus !== current.status) {
                activity.push({ field: 'status', from: toWireStatus(current.status), to: toWireStatus(nextStatus) });
            }
            if (nextPriority !== undefined && nextPriority !== current.priority) {
                activity.push({ field: 'priority', from: current.priority, to: nextPriority });
            }
            if (assigneeId !== undefined && (assigneeId ?? null) !== current.assigneeId) {
                activity.push({
                    field: 'assignee',
                    from: fullName(current.assigneeUser) ?? null,
                    to: fullName(ticket.assigneeUser) ?? null,
                });
            }

            if (activity.length) {
                await tx.ticketComment.createMany({
                    data: activity.map((a) => ({
                        ticketId,
                        authorId: req.user?.id ?? null,
                        kind: 'activity' as const,
                        body: `changed ${a.field} from ${a.from ?? 'unassigned'} to ${a.to ?? 'unassigned'}`,
                        meta: a as Prisma.InputJsonValue,
                    })),
                });
            }

            return { conflict: false as const, ticket: formatTicket(ticket) };
        });

        if (!updated.ticket) { res.status(404).json({ error: 'Ticket not found' }); return; }
        if (updated.conflict) {
            res.status(409).json({ error: 'Ticket was modified by someone else', current: updated.ticket });
            return;
        }

        res.json(updated.ticket);
    } catch (err: any) {
        if (err.code === 'P2025') { res.status(404).json({ error: 'Ticket not found' }); return; }
        console.error('Error updating ticket:', err);
        res.status(500).json({ error: err.message || 'Failed to update ticket' });
    }
});

// ── DELETE /:id — soft archive (spec D4) ─────────────────────
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseTicketId(req.params.id);
    if (ticketId === null) { res.status(404).json({ error: 'Ticket not found' }); return; }

    try {
        const ticket = await prisma.ticket.update({
            where: { id: ticketId },
            data: { archivedAt: new Date() },
            include: ticketInclude,
        });
        res.json({ archived: true, ticket: formatTicket(ticket) });
    } catch (err: any) {
        if (err.code === 'P2025') { res.status(404).json({ error: 'Ticket not found' }); return; }
        console.error('Error archiving ticket:', err);
        res.status(500).json({ error: err.message || 'Failed to archive ticket' });
    }
});

// ── POST /:id/restore ────────────────────────────────────────
router.post('/:id/restore', async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseTicketId(req.params.id);
    if (ticketId === null) { res.status(404).json({ error: 'Ticket not found' }); return; }

    try {
        const ticket = await prisma.ticket.update({
            where: { id: ticketId },
            data: { archivedAt: null },
            include: ticketInclude,
        });
        res.json(formatTicket(ticket));
    } catch (err: any) {
        if (err.code === 'P2025') { res.status(404).json({ error: 'Ticket not found' }); return; }
        console.error('Error restoring ticket:', err);
        res.status(500).json({ error: err.message || 'Failed to restore ticket' });
    }
});

// ── GET /:id/comments ────────────────────────────────────────
router.get('/:id/comments', async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseTicketId(req.params.id);
    if (ticketId === null) { res.status(404).json({ error: 'Ticket not found' }); return; }

    try {
        const comments = await prisma.ticketComment.findMany({
            where: { ticketId },
            include: commentInclude,
            orderBy: { createdAt: 'asc' },
        });
        res.json(comments.map(formatComment));
    } catch (err: any) {
        console.error('Error fetching ticket comments:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch comments' });
    }
});

// ── POST /:id/comments ───────────────────────────────────────
router.post(
    '/:id/comments',
    validate(createTicketCommentSchema),
    async (req: Request, res: Response): Promise<void> => {
        const ticketId = parseTicketId(req.params.id);
        if (ticketId === null) { res.status(404).json({ error: 'Ticket not found' }); return; }

        try {
            const exists = await prisma.ticket.count({ where: { id: ticketId } });
            if (!exists) { res.status(404).json({ error: 'Ticket not found' }); return; }

            const comment = await prisma.ticketComment.create({
                data: {
                    ticketId,
                    authorId: req.user?.id ?? null,
                    kind: 'comment',
                    body: req.body.body,
                },
                include: commentInclude,
            });

            res.status(201).json(formatComment(comment));
        } catch (err: any) {
            console.error('Error creating ticket comment:', err);
            res.status(500).json({ error: err.message || 'Failed to create comment' });
        }
    },
);

export default router;
