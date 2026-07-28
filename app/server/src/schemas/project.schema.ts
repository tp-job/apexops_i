import { z } from 'zod';

/**
 * Which console levels the SDK is allowed to ship. Deliberately *not* the full
 * console surface: `log`/`info`/`debug` are opt-in (spec D5) because capturing
 * them by default turns a chatty dev app into thousands of rows an hour.
 */
export const CAPTURE_LEVELS = ['error', 'warn', 'info', 'log', 'debug'] as const;
export const DEFAULT_CAPTURE_LEVELS = ['error', 'warn'] as const;

export const ISSUE_STATUSES = ['unresolved', 'resolved', 'ignored'] as const;

export type CaptureLevel = (typeof CAPTURE_LEVELS)[number];

const captureLevelsField = z
    .array(z.enum(CAPTURE_LEVELS))
    .min(1, 'At least one capture level is required')
    // A duplicate level is harmless server-side but makes the settings UI render
    // a checked box twice; normalize on the way in rather than defending later.
    .transform((levels) => [...new Set(levels)]);

/**
 * Origin allowlist entries are matched against the browser's `Origin` header,
 * which is always scheme + host + optional port and NEVER has a path or a
 * trailing slash. Validating that shape here means the ingest comparison stays a
 * plain string equality check instead of a normalization guess at request time.
 */
const originField = z
    .string()
    .trim()
    .max(253)
    .refine(
        (value) => {
            if (value === '*') return true;
            let url: URL;
            try {
                url = new URL(value);
            } catch {
                return false;
            }
            return (
                (url.protocol === 'http:' || url.protocol === 'https:') &&
                url.pathname === '/' &&
                !url.search &&
                !url.hash &&
                // `new URL` accepts trailing junk that `origin` drops; requiring the
                // input to already equal its own origin rejects `https://a.com/x`.
                value.replace(/\/$/, '') === url.origin
            );
        },
        { message: 'Must be an origin like https://example.com (no path), or *' }
    );

const allowedOriginsField = z.array(originField).max(20).transform((origins) => [...new Set(origins)]);

export const createProjectSchema = z.object({
    name: z.string().trim().min(1, 'Project name is required').max(80),
    /**
     * Optional: the server derives a slug from the name when this is absent.
     * Reserved words are rejected so a project can never shadow a sibling route
     * under `/p/:slug` or the API surface.
     */
    slug: z
        .string()
        .trim()
        .min(1)
        .max(48)
        .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase letters, digits and single hyphens')
        .refine((s) => !['new', 'api', 'settings', 'admin', 'p'].includes(s), {
            message: 'That slug is reserved',
        })
        .optional(),
    captureLevels: captureLevelsField.optional(),
    allowedOrigins: allowedOriginsField.optional(),
    /**
     * Capped at a year: retention is enforced by a prune job, and an unbounded
     * window is how the events table quietly becomes the whole database.
     */
    retentionDays: z.number().int().min(1).max(365).optional(),
});

export const updateProjectSchema = z
    .object({
        name: z.string().trim().min(1).max(80).optional(),
        captureLevels: captureLevelsField.optional(),
        allowedOrigins: allowedOriginsField.optional(),
        retentionDays: z.number().int().min(1).max(365).optional(),
    })
    // Slug is intentionally absent: it is in every embedded snippet's dashboard
    // link and every bookmark. Renaming the project keeps the slug stable.
    .refine((body) => Object.keys(body).length > 0, { message: 'No fields to update' });

export const listProjectsQuerySchema = z.object({
    includeArchived: z
        .enum(['true', 'false'])
        .optional()
        .transform((v) => v === 'true'),
});
