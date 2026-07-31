import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { SECRET_KEY, REFRESH_SECRET_KEY, JWT_ALGORITHM } from '../lib/jwtSecrets';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authLoginLimiter, authRegisterLimiter } from '../middleware/rateLimit';
import {
    registerSchema, loginSchema, refreshTokenSchema,
    updateProfileSchema, updateSettingsSchema, changePasswordSchema,
} from '../schemas/auth.schema';

const router = express.Router();

/**
 * Context stored alongside each refresh token so the active-sessions list is
 * usable (spec S-D3). A list that says "session #4" tells you nothing; one that
 * says "Chrome on Windows, 2 hours ago" is a security control someone can act on.
 *
 * Both fields are self-reported by the client and trivially spoofed — they are
 * for recognition ("that is my laptop"), never for authorization.
 */
function sessionContext(req: Request): { userAgent: string | null; ipAddress: string | null } {
    const forwarded = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
    return {
        userAgent: req.headers['user-agent']?.slice(0, 512) ?? null,
        ipAddress: forwarded || req.ip || null,
    };
}

// Secrets come from lib/jwtSecrets.ts, which refuses to boot in production when
// they are missing. They were previously derived here AND in two other modules
// with fallbacks that disagreed — see that file for what that would have cost.
const ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRY || '1h';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);



interface TokenUser {
    id: number;
    email: string;
    role: string | null;
}

const generateAccessToken = (user: TokenUser): string =>
    jwt.sign({ id: user.id, email: user.email, role: user.role || 'user' }, SECRET_KEY, { expiresIn: ACCESS_TOKEN_EXPIRY } as jwt.SignOptions);

const generateRefreshToken = (user: TokenUser): string =>
    jwt.sign({ id: user.id, email: user.email }, REFRESH_SECRET_KEY, { expiresIn: REFRESH_TOKEN_EXPIRY } as jwt.SignOptions);

// ── POST /register ───────────────────────────────────────────
router.post('/register', authRegisterLimiter, validate(registerSchema), async (req: Request, res: Response): Promise<void> => {
    try {
        const { firstName, lastName, name, email, password } = req.body;

        let first = firstName;
        let last = lastName;
        if (!first && name) {
            first = name.split(' ')[0] || name;
            last = name.split(' ').slice(1).join(' ') || '';
        }

        if (!first) {
            res.status(400).json({ error: 'Name is required' });
            return;
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            res.status(400).json({ error: 'Email already registered' });
            return;
        }

        const hashedPassword = bcrypt.hashSync(password, BCRYPT_ROUNDS);

        const user = await prisma.user.create({
            data: { firstName: first, lastName: last || '', email, password: hashedPassword },
            select: { id: true, firstName: true, lastName: true, email: true, role: true, createdAt: true },
        });

        // Create default settings
        await prisma.userSettings.create({ data: { userId: user.id } }).catch(() => {});

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await prisma.refreshToken.create({
            data: { userId: user.id, token: refreshToken, expiresAt, ...sessionContext(req) },
        }).catch(() => {});

        res.status(201).json({
            message: 'User registered successfully',
            user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role },
            accessToken, refreshToken, token: accessToken,
        });
    } catch (err: any) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Failed to register user. Please try again.' });
    }
});

// ── POST /login ──────────────────────────────────────────────
router.post('/login', authLoginLimiter, validate(loginSchema), async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, firstName: true, lastName: true, email: true, password: true, role: true, isActive: true },
        });

        if (!user) { res.status(401).json({ error: 'Invalid email or password' }); return; }
        if (user.isActive === false) { res.status(403).json({ error: 'Account is deactivated' }); return; }

        const isMatch = bcrypt.compareSync(password, user.password);
        if (!isMatch) { res.status(401).json({ error: 'Invalid email or password' }); return; }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        await prisma.refreshToken.create({
            data: { userId: user.id, token: refreshToken, expiresAt, ...sessionContext(req) },
        });

        res.json({
            message: 'Login successful',
            user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role },
            accessToken, refreshToken, token: accessToken,
        });
    } catch (err: any) {
        // Generic message on purpose. `err.message` here is whatever Prisma threw —
        // when the DB is unreachable that includes absolute server file paths and the
        // failing query, handed to an unauthenticated caller. The detail belongs in
        // the server log, not the response body. Same reasoning in /register.
        console.error('Login error:', err);
        res.status(500).json({ error: 'Failed to sign in. Please try again.' });
    }
});

// ── POST /refresh ────────────────────────────────────────────
// Refresh token rotation: old token is invalidated and a new one is issued (single-use)
router.post('/refresh', validate(refreshTokenSchema), async (req: Request, res: Response): Promise<void> => {
    try {
        const { refreshToken: oldToken } = req.body;
        const decoded = jwt.verify(oldToken, REFRESH_SECRET_KEY, { algorithms: [JWT_ALGORITHM] }) as { id: number; email: string };

        const stored = await prisma.refreshToken.findFirst({
            where: { token: oldToken, expiresAt: { gt: new Date() } },
        });
        if (!stored) { res.status(401).json({ error: 'Invalid or expired refresh token' }); return; }

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, firstName: true, lastName: true, email: true, role: true },
        });
        if (!user) { res.status(401).json({ error: 'User not found' }); return; }

        await prisma.refreshToken.deleteMany({ where: { token: oldToken } });

        const accessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        // Refresh rotates the row, so the context is re-captured — otherwise a
        // long-lived session would show where it was first created, not where it is.
        await prisma.refreshToken.create({
            data: { userId: user.id, token: newRefreshToken, expiresAt, ...sessionContext(req) },
        });

        res.json({
            accessToken, token: accessToken, refreshToken: newRefreshToken,
            user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role },
        });
    } catch (err: any) {
        if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
            res.status(401).json({ error: 'Invalid or expired refresh token' }); return;
        }
        console.error('Refresh token error:', err);
        res.status(500).json({ error: err.message || 'Failed to refresh token' });
    }
});

// ── POST /logout ─────────────────────────────────────────────
router.post('/logout', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
        }
        res.json({ message: 'Logout successful' });
    } catch (err: any) {
        console.error('Logout error:', err);
        res.status(500).json({ error: err.message || 'Failed to logout' });
    }
});

// ── GET /profile ─────────────────────────────────────────────
router.get('/profile', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id },
            include: { settings: true },
        });

        if (!user) { res.status(404).json({ error: 'User not found' }); return; }

        const settings = user.settings ? {
            emailNotifications: user.settings.emailNotifications,
            pushNotifications: user.settings.pushNotifications,
            bugAlerts: user.settings.bugAlerts,
            weeklyReports: user.settings.weeklyReports,
            teamUpdates: user.settings.teamUpdates,
            twoFactorAuth: user.settings.twoFactorAuth,
            sessionTimeout: user.settings.sessionTimeout,
            loginAlerts: user.settings.loginAlerts,
            profileVisibility: user.settings.profileVisibility,
            activityStatus: user.settings.activityStatus,
            dataCollection: user.settings.dataCollection,
        } : null;

        res.json({
            message: 'Welcome!',
            user: {
                id: user.id, firstName: user.firstName, lastName: user.lastName,
                email: user.email, phone: user.phone, company: user.company,
                position: user.position, location: user.location, timezone: user.timezone,
                bio: user.bio, avatarUrl: user.avatarUrl, role: user.role,
                gender: user.gender, birthDate: user.birthDate, language: user.language,
                isActive: user.isActive, emailVerified: user.emailVerified,
                createdAt: user.createdAt, updatedAt: user.updatedAt,
            },
            settings,
        });
    } catch (err: any) {
        console.error('Get profile error:', err);
        res.status(500).json({ error: err.message || 'Failed to get profile' });
    }
});

// ── PUT /profile ─────────────────────────────────────────────
router.put('/profile', authenticate, validate(updateProfileSchema), async (req: Request, res: Response): Promise<void> => {
    try {
        const { firstName, lastName, email, phone, company, position, location, timezone, bio, gender, birthDate, language } = req.body;

        if (email) {
            const taken = await prisma.user.findFirst({ where: { email, id: { not: req.user!.id } } });
            if (taken) { res.status(400).json({ error: 'Email already in use' }); return; }
        }

        const user = await prisma.user.update({
            where: { id: req.user!.id },
            data: {
                ...(firstName !== undefined && { firstName }),
                ...(lastName !== undefined && { lastName }),
                ...(email !== undefined && { email }),
                ...(phone !== undefined && { phone }),
                ...(company !== undefined && { company }),
                ...(position !== undefined && { position }),
                ...(location !== undefined && { location }),
                ...(timezone !== undefined && { timezone }),
                ...(bio !== undefined && { bio }),
                ...(gender !== undefined && { gender }),
                ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
                ...(language !== undefined && { language }),
            },
        });

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: user.id, firstName: user.firstName, lastName: user.lastName,
                email: user.email, phone: user.phone, company: user.company,
                position: user.position, location: user.location, timezone: user.timezone,
                bio: user.bio, avatarUrl: user.avatarUrl, role: user.role,
                gender: user.gender, birthDate: user.birthDate, language: user.language,
                updatedAt: user.updatedAt,
            },
        });
    } catch (err: any) {
        console.error('Update profile error:', err);
        res.status(500).json({ error: err.message || 'Failed to update profile' });
    }
});

// ── PUT /settings ────────────────────────────────────────────
router.put('/settings', authenticate, validate(updateSettingsSchema), async (req: Request, res: Response): Promise<void> => {
    try {
        const data = req.body;

        const settings = await prisma.userSettings.upsert({
            where: { userId: req.user!.id },
            create: { userId: req.user!.id, ...data },
            update: data,
        });

        res.json({
            message: 'Settings updated successfully',
            settings: {
                emailNotifications: settings.emailNotifications,
                pushNotifications: settings.pushNotifications,
                bugAlerts: settings.bugAlerts,
                weeklyReports: settings.weeklyReports,
                teamUpdates: settings.teamUpdates,
                twoFactorAuth: settings.twoFactorAuth,
                sessionTimeout: settings.sessionTimeout,
                loginAlerts: settings.loginAlerts,
                profileVisibility: settings.profileVisibility,
                activityStatus: settings.activityStatus,
                dataCollection: settings.dataCollection,
            },
        });
    } catch (err: any) {
        console.error('Update settings error:', err);
        res.status(500).json({ error: err.message || 'Failed to update settings' });
    }
});

// ── PUT /password ────────────────────────────────────────────
router.put('/password', authenticate, validate(changePasswordSchema), async (req: Request, res: Response): Promise<void> => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { password: true } });
        if (!user) { res.status(404).json({ error: 'User not found' }); return; }

        if (!bcrypt.compareSync(currentPassword, user.password)) {
            res.status(401).json({ error: 'Current password is incorrect' }); return;
        }

        await prisma.user.update({
            where: { id: req.user!.id },
            data: { password: bcrypt.hashSync(newPassword, BCRYPT_ROUNDS) },
        });

        res.json({ message: 'Password updated successfully' });
    } catch (err: any) {
        console.error('Change password error:', err);
        res.status(500).json({ error: err.message || 'Failed to change password' });
    }
});

// ── GET /sessions ────────────────────────────────────────────
/**
 * Active sessions (spec S-D3).
 *
 * Every login already writes a `RefreshToken` row, so that table *is* the
 * session list — this is the one real security control that needed no new
 * infrastructure. Expired rows are filtered out rather than shown as "expired",
 * because a list of dead sessions is noise in a panel whose whole job is "is
 * anything here not me?".
 */
router.get('/sessions', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const rows = await prisma.refreshToken.findMany({
            where: { userId: req.user!.id, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: 'desc' },
            select: { id: true, token: true, userAgent: true, ipAddress: true, createdAt: true, expiresAt: true },
        });

        // The caller's own session is flagged so the UI can label it and refuse to
        // let them revoke the thing they are currently using by accident.
        const presented = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : null;

        res.json({
            sessions: rows.map((r) => ({
                id: r.id,
                // The token itself is NEVER returned — it is a bearer credential.
                // A short fingerprint is enough for the client to mark "this one".
                fingerprint: r.token.slice(-8),
                current: presented ? r.token === presented : false,
                userAgent: r.userAgent,
                ipAddress: r.ipAddress,
                createdAt: r.createdAt.toISOString(),
                expiresAt: r.expiresAt.toISOString(),
            })),
        });
    } catch (err: any) {
        console.error('List sessions error:', err);
        res.status(500).json({ error: err.message || 'Failed to list sessions' });
    }
});

// ── DELETE /sessions/:id ─────────────────────────────────────
router.delete('/sessions/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
    const id = Number.parseInt(String(req.params.id), 10);
    if (!Number.isSafeInteger(id) || id <= 0) { res.status(404).json({ error: 'Session not found' }); return; }

    try {
        // userId in the filter, not just the id: revoking someone else's session
        // must be impossible, and must not even reveal that the id exists.
        const { count } = await prisma.refreshToken.deleteMany({
            where: { id, userId: req.user!.id },
        });
        if (!count) { res.status(404).json({ error: 'Session not found' }); return; }
        res.json({ revoked: true });
    } catch (err: any) {
        console.error('Revoke session error:', err);
        res.status(500).json({ error: err.message || 'Failed to revoke session' });
    }
});

// ── POST /sessions/revoke-all ────────────────────────────────
/** "Sign out everywhere." Deletes every refresh token for the caller. */
router.post('/sessions/revoke-all', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const { count } = await prisma.refreshToken.deleteMany({ where: { userId: req.user!.id } });
        res.json({ revoked: count });
    } catch (err: any) {
        console.error('Revoke all sessions error:', err);
        res.status(500).json({ error: err.message || 'Failed to revoke sessions' });
    }
});

export default router;
