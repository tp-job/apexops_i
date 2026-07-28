import { randomBytes } from 'crypto';
import prisma from './prisma';

/**
 * Ingest keys and project slugs.
 *
 * The ingest key is PUBLIC by design (spec D4) — it ships inside a <script> tag
 * on pages we do not control, so it can never be a secret. That is fine, because
 * it is write-only: it authorizes `POST /api/ingest` and nothing else, it is rate
 * limited per key, and it can be rotated. Reads always use the JWT session.
 *
 * It still needs to be *unguessable*, though. A predictable key would let anyone
 * write events into a project they cannot see, which is a data-integrity problem
 * even though it is not a data-leak one. Hence `crypto.randomBytes`, never
 * `Math.random()`.
 */

const KEY_PREFIX = 'pk_';
/** 24 bytes → 48 hex chars. Comfortably beyond brute force, still one line in a snippet. */
const KEY_BYTES = 24;

export const generateIngestKey = (): string => `${KEY_PREFIX}${randomBytes(KEY_BYTES).toString('hex')}`;

export const isIngestKeyShaped = (value: unknown): value is string =>
    typeof value === 'string' && new RegExp(`^${KEY_PREFIX}[0-9a-f]{${KEY_BYTES * 2}}$`).test(value);

/**
 * Generates a key that is not already taken. A collision at 24 random bytes is
 * not a real scenario, but `ingestKey` is `@unique` and an unhandled P2002 on
 * project creation would surface as a 500 with no explanation — the retry costs
 * one indexed lookup on a path that runs a handful of times per user, ever.
 */
export const generateUniqueIngestKey = async (): Promise<string> => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
        const key = generateIngestKey();
        const taken = await prisma.project.count({ where: { ingestKey: key } });
        if (!taken) return key;
    }
    throw new Error('Could not generate a unique ingest key');
};

/**
 * `My App 2!` → `my-app-2`. Non-ASCII is stripped rather than transliterated, so
 * a fully non-Latin name (Thai project names are likely here) reduces to empty —
 * `slugify` returns '' in that case and the caller falls back to `project`.
 */
export const slugify = (input: string): string =>
    input
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48);

/**
 * Resolves a name to a free slug, suffixing `-2`, `-3`, … on collision.
 *
 * `excludeId` lets a rename keep its own slug: without it, renaming a project to
 * the name it already has would collide with itself and bump to `-2` every save.
 */
export const generateUniqueSlug = async (name: string, excludeId?: number): Promise<string> => {
    const base = slugify(name) || 'project';

    for (let suffix = 1; suffix < 100; suffix += 1) {
        const candidate = suffix === 1 ? base : `${base}-${suffix}`;
        const clash = await prisma.project.findUnique({ where: { slug: candidate }, select: { id: true } });
        if (!clash || clash.id === excludeId) return candidate;
    }

    // Fall back to a random discriminator rather than looping forever.
    return `${base}-${randomBytes(3).toString('hex')}`;
};
