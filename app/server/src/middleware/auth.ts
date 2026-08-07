import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

// Imported, never re-derived: this module VERIFIES what api/auth.ts SIGNS, so a
// second fallback here is how a deploy ends up signing and verifying with two
// different secrets.
import { SECRET_KEY, JWT_ALGORITHM } from '../lib/jwtSecrets';

interface JwtPayload {
    id: number;
    email: string;
    role: string;
    /** RefreshToken row id (spec D4). Absent on tokens minted before Sprint 5. */
    sid?: number;
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
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

        req.user = {
            id: decoded.id,
            email: decoded.email,
            // Display only — see the note on `authorize` below and in express.d.ts.
            role: decoded.role,
            sid: typeof decoded.sid === 'number' ? decoded.sid : undefined,
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
 * Optional authentication middleware
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            try {
                const decoded = jwt.verify(token, SECRET_KEY, { algorithms: [JWT_ALGORITHM] }) as JwtPayload;
                req.user = {
                    id: decoded.id,
                    email: decoded.email,
                    role: decoded.role,
                    sid: typeof decoded.sid === 'number' ? decoded.sid : undefined,
                };
            } catch {
                req.user = undefined;
            }
        } else {
            req.user = undefined;
        }
        next();
    } catch {
        req.user = undefined;
        next();
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
