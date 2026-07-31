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
