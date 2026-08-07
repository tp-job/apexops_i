import prisma from './prisma';
import { sendWebhook } from './webhook';
import { sendMailDetached } from './mail';
import { regressionEmail } from './mailTemplates';

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
            // The email is selected here so the mail channel below needs no second
            // query. It never leaves the server — it is only used as a recipient.
            select: { userId: true, user: { select: { email: true } } },
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

        /**
         * Email, the third channel (spec E-D6).
         *
         * Detached, like everything else on this path. `dispatchRegressionAlert`
         * runs **inside the ingest request** — awaiting a mail server here would
         * mean an unreachable SMTP host adds its full timeout to somebody's error
         * report, and a slow one makes ingest slow for everyone.
         *
         * The in-app rows above are still the system of record. Email is a
         * convenience on top of them, and it is ordered after them for the reason
         * the module header gives: a channel that silently stops delivering must
         * never be the only place a regression was recorded.
         */
        for (const member of members) {
            if (!member.user?.email) continue;
            sendMailDetached(
                regressionEmail({
                    to: member.user.email,
                    projectName: project.name,
                    issueTitle: input.issueTitle,
                    culprit: input.culprit,
                    reopenCount: input.reopenCount,
                    issueUrl: input.issueUrl,
                }),
            );
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
