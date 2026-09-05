import 'dotenv/config';
import prisma from '../lib/prisma';

/**
 * Removes every account except the ones this file names, and the rows that hang
 * off them.
 *
 *     npm run cleanup:accounts              # dry run — prints, writes nothing
 *     npm run cleanup:accounts -- --apply   # actually deletes
 *
 * **Dry run is the default and that is deliberate.** This is the one script in
 * the repo that destroys user data, and the failure it guards against is not a
 * bug in the SQL — it is running the right script against the wrong database.
 * Printing the exact rows first, with the account emails visible, is the check
 * that catches that.
 *
 * ## Why an explicit keep-list and not a pattern
 *
 * `WHERE email LIKE '%test%'` is how a cleanup deletes something real: the
 * pattern is written against the accounts you remember, and it runs against the
 * accounts that exist. `KEEP_EMAILS` is a list of identities; anything not on it
 * goes, and the dry run shows exactly who that is before it happens.
 *
 * ## What the keep-list is for
 *
 * - `admin@apexops.com` — the administrator account. It owns the `default`
 *   project, which is the example data the documentation is written against.
 * - `dev.user@apexops.local` / `dev.admin@apexops.local` — the two accounts the
 *   in-app dev role switcher signs into, created by `seed-dev-users.ts`.
 *
 * Those two dev accounts are **upserted by that seed script**, which is what
 * makes this operation recoverable in the direction that matters: delete them by
 * mistake and `npm run seed:dev` puts them back. `admin@apexops.com` has no such
 * script and is not recoverable that way — see the note in
 * `.agents/docs/planning/auth-review-and-restructure-2026-08-25.md`.
 */

/** Accounts that survive. Everything else is removed. */
const KEEP_EMAILS = [
    'admin@apexops.com',
    'dev.user@apexops.local',
    'dev.admin@apexops.local',
];

/**
 * Relations that follow a deleted user, and how.
 *
 * Prisma's `onDelete` rules do the work; this list exists so the dry run can
 * *say* what will follow rather than leaving the operator to find out. Cascading
 * rows are counted and reported; `SetNull` rows are named because they survive
 * the delete with a hole in them, which is a different thing to know about.
 */
const CASCADES = ['notes', 'tasks', 'calendarEvents', 'projectMemberships', 'refreshTokens', 'userSettings', 'userAiKey', 'notifications', 'sentInvites', 'logs'] as const;
const SET_NULL = ['tickets (assignee/reporter)', 'ticketComments', 'docPages (updatedBy)', 'sourceMaps (uploadedBy)', 'issueStatusChanges (actor)'] as const;

async function main(): Promise<void> {
    const apply = process.argv.includes('--apply');

    const keep = await prisma.user.findMany({
        where: { email: { in: KEEP_EMAILS } },
        select: { id: true, email: true, role: true },
        orderBy: { id: 'asc' },
    });

    // A keep-list entry that matches nothing is a typo, and a typo here deletes an
    // account it was written to protect. Refuse rather than proceed politely.
    const missing = KEEP_EMAILS.filter((e) => !keep.some((k) => k.email === e));
    if (missing.length) {
        console.error(`\n✖ Refusing to run: these keep-list accounts do not exist:\n  ${missing.join('\n  ')}\n`);
        console.error('  Fix the list, or create the account, before running this again.\n');
        process.exitCode = 1;
        return;
    }

    const doomed = await prisma.user.findMany({
        where: { email: { notIn: KEEP_EMAILS } },
        select: {
            id: true, email: true, role: true, createdAt: true,
            _count: {
                select: {
                    notes: true, tasks: true, calendarEvents: true, projectMemberships: true,
                    ownedProjects: true, refreshTokens: true, notifications: true, sentInvites: true, logs: true,
                },
            },
        },
        orderBy: { id: 'asc' },
    });

    console.log(`\n${apply ? 'APPLYING' : 'DRY RUN'} — database: ${new URL(process.env.DATABASE_URL ?? 'postgres://?/unknown').pathname.slice(1)}\n`);

    console.log('KEEP:');
    keep.forEach((u) => console.log(`  id ${String(u.id).padStart(3)}  ${u.email.padEnd(26)} ${u.role}`));

    if (!doomed.length) {
        console.log('\nNothing to remove — every remaining account is on the keep-list.\n');
        return;
    }

    console.log('\nREMOVE:');
    let ownedProjects = 0;
    doomed.forEach((u) => {
        const c = u._count;
        ownedProjects += c.ownedProjects;
        console.log(
            `  id ${String(u.id).padStart(3)}  ${u.email.padEnd(26)} ${String(u.role).padEnd(6)}` +
                ` notes=${c.notes} tasks=${c.tasks} events=${c.calendarEvents} memberships=${c.projectMemberships}` +
                ` tokens=${c.refreshTokens} owns=${c.ownedProjects}`,
        );
    });

    console.log(`\n  cascades with them: ${CASCADES.join(', ')}`);
    console.log(`  survive with a null: ${SET_NULL.join(', ')}`);

    // A project whose owner is deleted is the one case that is not a tidy-up: the
    // FK is required, so the project goes too — with its issues, events and
    // tickets. Refuse and make it a separate, deliberate decision.
    if (ownedProjects > 0) {
        console.error(
            `\n✖ Refusing to run: ${ownedProjects} project(s) are OWNED by an account on the remove list.\n` +
                '  Deleting the owner takes the project, its issues, its events and its tickets with it.\n' +
                '  Transfer ownership first, or delete those projects deliberately and separately.\n',
        );
        process.exitCode = 1;
        return;
    }

    if (!apply) {
        console.log('\nDry run. Nothing was written. Re-run with --apply to delete.\n');
        return;
    }

    const ids = doomed.map((u) => u.id);
    const { count } = await prisma.user.deleteMany({ where: { id: { in: ids } } });
    console.log(`\n✔ Removed ${count} account(s).`);

    const remaining = await prisma.user.count();
    console.log(`  ${remaining} account(s) remain.\n`);
}

main()
    .catch((err) => {
        console.error('Cleanup failed:', err);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
