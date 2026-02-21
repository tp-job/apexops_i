import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authLoginLimiter, authRegisterLimiter } from '../middleware/rateLimit';
import {
    registerSchema, loginSchema, refreshTokenSchema,
    updateProfileSchema, updateSettingsSchema, changePasswordSchema,
} from '../schemas/auth.schema';

const router = express.Router();

const isProduction = process.env.NODE_ENV === 'production';
const SECRET_KEY = process.env.JWT_SECRET || (isProduction ? 'REPLACE_IN_PRODUCTION' : 'mySecretKey');
const REFRESH_SECRET_KEY = process.env.JWT_REFRESH_SECRET || (isProduction ? 'REPLACE_IN_PRODUCTION' : 'myRefreshSecretKey');
const ACCESS_TOKEN_EXPIRY = process.env.JWT_EXPIRY || '1h';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

if (isProduction && (!SECRET_KEY || SECRET_KEY.length < 32)) {
    console.warn('Security: JWT_SECRET should be at least 32 characters in production.');
}

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
        await prisma.refreshToken.create({ data: { userId: user.id, token: refreshToken, expiresAt } }).catch(() => {});

        res.status(201).json({
            message: 'User registered successfully',
            user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role },
            accessToken, refreshToken, token: accessToken,
        });
    } catch (err: any) {
        console.error('Registration error:', err);
        res.status(500).json({ error: err.message || 'Failed to register user' });
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
        await prisma.refreshToken.create({ data: { userId: user.id, token: refreshToken, expiresAt } });

        res.json({
            message: 'Login successful',
            user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role },
            accessToken, refreshToken, token: accessToken,
        });
    } catch (err: any) {
        console.error('Login error:', err);
        res.status(500).json({ error: err.message || 'Failed to login' });
    }
});

// ── POST /refresh ────────────────────────────────────────────
// Refresh token rotation: old token is invalidated and a new one is issued (single-use)
router.post('/refresh', validate(refreshTokenSchema), async (req: Request, res: Response): Promise<void> => {
    try {
        const { refreshToken: oldToken } = req.body;
        const decoded = jwt.verify(oldToken, REFRESH_SECRET_KEY) as { id: number; email: string };

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
        await prisma.refreshToken.create({ data: { userId: user.id, token: newRefreshToken, expiresAt } });

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

export default router;
