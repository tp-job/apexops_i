/**
 * Step 2 of the three-step migration that makes `Ticket.projectId` required.
 *
 *   1. `npm run db:push --workspace app/server`   (projectId is Int?  — nullable)
 *   2. `npm run backfill:projects --workspace app/server`   ← this script
 *   3. flip `projectId Int?` → `projectId Int` in schema.prisma, push again
 *
 * The dance exists because this repo uses `prisma db push` with no migrations
 * directory (see the Sprint 1 notes). Adding a NOT NULL column in one shot fails
 * on any existing row, and every ticket the Bug Tracker already created is an
 * existing row. Doing it now, while the table is small, costs one script; doing
 * it after real multi-project data exists has no correct answer, because you
 * cannot infer which project an orphan ticket belonged to.
 *
 * Safe to re-run. It only ever touches tickets whose projectId is still null, and
 * the Default project is upserted by slug.
 */
// Must come first: `lib/prisma` constructs the client on import and needs
// DATABASE_URL already in the environment. `server.ts` normally does this.
import 'dotenv/config';
import prisma from '../lib/prisma';
import { ProjectRole } from '@prisma/client';
import { generateUniqueIngestKey } from '../lib/projectKeys';

const DEFAULT_SLUG = 'default';
const DEFAULT_NAME = 'Default';

/**
 * The null-targeting queries below are raw SQL on purpose.
 *
 * `projectId` is NOT NULL in the final schema, so `{ projectId: null }` is
 * rejected twice over: the generated types refuse it at compile time, and the
 * query engine refuses it at runtime. But this script exists precisely to run
 * against the *intermediate* state where the column is still nullable — the
 * schema it targets and the schema it is compiled against are different by
 * design, and no amount of casting bridges the runtime half of that.
 *
 * Raw SQL sidesteps both checks and, usefully, keeps the script a clean no-op
 * once step 3 has run: the column is NOT NULL, so the count is simply 0.
 */
const countUnscoped = async (): Promise<number> => {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count FROM tickets WHERE project_id IS NULL
    `;
    return Number(rows[0]?.count ?? 0);
};

async function main(): Promise<void> {
    const orphanCount = await countUnscoped();

    // The owner has to be a real user — `Project.ownerId` is a required FK. The
    // oldest account is the closest thing to "whoever set this instance up".
    const owner = await prisma.user.findFirst({ orderBy: { id: 'asc' }, select: { id: true, email: true } });
    if (!owner) {
        console.error(
            '\n✖ No users exist, so there is nobody to own the Default project.\n' +
                '  Register an account (or run `npm run seed:dev --workspace app/server`) first.\n'
        );
        process.exit(1);
    }

    const existing = await prisma.project.findUnique({ where: { slug: DEFAULT_SLUG }, select: { id: true } });

    // `generateUniqueIngestKey` is only called when actually creating, so a re-run
    // does not churn the key of a project people may already have embedded.
    const project = existing
        ? await prisma.project.update({ where: { id: existing.id }, data: {}, select: { id: true, name: true, slug: true } })
        : await prisma.project.create({
              data: {
                  name: DEFAULT_NAME,
                  slug: DEFAULT_SLUG,
                  ingestKey: await generateUniqueIngestKey(),
                  ownerId: owner.id,
                  members: { create: { userId: owner.id, role: 'owner' } },
              },
              select: { id: true, name: true, slug: true },
          });

    console.log(`✔ Project "${project.name}" (/${project.slug}) id=${project.id}, owner ${owner.email}`);

    // Every existing account joins the Default project. This is a one-time
    // migration convenience, not the sharing model: without it, everyone except
    // the oldest account loses access to tickets they could see yesterday, which
    // reads as data loss. Projects created from here on are owner-only.
    const users = await prisma.user.findMany({ select: { id: true } });
    await prisma.projectMember.createMany({
        data: users.map((u) => ({
            projectId: project.id,
            userId: u.id,
            role: u.id === owner.id ? ProjectRole.owner : ProjectRole.member,
        })),
        skipDuplicates: true,
    });
    console.log(`✔ ${users.length} existing user(s) are members of "${project.name}"`);

    const count = await prisma.$executeRaw`
        UPDATE tickets SET project_id = ${project.id} WHERE project_id IS NULL
    `;

    console.log(`✔ Backfilled ${count} of ${orphanCount} unscoped ticket(s)`);

    // Verify before telling anyone it is safe to make the column required. If this
    // is non-zero, step 3 will fail — better to say so here than to hit an opaque
    // push error two commands later.
    const remaining = await countUnscoped();
    if (remaining > 0) {
        console.error(`\n✖ ${remaining} ticket(s) still have no project. Do NOT make projectId required yet.\n`);
        process.exit(1);
    }

    console.log('\nAll tickets are scoped. Safe to flip `projectId Int?` → `projectId Int` and push again.\n');
}

main()
    .catch((err) => {
        console.error('Backfill failed:', err);
        process.exit(1);
    })
    .finally(() => {
        void prisma.$disconnect();
    });
