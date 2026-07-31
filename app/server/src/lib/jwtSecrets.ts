/**
 * The single source of the JWT signing secrets.
 *
 * **Why this file exists.** The secrets were previously derived in three places
 * with three different fallbacks:
 *
 *   api/auth.ts        JWT_SECRET || (isProduction ? 'REPLACE_IN_PRODUCTION' : 'mySecretKey')
 *   middleware/auth.ts JWT_SECRET || 'mySecretKey'    ← no production guard
 *   server.ts          JWT_SECRET || 'mySecretKey'    ← no production guard
 *
 * Two failures fell out of that. A production deploy missing `JWT_SECRET` did
 * not fail — it signed tokens with a value committed to this repository, so
 * anyone could forge a token for any user. And because the fallbacks disagreed,
 * the signer and the verifier would have used *different* secrets, so the
 * symptom would have been "nobody can log in" rather than anything pointing at
 * the real cause.
 *
 * **This module refuses to start instead.** A server that boots with a
 * forgeable secret is strictly worse than one that will not boot: the first
 * fails silently in production, the second fails loudly at deploy time, which is
 * when someone is watching.
 */

const isProduction = process.env.NODE_ENV === 'production';

/** Long enough that brute-forcing the signature is not the weak link. */
const MIN_SECRET_LENGTH = 32;

/**
 * Development-only defaults. Deliberately obvious rather than random: a
 * regenerated-per-boot secret would invalidate every token on every restart and
 * make local work miserable. These are safe *only* because production cannot
 * reach this branch.
 */
const DEV_FALLBACKS = {
    JWT_SECRET: 'dev-only-access-secret-not-for-production',
    JWT_REFRESH_SECRET: 'dev-only-refresh-secret-not-for-production',
} as const;

function requireSecret(name: keyof typeof DEV_FALLBACKS): string {
    const value = process.env[name];

    if (isProduction) {
        if (!value) {
            throw new Error(
                `[startup] ${name} is not set. Refusing to start in production: ` +
                    'without it the server would sign tokens with a public default and ' +
                    'anyone could forge a session.'
            );
        }
        if (value.length < MIN_SECRET_LENGTH) {
            throw new Error(
                `[startup] ${name} must be at least ${MIN_SECRET_LENGTH} characters ` +
                    `(got ${value.length}). Refusing to start in production.`
            );
        }
        return value;
    }

    if (!value) {
        // Warned every boot on purpose: the point is that nobody reaches
        // production having never seen this line.
        console.warn(
            `[startup] ${name} is not set — using a development default. ` +
                'This will refuse to start when NODE_ENV=production.'
        );
        return DEV_FALLBACKS[name];
    }
    return value;
}

export const SECRET_KEY = requireSecret('JWT_SECRET');
export const REFRESH_SECRET_KEY = requireSecret('JWT_REFRESH_SECRET');

/**
 * Signing and verification must never disagree about the algorithm either.
 * Pinning it also closes the `alg: none` class of attack, where a forged token
 * declares it is unsigned and a permissive verifier believes it.
 */
export const JWT_ALGORITHM = 'HS256' as const;
