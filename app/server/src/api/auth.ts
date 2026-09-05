import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { REFRESH_SECRET_KEY, JWT_ALGORITHM } from '../lib/jwtSecrets';
import { issueSession, resolveSessionTimeoutMinutes } from '../lib/sessions';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authLoginLimiter, authRegisterLimiter } from '../middleware/rateLimit';
import {
    registerSchema, loginSchema, refreshTokenSchema,
    updateProfileSchema, updateSettingsSchema, changePasswordSchema,
} from '../schemas/auth.schema';

const router = express.Router();

// Secrets come from lib/jwtSecrets.ts, which refuses to boot in production when
// they are missing. They were previously derived here AND in two other modules
// with fallbacks that disagreed — see that file for what that would have cost.
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

// Token minting, the sliding idle window and the absolute cap all live in
// lib/sessions.ts (spec D1/D2/D4). Three routes here issue sessions and they must
// do it identically; the previous inline version had the 7-day expiry written out
// in three places, which is how they drift.

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

        // Created before the session is issued, not after: `issueSession` reads
        // `sessionTimeout` from this row to size the token it mints.
        await prisma.userSettings.create({ data: { userId: user.id } }).catch(() => {});

        const { accessToken, refreshToken } = await issueSession(req, user);

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

        const { accessToken, refreshToken } = await issueSession(req, user);

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

        const now = new Date();

        // `expiresAt` is the sliding IDLE window (spec D1). A row past it means the
        // session went quiet for longer than the user's timeout, which is exactly
        // what that setting promises — so this 401 is the feature, not a fault.
        const stored = await prisma.refreshToken.findFirst({
            where: { token: oldToken, expiresAt: { gt: now } },
        });
        if (!stored) { res.status(401).json({ error: 'Invalid or expired refresh token' }); return; }

        // The absolute cap (D2), checked separately so the reason stays legible.
        // Null means the row predates this column: treated as uncapped and stamped
        // on this rotation, rather than logging every existing session out on deploy.
        if (stored.absoluteExpiresAt && stored.absoluteExpiresAt <= now) {
            await prisma.refreshToken.deleteMany({ where: { id: stored.id } });
            res.status(401).json({ error: 'Session expired' });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true },
        });
        if (!user) { res.status(401).json({ error: 'User not found' }); return; }

        // A deactivated account must not be able to extend its own session (D6).
        // Their tokens are deleted at deactivation time; this is the backstop for a
        // token that was already in flight.
        if (user.isActive === false) {
            await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
            res.status(403).json({ error: 'Account is deactivated' });
            return;
        }

        await prisma.refreshToken.deleteMany({ where: { token: oldToken } });

        // The absolute expiry is CARRIED FORWARD, not recomputed. Recomputing it is
        // what made sessions immortal before: every rotation handed out a fresh
        // seven days, so a token refreshed weekly never expired at all.
        const { accessToken, refreshToken: newRefreshToken } = await issueSession(
            req,
            user,
            stored.absoluteExpiresAt,
        );

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
/**
 * End the calling session.
 *
 * **Revokes by `sid`, not by the request body.** It used to delete only the row
 * matching a `refreshToken` in the body — and answer `200 Logout successful`
 * when the body was absent or wrong, having revoked nothing. A client that
 * forgot the field got a success message and a live session.
 *
 * The caller's own session id is already on `req.user`, verified against the
 * table by `authenticate`, so it is the authoritative answer to "which session
 * is this?". A body-supplied token stays supported as an extra — an old client
 * sending one still has it honoured — but it is no longer what the endpoint
 * depends on.
 */
router.post('/logout', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const sid = req.user?.sid;
        const { refreshToken } = req.body ?? {};

        const { count } = await prisma.refreshToken.deleteMany({
            where: {
                OR: [
                    ...(typeof sid === 'number' ? [{ id: sid, userId: req.user!.id }] : []),
                    // Scoped to the caller: a token in a body is attacker-controlled,
                    // and deleting by value alone would revoke another user's session.
                    ...(typeof refreshToken === 'string' && refreshToken
                        ? [{ token: refreshToken, userId: req.user!.id }]
                        : []),
                ],
            },
        });

        res.json({ message: 'Logout successful', revoked: count });
    } catch (err: any) {
        console.error('Logout error:', err);
        res.status(500).json({ error: 'Failed to sign out. Please try again.' });
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

        /**
         * **Only settings that are enforced** (spec S-D1, criterion 10).
         *
         * The other ten columns still exist in `user_settings` — dropping them is a
         * migration that buys nothing — but they are read by nothing, so returning
         * them invites a client to render a switch for them. `updateSettingsSchema`
         * stopped accepting them on 2026-07-31; this is the read half of the same
         * change, which was missed at the time.
         *
         * `sessionTimeout` earns its place here as of Sprint 5: it now sizes both
         * the access token and the refresh token's idle window (D1).
         */
        const settings = user.settings ? {
            sessionTimeout: user.settings.sessionTimeout,
        } : null;

        res.json({
            message: 'Welcome!',
            user: {
                id: user.id, firstName: user.firstName, lastName: user.lastName,
                email: user.email, phone: user.phone, company: user.company,
                position: user.position, location: user.location, timezone: user.timezone,
                bio: user.bio, avatarUrl: user.avatarUrl, role: user.role,
                gender: user.gender, birthDate: user.birthDate, language: user.language,
                theme: user.theme,
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
        const { firstName, lastName, email, phone, company, position, location, timezone, bio, gender, birthDate, language, theme } = req.body;

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
                ...(theme !== undefined && { theme }),
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
                theme: user.theme, updatedAt: user.updatedAt,
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

        // Mirrors GET /profile: enforced settings only (criterion 10).
        res.json({
            message: 'Settings updated successfully',
            settings: { sessionTimeout: settings.sessionTimeout },
            // The new value sizes the NEXT token, not the one in the caller's hand.
            // Returned so the UI can say so precisely instead of implying it took
            // effect immediately.
            appliesFrom: 'next-token',
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

        // The caller's own session, from the access token's `sid` claim (spec D4).
        //
        // This previously read `req.body.refreshToken` — on a GET, which carries no
        // body. So `current` was ALWAYS false: the "this device" badge never
        // rendered and the per-row Sign out would cheerfully revoke the session you
        // were using, which is the precise failure settings.md's risk table named.
        // Sending the refresh token up to fix it would have been worse; it is a
        // bearer credential and does not belong in a request the client can log.
        const currentSid = req.user?.sid ?? null;

        res.json({
            sessions: rows.map((r) => ({
                id: r.id,
                // The token itself is NEVER returned — it is a bearer credential.
                // A short fingerprint is enough for the client to mark "this one".
                fingerprint: r.token.slice(-8),
                current: currentSid !== null && r.id === currentSid,
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

    // Refusing to revoke the session making the request (spec D4). The UI hides the
    // control, but hiding a button is not a rule — and the failure it prevents is
    // "every user signs themselves out the first time they open this page".
    // "Sign out everywhere" remains the deliberate exception.
    if (req.user?.sid === id) {
        res.status(409).json({
            error: 'That is this device',
            detail: 'Use "Sign out everywhere" to end this session too.',
        });
        return;
    }

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
