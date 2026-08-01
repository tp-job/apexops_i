import prisma from './prisma';
import { Prisma, ProjectRole } from '@prisma/client';

export const projectSelect = {
    id: true,
    name: true,
    slug: true,
    ingestKey: true,
    allowedOrigins: true,
    captureLevels: true,
    retentionDays: true,
    alertOnRegression: true,
    webhookUrl: true,
    ownerId: true,
    archivedAt: true,
    createdAt: true,
    updatedAt: true,
} as const;

export type ProjectRow = Prisma.ProjectGetPayload<{ select: typeof projectSelect }>;

export const asStringArray = (value: Prisma.JsonValue): string[] =>
    Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

/**
 * Resolves `:slug` to a project the caller is actually a member of.
 *
 * Returns `null` — which every caller must turn into a **404, not a 403** — for a
 * project that exists but is not theirs. A 403 confirms the slug is real, which
 * turns any of these routes into a way to enumerate other people's project names
 * one guess at a time.
 *
 * Lives here rather than in `api/projects.ts` because `api/issues.ts` mounts
 * under the same `:slug` and needs the identical check. Two copies of an
 * authorization helper is how one of them quietly stops matching the other.
 */
export async function resolveMembership(
    // Express 5 types `req.params[k]` as `string | string[]`; the narrowing below
    // is what makes a repeated `?slug=` produce a 404 rather than a Prisma crash.
    slug: string | string[] | undefined,
    userId: number
): Promise<{ project: ProjectRow; role: ProjectRole } | null> {
    if (typeof slug !== 'string' || !slug) return null;

    const project = await prisma.project.findUnique({ where: { slug }, select: projectSelect });
    if (!project) return null;

    const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: project.id, userId } },
        select: { role: true },
    });
    if (!membership) return null;

    return { project, role: membership.role };
}

export const canAdminister = (role: ProjectRole) => role === 'owner' || role === 'admin';

/**
 * Paired with `canAdminister` rather than left as an inline `role === 'owner'`.
 *
 * The two predicates encode T-D3's split: `canAdminister` gates settings, key
 * rotation and membership; `isOwner` gates the three actions an admin must not
 * reach — archive, restore, and transfer. Naming both makes the distinction
 * greppable, so a new owner-only route is written by reaching for a function
 * that already exists instead of by retyping a comparison and getting it wrong.
 */
export const isOwner = (role: ProjectRole) => role === 'owner';

/**
 * Is this user a member of this project?
 *
 * Exists for the one question `resolveMembership` cannot answer: not "may the
 * *caller* touch this project" but "may this *other* user be named in it". That
 * is the check behind assignment (T-D6) — and it is deliberately a boolean, not
 * a user row, because every caller so far wants to reject and none wants to
 * echo back who the id belonged to. Returning the row would rebuild the
 * enumeration oracle this function was written to close.
 */
export async function isProjectMember(projectId: number, userId: number): Promise<boolean> {
    const membership = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } },
        select: { userId: true },
    });
    return membership !== null;
}
