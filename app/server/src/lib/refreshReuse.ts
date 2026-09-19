import prisma from './prisma';
import { sendMailDetached } from './mail';
import { sessionReuseEmail } from './mailTemplates';

/**
 * What happens when `/refresh` detects a token reused after rotation
 * (phase 3, A4) — revoke the family, then tell the account holder.
 *
 * **No in-app row.** `lib/alerts.ts`'s pattern — write the durable in-app
 * record first, then the outbound channel — was the template to reach for, but
 * `Notification` requires a `projectId` on every row and a compromised session
 * is not about any project. Force-fitting one would mean faking a project id or
 * making the column nullable, changing the meaning of every existing query
 * against a table this phase does not otherwise touch. Decided: email only,
 * recorded as a real gap in `.agents/harness/auth-security-hardening/build-spec.md`,
 * not silently narrowed.
 *
 * **Nothing here throws.** This runs from inside `/refresh`, mid-request, and
 * an alerting failure must never turn a legitimate rotation attempt — or the
 * reuse response itself — into a 500. Same rule as `dispatchRegressionAlert`,
 * for the same reason.
 */
export async function revokeFamilyAndAlert(family: string): Promise<void> {
    try {
        // The row this reuse was detected against still carries the account's
        // identity and the original session's start time — read before the
        // delete removes it.
        const anyRow = await prisma.refreshToken.findFirst({
            where: { family },
            orderBy: { createdAt: 'asc' },
            select: { userId: true, createdAt: true },
        });
        if (!anyRow) return;

        const { count } = await prisma.refreshToken.deleteMany({ where: { family } });

        const user = await prisma.user.findUnique({
            where: { id: anyRow.userId },
            select: { email: true },
        });

        console.warn(
            `[security] refresh token reuse detected — revoked ${count} session(s) in family ${family} for user ${anyRow.userId}`,
        );

        if (user?.email) {
            sendMailDetached(sessionReuseEmail({ to: user.email, sessionCreatedAt: anyRow.createdAt }));
        }
    } catch (err) {
        console.error('revokeFamilyAndAlert failed:', err);
    }
}
