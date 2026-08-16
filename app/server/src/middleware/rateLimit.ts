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

const AI_WINDOW_MS = parseInt(process.env.AI_RATE_LIMIT_WINDOW_MS || '3600000', 10); // 1 hour
const AI_MAX = parseInt(process.env.AI_RATE_LIMIT_PER_HOUR || '30', 10);

/**
 * The AI proxy, capped **per user** (spec E-D1).
 *
 * This endpoint spends real money on someone else's behalf: every call is a
 * billable request to Gemini. Authentication stops a stranger; it does nothing
 * about a signed-in loop, accidental or otherwise, which bills exactly the same.
 *
 * Keyed on the user id, not the IP, for the same reason the invite limiter is
 * keyed on the project: two colleagues behind one NAT must not share a budget,
 * and one person on a phone and a laptop must not get two. `authenticate` runs
 * first, so `req.user` is always present — the IP fallback exists only so a
 * misordered mount cannot silently key every request as `undefined` and turn the
 * limiter off.
 */
export const aiChatLimiter = rateLimit({
    windowMs: AI_WINDOW_MS,
    max: AI_MAX,
    message: {
        error: 'AI request limit reached',
        // Matches the `AiErrorCode` union in `api/ai.ts` so the client branches on
        // one vocabulary. This 429 is produced by the limiter, before the route
        // runs, so the code has to be declared here or the shape is inconsistent
        // with every other failure from the same endpoint.
        code: 'RATE_LIMITED',
        detail: `Up to ${AI_MAX} requests per hour. Try again later.`,
    },
    // `standardHeaders` is what makes the wait renderable: it emits RateLimit-Reset,
    // so the client can say when to come back rather than "try again later".
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => (req.user?.id ? `ai:${req.user.id}` : `ai-ip:${req.ip}`),
});

const SCAN_WINDOW_MS = parseInt(process.env.URL_SCAN_WINDOW_MS || '3600000', 10); // 1 hour
const SCAN_MAX = parseInt(process.env.URL_SCAN_MAX || '20', 10);

/**
 * URL scanning (`POST /api/console-logs`), capped per user.
 *
 * Every call launches a headless browser and navigates for up to 30 seconds. Even
 * behind an admin gate that is a resource lever worth bounding — a loop here does
 * not read data, it exhausts the host. Low limit on purpose: this is a
 * diagnostic tool someone reaches for a handful of times, not an API.
 */
export const urlScanLimiter = rateLimit({
    windowMs: SCAN_WINDOW_MS,
    max: SCAN_MAX,
    message: { error: 'Too many URL scans. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => (req.user?.id ? `scan:${req.user.id}` : `scan-ip:${req.ip}`),
});
