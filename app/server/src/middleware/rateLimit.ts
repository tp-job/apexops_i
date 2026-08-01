import rateLimit from 'express-rate-limit';

const AUTH_WINDOW_MS = parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '900000', 10); // 15 min
const AUTH_MAX_LOGIN = parseInt(process.env.RATE_LIMIT_AUTH_MAX_LOGIN || '10', 10);
const AUTH_MAX_REGISTER = parseInt(process.env.RATE_LIMIT_AUTH_MAX_REGISTER || '5', 10);

/**
 * Rate limiter for login: prevents brute-force and credential stuffing.
 * Default: 10 requests per 15 minutes per IP.
 */
export const authLoginLimiter = rateLimit({
    windowMs: AUTH_WINDOW_MS,
    max: AUTH_MAX_LOGIN,
    message: { error: 'Too many login attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Rate limiter for registration: prevents mass account creation.
 * Default: 5 requests per 15 minutes per IP.
 */
export const authRegisterLimiter = rateLimit({
    windowMs: AUTH_WINDOW_MS,
    max: AUTH_MAX_REGISTER,
    message: { error: 'Too many registration attempts. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const INVITE_WINDOW_MS = parseInt(process.env.RATE_LIMIT_INVITE_WINDOW_MS || '3600000', 10); // 1 hour
const INVITE_MAX = parseInt(process.env.RATE_LIMIT_INVITE_MAX || '20', 10);

/**
 * Invite creation, capped **per project** rather than per IP (T-D7).
 *
 * The endpoint writes a row keyed on an arbitrary email address and hands back a
 * link, which is a spam vector that would run through our name. Per-IP is the
 * wrong key here: the cost lands on the project whose members are being invited,
 * and one office behind one NAT would otherwise share a single office-wide
 * budget. Falls back to the IP when there is no slug, so a malformed path cannot
 * route around the limiter by keying every request as `undefined`.
 */
export const inviteLimiter = rateLimit({
    windowMs: INVITE_WINDOW_MS,
    max: INVITE_MAX,
    message: { error: 'Too many invites for this project. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) =>
        typeof req.params.slug === 'string' && req.params.slug
            ? `invite:${req.params.slug}`
            : `invite-ip:${req.ip}`,
});
