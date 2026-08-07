import { z } from 'zod';

/**
 * Admin user administration (spec D8).
 *
 * The global role is a two-value enum on purpose. `User.role` is a nullable free
 * string in the schema for historical reasons, and only `'admin'` means anything
 * to `authorize()` — so accepting an arbitrary string here would let an admin
 * write a role that silently grants nothing and looks like it should.
 */
export const updateUserRoleSchema = z.object({
    role: z.enum(['admin', 'user']),
});

export const updateUserActiveSchema = z.object({
    isActive: z.boolean(),
});

export const listUsersQuerySchema = z.object({
    q: z.string().trim().max(200).optional(),
    page: z.coerce.number().int().min(1).default(1),
    // Capped: this endpoint returns every account's email, so an unbounded
    // pageSize is a one-request dump of the whole directory.
    pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
