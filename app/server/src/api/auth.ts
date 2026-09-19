import express, { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { REFRESH_SECRET_KEY, JWT_ALGORITHM } from '../lib/jwtSecrets';
import { issueSession, resolveSessionTimeoutMinutes, revokeSessions } from '../lib/sessions';
// The admit decision is pure and tested separately — same split as `lib/sessionAdmit.ts`.
import { decideLoginAdmit } from '../lib/loginAdmit';
import { decideRefreshOutcome } from '../lib/refreshOutcome';
import { revokeFamilyAndAlert } from '../lib/refreshReuse';
import { isThrottled, recordFailure, clearFailures } from '../lib/loginThrottle';
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

/**
 * A real bcrypt hash of a fixed, never-used password. Compared against when the
 * email in `/login` matches no user, so the request pays the same bcrypt cost
 * whether the account exists or not — otherwise the response time itself tells
 * an attacker "no such user" apart from "wrong password" even though the
 * message reads the same (A07 #8, phase 2 · A3).
 *
 * A constant literal, not `bcrypt.hashSync` at import time: hashing at cost 12
 * on every server start is real latency for zero benefit, and this value is
 * never checked against a real password — its only job is to give
 * `bcrypt.compareSync` the same amount of work to do.
 */
const DUMMY_HASH = '$2b$12$97816K62GDMF79AmdpybE.TgRupfNpy2.4vHEwx5rIYcZofm2J1A2';

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

        // `registerSchema`'s own `.refine` already requires `firstName` or
        // `name` — this can only be unreachable, kept as a type guard for
        // `first` below rather than a real branch. Found while auditing this
        // file for A3 (phase 2): it was the only other post-validation
        // rejection `/register` had, which is why full response-parity with
        // the duplicate-email case was not available to reach for here.
        if (!first) {
            res.status(400).json({ error: 'Could not complete registration with these details' });
            return;
        }

        /**
         * Generic on purpose (A07 #8, phase 2 · A3) — **reduced, not eliminated**.
         * The old message named the exact reason ("Email already registered"),
         * which an automated scanner could key on directly to enumerate every
         * address in the user table at the register rate limit. This still
         * answers `400` rather than `201`, so the status code alone remains a
         * weaker oracle than the named one was; closing that fully means
         * deferring account creation behind email verification, which changes
         * the client's instant-login-on-register flow and is out of scope here.
         * The per-IP rate limit (`authRegisterLimiter`) is the remaining defence
         * against this residual signal.
         */
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            res.status(400).json({ error: 'Could not complete registration with these details' });
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

        /**
         * Per-ACCOUNT throttle, on top of `authLoginLimiter`'s per-IP one
         * (phase 3, A6). Checked before any database or bcrypt work — the
         * whole point is to stop paying that cost once an account is under a
         * distributed attack, not merely to record that it happened.
         *
         * The response is BYTE-IDENTICAL to the per-IP limiter's own 429 —
         * same status, same body — so a caller cannot tell which counter
         * fired. See `lib/loginThrottle.ts` for why this is a backstop with a
         * deliberately high threshold, not a primary control.
         */
        if (isThrottled(email)) {
            res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, firstName: true, lastName: true, email: true, password: true, role: true, isActive: true },
        });

        /**
         * One answer for "no such user", "wrong password" AND "deactivated"
         * (A07 #8, phase 2 · A3).
         *
         * The deactivation check used to run BEFORE the password check and
         * answer a distinct 403 — so an unauthenticated caller could learn an
         * account exists and is deactivated without ever knowing its password.
         * `bcrypt.compareSync` still runs even when `user` is missing, timed
         * against a fixed dummy hash, so response time does not distinguish
         * "no such user" from "wrong password" either — a real user's hash
         * varies in cost only by salt, not by existing at all.
         *
         * The deactivation reason is not lost, only moved: it still reaches an
         * authenticated caller, at GET /profile and everywhere `authenticate`
         * itself now refuses a deactivated account's existing session (phase 1).
         * This is about what a request with NO valid credential is told.
         */
        const passwordHash = user?.password ?? DUMMY_HASH;
        const isMatch = bcrypt.compareSync(password, passwordHash);
        const admit = decideLoginAdmit({ userFound: !!user, passwordMatches: isMatch, isActive: user?.isActive ?? null });
        if (!admit.ok || !user) {
            // Recorded against the SUBMITTED email, not a resolved user id — an
            // attacker probing nonexistent addresses still fills a bucket, which
            // is harmless (memory-bounded by the sweeper) and keeps the throttle
            // from needing to special-case "no such account" as a different kind
            // of failure.
            recordFailure(email);
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }

        // A legitimate sign-in clears this account's failure count — the
        // throttle exists to catch an attacker who never succeeds, not to
        // penalize a real user's own mistyped attempts once they get it right.
        clearFailures(email);

        const { accessToken, refreshToken } = await issueSession(req, user);

        res.json({
            message: 'Login successful',
            user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role },
            accessToken, refreshToken, token: accessToken,
        });
    } catch (err: any) {
        // Generic message on purpose. `err.message` here is whatever Prisma threw —
        // when the DB is unreachable that includes absolute server file paths and the
        // failing query. The detail belongs in the server log, not the response body.
        // Every 500 in this file follows this rule as of phase 2 (A5, 2026-09-06) —
        // it started here and in /register, and was carried to the other 8 handlers
        // that still returned `err.message` on the caller's behalf.
        console.error('Login error:', err);
        res.status(500).json({ error: 'Failed to sign in. Please try again.' });
    }
});

// ── POST /refresh ────────────────────────────────────────────
/**
 * Refresh token rotation: old token is invalidated and a new one is issued
 * (single-use), with reuse detection as of phase 3 (A4, 2026-09-06).
 *
 * **The lookup no longer filters by `expiresAt` in the query itself.** It used
 * to — `findFirst({ where: { token, expiresAt: { gt: now } } })` — which made
 * an ordinary idle timeout indistinguishable from "no such row" for free. That
 * same indistinguishability is now produced deliberately, in
 * `decideRefreshOutcome`, because the lookup has a second job: a row CAN
 * exist, unexpired, and still be the wrong thing to rotate — a tombstone left
 * by an earlier rotation, meaning this exact token is being presented again.
 */
router.post('/refresh', validate(refreshTokenSchema), async (req: Request, res: Response): Promise<void> => {
    try {
        const { refreshToken: oldToken } = req.body;
        const decoded = jwt.verify(oldToken, REFRESH_SECRET_KEY, { algorithms: [JWT_ALGORITHM] }) as { id: number; email: string };

        const now = new Date();
        const stored = await prisma.refreshToken.findFirst({ where: { token: oldToken } });
        const outcome = decideRefreshOutcome({ row: stored, now });

        if (outcome.kind === 'not-found') {
            res.status(401).json({ error: 'Invalid or expired refresh token' });
            return;
        }

        if (outcome.kind === 'reuse') {
            // Deliberately the SAME response as `not-found` — the caller must
            // not be able to tell "this token never existed" apart from "this
            // token was already used once", or an attacker learns their replay
            // was caught and can adapt. `stored` is guaranteed non-null here:
            // `decideRefreshOutcome` only answers `reuse` when a row was found.
            // Every tombstone carries a family: the rotation below stamps one
            // onto a pre-phase-3 row before tombstoning it.
            if (stored!.family) await revokeFamilyAndAlert(stored!.family);
            res.status(401).json({ error: 'Invalid or expired refresh token' });
            return;
        }

        // Another tab rotated this same token a moment ago. The 401 is what the
        // client's race handling expects; it adopts the winner's token from
        // shared storage. Nothing is revoked. See `REUSE_GRACE_MS`.
        if (outcome.kind === 'concurrent-rotation' || outcome.kind === 'idle-expired') {
            res.status(401).json({ error: 'Invalid or expired refresh token' });
            return;
        }

        if (outcome.kind === 'absolute-expired') {
            await prisma.refreshToken.deleteMany({ where: { id: stored!.id } });
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

        // TOMBSTONED, not deleted (phase 3, A4). A hard delete here is exactly
        // what made a reused token indistinguishable from one that never
        // existed. `family` carries forward into the new row below just like
        // `absoluteExpiresAt` already does. A row predating phase 3 has no
        // family, so one is minted and stamped onto the tombstone too.
        // Otherwise a later replay of that token would have no lineage to
        // revoke, and the session it was rotated into would survive.
        const family = stored!.family ?? randomUUID();

        // A conditional claim, not a plain update. Two requests holding the same
        // token can both read `rotatedAt: null` above. With an unconditional
        // update both would rotate and fork the family into two live sessions,
        // which is the exact outcome reuse detection exists to prevent. Only
        // the request whose update matches the still-live row may continue.
        const claimed = await prisma.refreshToken.updateMany({
            where: { id: stored!.id, rotatedAt: null },
            data: { rotatedAt: now, family },
        });
        if (claimed.count === 0) {
            // Lost the race to a request that arrived at the same instant. That
            // is the same situation `concurrent-rotation` handles, and it gets
            // the same answer.
            res.status(401).json({ error: 'Invalid or expired refresh token' });
            return;
        }

        // The absolute expiry is CARRIED FORWARD, not recomputed. Recomputing it is
        // what made sessions immortal before: every rotation handed out a fresh
        // seven days, so a token refreshed weekly never expired at all.
        const { accessToken, refreshToken: newRefreshToken } = await issueSession(
            req,
            user,
            stored!.absoluteExpiresAt,
            family,
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
        res.status(500).json({ error: 'Failed to refresh token' });
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

        // Scoped to the caller inside `revokeSessions`: a token in a body is
        // attacker-controlled, and deleting by value alone would revoke another
        // user's session. The family's rotation tombstones go with it.
        const count = await revokeSessions(req.user!.id, {
            ids: typeof sid === 'number' ? [sid] : [],
            tokens: typeof refreshToken === 'string' && refreshToken ? [refreshToken] : [],
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
        res.status(500).json({ error: 'Failed to get profile' });
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
        res.status(500).json({ error: 'Failed to update profile' });
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
        res.status(500).json({ error: 'Failed to update settings' });
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
        res.status(500).json({ error: 'Failed to change password' });
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
            // `rotatedAt: null` excludes tombstones (phase 3, A4). Without it a
            // rotated row's OWN `expiresAt` — stamped while it was still live —
            // keeps it inside this window after rotation, so it would appear as
            // a phantom, apparently-revokable device that no longer protects
            // anything. Found while building the tombstone design, not guessed
            // at when this phase was scoped.
            where: { userId: req.user!.id, expiresAt: { gt: new Date() }, rotatedAt: null },
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
        res.status(500).json({ error: 'Failed to list sessions' });
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
        // Scoped to the caller's own rows: revoking someone else's session must be
        // impossible, and must not even reveal that the id exists.
        const count = await revokeSessions(req.user!.id, { ids: [id] });
        if (!count) { res.status(404).json({ error: 'Session not found' }); return; }
        res.json({ revoked: true });
    } catch (err: any) {
        console.error('Revoke session error:', err);
        res.status(500).json({ error: 'Failed to revoke session' });
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
        res.status(500).json({ error: 'Failed to revoke sessions' });
    }
});

export default router;
