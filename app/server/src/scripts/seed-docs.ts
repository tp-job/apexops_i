import fs from 'fs';
import path from 'path';
import prisma from '../lib/prisma';

/**
 * The one-time migration of `content/docs.tsx` into the database (F001, S9-D1).
 *
 * 929 lines of hand-authored JSX across eleven primitives is a conversion with
 * judgment in it, not a regex — so the original six bodies were converted by hand into
 * `docs-content/*.md` and are reviewed as a diff, page by page. This script only
 * does the part a script should do: read them and write the rows.
 *
 * **Idempotent by slug.** Re-running updates the seeded pages in place and
 * touches nothing else, so it is safe on an instance where an admin has already
 * created pages of their own. It never deletes.
 *
 *     npm run seed:docs                 # seed or refresh the seeded pages
 *     npm run seed:docs -- --force      # overwrite admin edits to those pages
 *
 * Without `--force` a page whose body has been edited since the seed is left
 * alone and reported: re-running a seed script should not be how someone's
 * afternoon of editing disappears.
 */

interface SeedPage {
    slug: string;
    title: string;
    group: string;
    groupOrder: number;
    order: number;
    summary: string;
}

/**
 * Order here is the order the rail had in `DOCS`: group order is order of first
 * appearance, page order is position within the array.
 */
const PAGES: SeedPage[] = [
    {
        slug: 'overview',
        title: 'Overview',
        group: 'Get started',
        groupOrder: 0,
        order: 0,
        summary: 'What ApexOps is, and how errors get from a browser into a tracked ticket.',
    },
    {
        slug: 'quickstart',
        title: 'Quickstart',
        group: 'Get started',
        groupOrder: 0,
        order: 1,
        summary: 'Report your first error in about two minutes.',
    },
    /**
     * `Using ApexOps` sits second, ahead of SDK and the API reference, which is
     * why those three groups renumber below.
     *
     * Every other page here is written for someone wiring up the SDK. None of
     * them answered "how do I use the app", and the gap showed: a user
     * concluded that notes had to be written twice, in two places, because
     * nothing said otherwise.
     *
     * This script never deletes, so retiring a page here leaves its published
     * row behind — unpublish it from `/admin/docs`.
     */
    {
        slug: 'tasks',
        title: 'Tasks',
        group: 'Using ApexOps',
        groupOrder: 1,
        order: 0,
        summary: 'Adding, filtering, rescheduling and completing tasks across every day.',
    },
    {
        slug: 'notes-and-calendar',
        title: 'Notes & Calendar',
        group: 'Using ApexOps',
        groupOrder: 1,
        order: 1,
        summary: 'One set of notes, two views. Scheduling, colours, the right-click menu, search and tags.',
    },
    {
        slug: 'projects-and-roles',
        title: 'Projects & roles',
        group: 'Using ApexOps',
        groupOrder: 1,
        order: 2,
        summary: 'What a project holds, who can do what, and the difference between archiving and deleting.',
    },
    {
        slug: 'sdk',
        title: 'Browser SDK',
        group: 'SDK',
        groupOrder: 2,
        order: 0,
        summary: 'Script tag configuration, capture behaviour and payload limits.',
    },
    {
        slug: 'grouping',
        title: 'Grouping & retention',
        group: 'Concepts',
        groupOrder: 3,
        order: 0,
        summary: 'How events collapse into issues, and how long raw events are kept.',
    },
    {
        slug: 'ingest-api',
        title: 'Ingest API',
        group: 'API reference',
        groupOrder: 4,
        order: 0,
        summary: 'The single public endpoint the SDK posts to. Key-authenticated, write-only.',
    },
    {
        slug: 'rest-api',
        title: 'REST API',
        group: 'API reference',
        groupOrder: 4,
        order: 1,
        summary: 'Session-authenticated endpoints for projects, issues and tickets.',
    },
];

const CONTENT_DIR = path.join(__dirname, 'docs-content');

async function main(): Promise<void> {
    const force = process.argv.includes('--force');
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const page of PAGES) {
        const body = fs.readFileSync(path.join(CONTENT_DIR, `${page.slug}.md`), 'utf8').trimEnd();
        const existing = await prisma.docPage.findUnique({ where: { slug: page.slug } });

        if (!existing) {
            // Seeded as PUBLISHED: this is the documentation that is live
            // today, so seeding them as drafts would take the public docs down
            // for as long as it took someone to notice.
            await prisma.docPage.create({ data: { ...page, body, status: 'published' } });
            created += 1;
            continue;
        }

        if (!force && existing.body !== body && existing.updatedById !== null) {
            console.warn(`  skipped ${page.slug} — edited by an admin since the seed (use --force to overwrite)`);
            skipped += 1;
            continue;
        }

        await prisma.docPage.update({ where: { slug: page.slug }, data: { ...page, body } });
        updated += 1;
    }

    console.log(`Docs seed complete: ${created} created, ${updated} updated, ${skipped} skipped.`);
}

main()
    .catch((err) => {
        console.error('Docs seed failed:', err);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
