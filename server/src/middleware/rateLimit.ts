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
