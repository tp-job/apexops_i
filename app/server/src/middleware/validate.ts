import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Generic Zod validation middleware
 * Validates req.body against the provided schema
 */
export const validate = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            req.body = schema.parse(req.body);
            next();
        } catch (err) {
            if (err instanceof ZodError) {
                res.status(400).json({
                    error: 'Validation failed',
                    details: err.issues.map((e: any) => ({
                        field: e.path.join('.'),
                        message: e.message,
                    })),
                });
                return;
            }
            next(err);
        }
    };
};

/**
 * `validateQuery` was removed on 2026-08-04 (Sprint 7, F018).
 *
 * It assigned the parsed result back to `req.query`, which Express 5 exposes as a
 * getter — so every call threw `TypeError: Cannot set property query of
 * #<IncomingMessage>`, surfacing as a 500 on a route that looked correctly
 * validated. Three routers (`projects`, `tickets`, `users`) had already worked
 * around it by parsing inline, each leaving a comment, and nobody removed the
 * middleware itself.
 *
 * Dead code that throws is worse than dead code: it reads as the house style, so
 * the next person to add a paginated route reaches for it and loses an afternoon.
 * Parse query params in the handler with `schema.safeParse(req.query)` — see
 * `api/users.ts` for the shape.
 *
 * `validate` above is fine: it assigns to `req.body`, which is writable.
 */
