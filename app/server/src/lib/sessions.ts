import { randomUUID } from 'node:crypto';
import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import prisma from './prisma';
import { SECRET_KEY, REFRESH_SECRET_KEY } from './jwtSecrets';

/**
 * Session issuance — the one place tokens are minted.
 *
 * ## Why this module exists
 *
 * `sessionTimeout` sat in `user_settings` for months doing nothing. The obvious
 * way to make it real — sign the access token with it as `expiresIn` — enforces
 * nothing a user can observe: since Sprint 3 the client refreshes on demand, so a
 * 5-minute token and a 60-minute token feel identical. The token just gets
 * re-issued a bit more often.
 *
 * So the timeout bounds **both** tokens (spec D1). `RefreshToken.expiresAt` is a
 * sliding idle window re-set on every rotation: stay active and the session lives;
 * go idle past the window and the row is expired, `/refresh` answers 401, and the
 * client's `SessionExpiredError` path signs you out. That is the promise the label
 * on the control actually makes.
 *
 * Two things follow from that, and both are handled here rather than at the call
 * sites, because getting either wrong is silent:
 *
 * 1. **The absolute cap** (D2). With a sliding window and nothing else, a session
 *    refreshed just inside its window never ends — and neither does a stolen
 *    refresh token. `absoluteExpiresAt` is stamped once and carried forward
 *    through every rotation. Note this is a *fix*, not a new restriction: the old
 *    code reset `expiresAt` to `now + 7d` on every rotation, so the nominal 7-day
 *    session was in practice immortal.
 * 2. **Ordering** (D4). The refresh row must be created *before* the access token
 *    is signed, because the access token carries that row's id as `sid`.
 */

const MIN_TIMEOUT_MIN = 5;
const MAX_TIMEOUT_MIN = 480;
const DEFAULT_TIMEOUT_MIN = 480;

/**
 * The hard end of a session regardless of activity.
 *
 * 7 days on purpose: that is what `JWT_REFRESH_EXPIRY` has always claimed, and
 * this makes the claim true rather than inventing a longer window. Both the DB row
 * and the refresh JWT are bounded by it, so neither can outlive the other.
 */
const ABSOLUTE_MAX_DAYS = Number(process.env.SESSION_ABSOLUTE_MAX_DAYS) || 7;

const MS_PER_MIN = 60_000;
const MS_PER_DAY = 86_400_000;

export interface SessionUser {
    id: number;
    email: string;
    role: string | null;
}

export interface IssuedSession {
    accessToken: string;
    refreshToken: string;
    /** The `RefreshToken` row id — also the access token's `sid` claim. */
    sessionId: number;
    expiresAt: Date;
    absoluteExpiresAt: Date;
}

/**
 * The user's idle timeout, in minutes, clamped into range.
 *
 * Clamped rather than trusted: the Zod schema bounds what the API accepts, but a
 * value written straight to Postgres (a migration, a console, a seed script)
 * would otherwise reach `jwt.sign` — and `expiresIn: 0` mints a token that is
 * expired on arrival, which reads as "login is broken", not "bad setting".
 */
export async function resolveSessionTimeoutMinutes(userId: number): Promise<number> {
    const settings = await prisma.userSettings.findUnique({
        where: { userId },
        select: { sessionTimeout: true },
    });
    const raw = settings?.sessionTimeout ?? DEFAULT_TIMEOUT_MIN;
    if (!Number.isFinite(raw)) return DEFAULT_TIMEOUT_MIN;
    return Math.min(MAX_TIMEOUT_MIN, Math.max(MIN_TIMEOUT_MIN, Math.round(raw)));
}

/** Session context for the active-sessions list. Recognition only — never authorization. */
function sessionContext(req: Request): { userAgent: string | null; ipAddress: string | null } {
    const forwarded = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
    return {
        userAgent: req.headers['user-agent']?.slice(0, 512) ?? null,
        ipAddress: forwarded || req.ip || null,
    };
}

/**
 * Mint a session: refresh JWT → refresh row → access JWT carrying that row's id.
 *
 * `carryAbsoluteExpiry` is the rotation case. Passing the existing value forward
 * is what makes the cap absolute; omitting it on a rotation would hand the session
 * a fresh 7 days every time, which is the bug this replaced.
 */
export async function issueSession(
    req: Request,
    user: SessionUser,
    carryAbsoluteExpiry?: Date | null,
): Promise<IssuedSession> {
    const minutes = await resolveSessionTimeoutMinutes(user.id);
    const now = Date.now();

    const absoluteExpiresAt = carryAbsoluteExpiry ?? new Date(now + ABSOLUTE_MAX_DAYS * MS_PER_DAY);

    // The refresh JWT expires exactly when the session does. Signing it for a flat
    // 7d while the row is capped elsewhere would leave two disagreeing clocks, and
    // the one that wins would depend on which check ran first.
    const refreshTtlSec = Math.max(1, Math.floor((absoluteExpiresAt.getTime() - now) / 1000));

    // `jti` is the only per-session entropy in this payload, and without it the
    // token is a pure function of (user, second): `{id, email}` plus `iat`/`exp`
    // at one-second resolution. Two logins by the same account inside the same
    // second therefore produced the SAME string and collided on
    // `RefreshToken.token`'s unique index — a 500 on the second login. That was
    // true of the previous implementation too; it surfaced here because the
    // verification harness opens two sessions back to back.
    //
    // Sessions are also identified by row id now (`sid`, D4), so two rows holding
    // an identical credential would be an ambiguity in the security model, not
    // just a failed insert.
    const refreshToken = jwt.sign(
        { id: user.id, email: user.email, jti: randomUUID() },
        REFRESH_SECRET_KEY,
        { expiresIn: refreshTtlSec } as jwt.SignOptions,
    );

    // Idle window. Never longer than the absolute cap — otherwise a long timeout on
    // a nearly-expired session would report a expiry the cap will not honour.
    const expiresAt = new Date(Math.min(now + minutes * MS_PER_MIN, absoluteExpiresAt.getTime()));

    const row = await prisma.refreshToken.create({
        data: {
            userId: user.id,
            token: refreshToken,
            expiresAt,
            absoluteExpiresAt,
            ...sessionContext(req),
        },
        select: { id: true },
    });

    const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role || 'user', sid: row.id },
        SECRET_KEY,
        { expiresIn: minutes * 60 } as jwt.SignOptions,
    );

    return { accessToken, refreshToken, sessionId: row.id, expiresAt, absoluteExpiresAt };
}

/**
 * End every session for a user.
 *
 * Used when an admin demotes or deactivates someone (spec D6). `authorize()` makes
 * admin-gated routes correct on the next request by itself; this is what stops the
 * *ordinary* access their existing token still carries from outliving it.
 */
export async function revokeAllSessions(userId: number): Promise<number> {
    const { count } = await prisma.refreshToken.deleteMany({ where: { userId } });
    return count;
}
