import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/chat/users?q=...
// Return list of users that can be added to chat (excluding current user)
router.get('/users', authenticate, async (req, res, next) => {
    try {
        const currentUserId = req.user!.id;
        const q = (req.query.q as string | undefined)?.trim();

        const where: any = { id: { not: currentUserId } };
        if (q) {
            where.OR = [
                { firstName: { contains: q, mode: 'insensitive' } },
                { lastName: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
            ];
        }

        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });

        res.json({ users });
    } catch (err) {
        next(err);
    }
});

export default router;

