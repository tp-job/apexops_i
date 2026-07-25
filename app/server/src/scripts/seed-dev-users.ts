/**
 * Creates the two local accounts the dev role switcher signs into.
 *
 * Deliberately a **CLI script, not an HTTP route.** An endpoint that mints an
 * admin account is a backdoor the moment someone forgets to gate it, or gates it
 * on a header an attacker controls. A script can only be run by someone who
 * already has a shell on the machine and the database credentials — which is a
 * boundary that can't be tricked.
 *
 *   npm run seed:dev --workspace app/server
 *
 * Safe to re-run: both accounts are upserted, and an existing account's role and
 * password are reset to the known values so a half-poked local database heals
 * instead of drifting.
 *
 * These accounts are *not* secret and are not meant to be. They exist so a
 * developer can flip between a normal user and an admin without keeping two
 * browser profiles open. Their whole security model is "this only ever runs
 * against a local database" — which is why the guard below is a hard exit and not
 * a warning.
 */
// Must come first: `lib/prisma` constructs the client on import and needs
// DATABASE_URL already in the environment. `server.ts` normally does this.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';

/** Meets `passwordSchema` in `../schemas/auth.schema.ts`: 8+, upper, lower, digit. */
const DEV_PASSWORD = 'DevPass123';

const DEV_ACCOUNTS = [
    {
        email: 'dev.user@apexops.local',
        firstName: 'Dev',
        lastName: 'User',
        role: 'user',
        position: 'Developer (seeded)',
    },
    {
        email: 'dev.admin@apexops.local',
        firstName: 'Dev',
        lastName: 'Admin',
        role: 'admin',
        position: 'Developer (seeded)',
    },
] as const;

function assertNotProduction(): void {
    if (process.env.NODE_ENV === 'production') {
        console.error(
            '\n✖ Refusing to run: NODE_ENV=production.\n' +
                '  This script creates accounts with a published password and an admin role.\n' +
                '  It exists for local development only.\n'
        );
        process.exit(1);
    }

    // A local NODE_ENV says nothing about where DATABASE_URL points. Catch the
    // genuinely dangerous case — someone running this with a remote database in
    // their env — before it creates an admin on a shared box.
    const url = process.env.DATABASE_URL ?? '';
    const host = url.match(/@([^:/?]+)/)?.[1] ?? '';
    const isLocal = ['localhost', '127.0.0.1', '::1', 'db', ''].includes(host);
    if (!isLocal) {
        console.error(
            `\n✖ Refusing to run: DATABASE_URL points at "${host}", which is not local.\n` +
                '  Seeding a known-password admin into a shared database is not something\n' +
                '  this script will do. Point DATABASE_URL at your local Postgres first.\n'
        );
        process.exit(1);
    }
}

async function main(): Promise<void> {
    assertNotProduction();

    const hashed = bcrypt.hashSync(DEV_PASSWORD, 10);

    for (const account of DEV_ACCOUNTS) {
        const user = await prisma.user.upsert({
            where: { email: account.email },
            // Reset role and password on re-run: the point of these accounts is that
            // they are always in a known state.
            update: {
                password: hashed,
                role: account.role,
                isActive: true,
                firstName: account.firstName,
                lastName: account.lastName,
            },
            create: {
                email: account.email,
                password: hashed,
                role: account.role,
                firstName: account.firstName,
                lastName: account.lastName,
                position: account.position,
                emailVerified: true,
            },
            select: { id: true, email: true, role: true },
        });

        // Settings are created by /register but not by a direct insert; without this
        // the seeded accounts differ from real ones in a way that bites later.
        await prisma.userSettings.upsert({
            where: { userId: user.id },
            update: {},
            create: { userId: user.id },
        });

        console.log(`✔ ${user.email.padEnd(26)} role=${user.role}  (id ${user.id})`);
    }

    console.log(`\nPassword for both: ${DEV_PASSWORD}`);
    console.log('The in-app dev role switcher (bottom-left, dev builds only) signs into both.\n');
}

main()
    .catch((err) => {
        console.error('Seeding failed:', err);
        process.exit(1);
    })
    .finally(() => {
        void prisma.$disconnect();
    });
