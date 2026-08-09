import { z } from 'zod';

/**
 * Documentation CMS (spec S9-D1, S9-D3, S9-D8).
 *
 * The body is deliberately **not** validated for Markdown correctness. A parser
 * that refuses to save a malformed directive would make the editor unusable
 * mid-sentence, and it is the wrong layer to defend at anyway: the renderer
 * degrades an unknown directive to text and escapes raw HTML (S9-D4), so a bad
 * body is a bad-looking page rather than an incident.
 */

/**
 * Slugs go straight into `/docs/:slug`, so the character set is the URL's, not
 * the author's. Rejecting here rather than silently rewriting: an admin who
 * typed `Getting Started` should be told, not surprised later by a link that
 * does not match what they saw.
 */
const slug = z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single hyphens');

const status = z.enum(['draft', 'published']);

export const createDocPageSchema = z.object({
    slug,
    title: z.string().trim().min(1).max(200),
    group: z.string().trim().min(1).max(80),
    groupOrder: z.number().int().min(0).max(999).optional(),
    order: z.number().int().min(0).max(999).optional(),
    summary: z.string().trim().max(300).default(''),
    // 400 KB. Large enough that no real page hits it, small enough that the
    // table cannot be used as free storage by a compromised admin account.
    body: z.string().max(400_000).default(''),
    status: status.default('draft'),
});

/** Every field optional — the editor saves what changed, not the whole page. */
export const updateDocPageSchema = createDocPageSchema.partial();

/**
 * Reorder takes the whole rail in one request rather than a delta per page.
 * Sending positions one at a time makes every intermediate state a real state,
 * and a dropped request in the middle leaves the sidebar in an order nobody
 * chose.
 */
export const reorderDocPagesSchema = z.object({
    pages: z
        .array(
            z.object({
                id: z.number().int().positive(),
                group: z.string().trim().min(1).max(80),
                groupOrder: z.number().int().min(0).max(999),
                order: z.number().int().min(0).max(999),
            })
        )
        .min(1)
        .max(200),
});
