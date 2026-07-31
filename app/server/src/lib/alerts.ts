import prisma from './prisma';
import { sendWebhook } from './webhook';

/**
 * Alert dispatch for regressions.
 *
 * Ordering is deliberate: **the in-app rows are written first and
 * unconditionally**, then the webhook is attempted. The feed is the system of
 * record — a webhook that silently stops delivering is indistinguishable from
 * "no regressions happened", which is the worst failure a monitoring tool can
 * have. If the outbound send fails, there is still a durable record of what we
 * tried to tell you.
 *
 * Nothing here throws. This runs inside the ingest request, and an alerting
 * failure must never turn someone's error report into a 500.
 */

export interface RegressionAlertInput {
    projectId: number;
    issueId: number;
    issueTitle: string;
    culprit: string | null;
    reopenCount: number;
    /** Absolute URL to the issue, if the server knows its public origin. */
    issueUrl?: string;
}

export async function dispatchRegressionAlert(input: RegressionAlertInput): Promise<void> {
    try {
        const project = await prisma.project.findUnique({
            where: { id: input.projectId },
            select: { id: true, name: true, slug: true, alertOnRegression: true, webhookUrl: true },
        });
        // Alerting is opt-out per project (spec S-D4). Respect it before doing
        // any work, including the database writes.
        if (!project || !project.alertOnRegression) return;

        const members = await prisma.projectMember.findMany({
            where: { projectId: input.projectId },
            select: { userId: true },
        });

        const title = `Regression in ${project.name}`;
        const body = [
            input.issueTitle,
            input.culprit ? `at ${input.culprit}` : null,
            `— resolved and came back${input.reopenCount > 1 ? ` (${input.reopenCount}×)` : ''}`,
        ]
            .filter(Boolean)
            .join(' ');

        if (members.length) {
            // One row per member: read state is per person, so a shared row would
            // let one member's "mark read" hide it from everyone else.
            await prisma.notification.createMany({
                data: members.map((m) => ({
                    userId: m.userId,
                    kind: 'regression' as const,
                    projectId: project.id,
                    issueId: input.issueId,
                    title,
                    body,
                })),
            });
        }

        if (project.webhookUrl) {
            const result = await sendWebhook(project.webhookUrl, {
                // Slack and Discord both render a bare `text`/`content` field, so
                // sending both plus structured data makes one payload work in the
                // two places people actually point this, without a per-vendor adapter.
                text: `🔁 ${title}\n${body}`,
                content: `🔁 ${title}\n${body}`,
                event: 'issue.regression',
                project: { id: project.id, name: project.name, slug: project.slug },
                issue: {
                    id: input.issueId,
                    title: input.issueTitle,
                    culprit: input.culprit,
                    reopenCount: input.reopenCount,
                    url: input.issueUrl ?? null,
                },
                occurredAt: new Date().toISOString(),
            });
            if (!result.delivered) {
                console.warn(
                    `[alerts] webhook for project ${project.slug} not delivered: ${result.reason ?? result.status}`
                );
            }
        }
    } catch (err) {
        // Swallowed on purpose — see the note above.
        console.error('[alerts] regression dispatch failed:', err);
    }
}
