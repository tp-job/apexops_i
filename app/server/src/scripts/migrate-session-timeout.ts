/**
 * One-time migration: move untouched `sessionTimeout` values from the old column
 * default (30) to the new one (480). Spec D3.
 *
 * Why this exists at all. `sessionTimeout` sat in `user_settings` for months as a
 * value nobody could set — the settings page shipped without a control for it,
 * because S-D1 forbids shipping a switch that enforces nothing. So every row holds
 * 30 by default, not by choice.
 *
 * Sprint 5 makes the value real: it becomes the idle window on the refresh token
 * (D1). Enforcing 30 as written would mean a sprint *about settings* lands as "the
 * app started signing me out every half hour", triggered by a number the user
 * never saw. So the untouched default moves first, and enforcement follows.
 *
 * Deliberately narrow: it matches `30` exactly. Anyone who has picked a value —
 * including someone who picked 30 on purpose after the control ships — keeps it.
 * That makes it safe to re-run, and re-running is a no-op on the second pass.
 *
 *     npm run migrate:session-timeout            # from app/server
 *     npm run migrate:session-timeout -- --dry   # report only
 */
import prisma from '../lib/prisma';

const OLD_DEFAULT = 30;
const NEW_DEFAULT = 480;

async function main(): Promise<void> {
    const dryRun = process.argv.includes('--dry');

    const affected = await prisma.userSettings.count({ where: { sessionTimeout: OLD_DEFAULT } });
    const total = await prisma.userSettings.count();

    console.log(`user_settings rows: ${total}`);
    console.log(`holding the old default (${OLD_DEFAULT}): ${affected}`);

    if (!affected) {
        console.log('Nothing to do.');
        return;
    }

    if (dryRun) {
        console.log(`--dry: would set ${affected} row(s) to ${NEW_DEFAULT}.`);
        return;
    }

    const { count } = await prisma.userSettings.updateMany({
        where: { sessionTimeout: OLD_DEFAULT },
        data: { sessionTimeout: NEW_DEFAULT },
    });

    console.log(`Updated ${count} row(s) to ${NEW_DEFAULT} minutes.`);
}

main()
    .catch((err) => {
        console.error('migrate-session-timeout failed:', err);
        process.exitCode = 1;
    })
    .finally(() => void prisma.$disconnect());
