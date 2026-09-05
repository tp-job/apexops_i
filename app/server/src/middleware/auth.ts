import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

// Imported, never re-derived: this module VERIFIES what api/auth.ts SIGNS, so a
// second fallback here is how a deploy ends up signing and verifying with two
// different secrets.
import { SECRET_KEY, JWT_ALGORITHM } from '../lib/jwtSecrets';
// The admit decision is pure and lives in its own module so it can be tested
// without Prisma or an Express response — same split as `lib/monitorAccess.ts`.
import { decideSessionAdmit } from '../lib/sessionAdmit';

interface JwtPayload {
    id: number;
    email: string;
    role: string;
    /** RefreshToken row id (spec D4). Absent on tokens minted before Sprint 5. */
    sid?: number;
}

/**
 * Authentication: verify the token, then verify the **session behind it**.
 *
 * ## Why the second half exists
 *
 * Until 2026-09-06 this function verified a signature and nothing else, and the
 * `sid` claim — the id of the `RefreshToken` row the session was issued from —
 * was read into `req.user` and never checked against that table. Every
 * revocation path deleted the row and left the access token working:
 *
 * - `POST /auth/logout`
 * - `DELETE /auth/sessions/:id` and `POST /auth/sessions/revoke-all`
 * - `revokeAllSessions()`, which `api/users.ts` calls when an admin **deactivates
 *   or demotes** an account
 *
 * The window was the access token's whole lifetime: `sessionTimeout` minutes,
 * which defaults to and caps at **480 — eight hours**. Of the 22 routers behind
 * this middleware only four also reach `authorize()`, so for the other eighteen
 * a revoked session kept full access for up to eight hours, including during the
 * incident response that revocation exists for.
 *
 * **The eight-hour session is intended and is unchanged.** What changes is that
 * it now ends when it is revoked. Those are different properties, and only the
 * second one was ever broken.
 *
 * ## One query, not two
 *
 * The lookup returns the session *and* the user's current `role` and `isActive`,
 * which is exactly what `authorize()` used to fetch separately. It reuses this
 * result, so a role-gated route now costs one query where it cost two, and every
 * other authenticated route costs one primary-key read it did not pay before.
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const decoded = jwt.verify(token, SECRET_KEY, { algorithms: [JWT_ALGORITHM] }) as JwtPayload;

        // Only fetched when the token names a session; a token without `sid`
        // is refused below without touching the database.
        const session =
            typeof decoded.sid === 'number'
                ? await prisma.refreshToken.findUnique({
                      where: { id: decoded.sid },
                      select: {
                          userId: true,
                          expiresAt: true,
                          absoluteExpiresAt: true,
                          user: { select: { role: true, isActive: true } },
                      },
                  })
                : null;

        const admit = decideSessionAdmit({
            sid: decoded.sid,
            tokenUserId: decoded.id,
            session,
            now: new Date(),
        });

        if (!admit.ok) {
            // The reason picks the status, never the other way round: a new refusal
            // has to choose one on purpose rather than inherit a flattering default.
            // Everything except deactivation is deliberately indistinguishable —
            // "revoked", "expired" and "wrong owner" all read as 401 to the caller,
            // because telling an attacker WHICH is telling them about the account.
            if (admit.reason === 'deactivated') {
                res.status(403).json({ error: 'Account is deactivated' });
                return;
            }
            res.status(401).json({ error: 'Session ended' });
            return;
        }

        req.user = {
            id: decoded.id,
            email: decoded.email,
            // The CURRENT role, read a moment ago — no longer the token's claim.
            role: admit.role,
            sid: decoded.sid,
            roleIsFresh: true,
        };

        next();
    } catch (err: any) {
        if (err.name === 'TokenExpiredError') {
            res.status(401).json({ error: 'Token expired' });
            return;
        }
        if (err.name === 'JsonWebTokenError') {
            res.status(401).json({ error: 'Invalid token' });
            return;
        }
        res.status(500).json({ error: 'Authentication error' });
    }
};

/**
 * Role-based authorization — **resolved from the database, not from the token**.
 *
 * Every sprint plan since the workspaces sprint has carried
 * *token-invalidation-on-role-change* as the single highest risk in the backlog:
 * the role is signed into a one-hour JWT, so a demotion silently does not take
 * effect for up to an hour while the UI reports success. The proposed fixes were
 * always a `tokenVersion` column plus an invalidation check on every authenticated
 * request.
 *
 * Sprint 6 found the project-role half of that risk was never real. `ProjectRole`
 * is not in the token; `resolveMembership` reads it per request, so a demotion
 * lands on the next call with no token machinery at all. Spec D5 applies the same
 * answer here.
 *
 * The claim in `req.user.role` is therefore **display only**. This reads `role`
 * and `isActive` fresh, which costs one primary-key lookup — and only on routes
 * that are role-gated, not on the hot path. That is strictly less code, less
 * state and less latency than a token-version scheme, and it has no window during
 * which a revoked admin is still an admin.
 *
 * `isActive` is checked here too: a deactivated account keeping its admin powers
 * until a token expired would be the same bug wearing a different hat.
 */
export const authorize = (...roles: string[]) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        // `authenticate` resolved the role from the database on this same request
        // when it validated the session, so re-reading it here would be a second
        // query for an answer that cannot have changed in between. The freshness
        // property this gate is famous for is preserved — it moved upstream, it
        // did not go away.
        if (req.user.roleIsFresh) {
            if (!roles.includes(req.user.role || 'user')) {
                res.status(403).json({ error: 'Insufficient permissions' });
                return;
            }
            next();
            return;
        }

        try {
            const current = await prisma.user.findUnique({
                where: { id: req.user.id },
                select: { role: true, isActive: true },
            });

            // A token for a user who no longer exists is not a user. Falling back to
            // the token's claim here would make a deleted admin permanently an admin.
            if (!current || current.isActive === false) {
                res.status(403).json({ error: 'Insufficient permissions' });
                return;
            }

            if (!roles.includes(current.role || 'user')) {
                res.status(403).json({ error: 'Insufficient permissions' });
                return;
            }

            // Keep the request's view of the role honest for anything downstream
            // that reads it, rather than leaving a stale claim in place.
            req.user.role = current.role || 'user';
            next();
        } catch (err) {
            // Fail CLOSED. If the role cannot be read, the answer is "no", never
            // "assume the token was right".
            console.error('authorize lookup failed:', err);
            res.status(503).json({ error: 'Authorization unavailable' });
        }
    };
};
