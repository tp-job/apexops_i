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
 *
 * **Retiring a page unpublishes it; it never deletes it.** A slug that leaves
 * `PAGES` used to leave its published row behind, live at `/docs/<slug>`, saying
 * something the product no longer does — the comment below `Using ApexOps` said
 * so and left the fix as a manual chore nobody was reminded to do. `RETIRED`
 * closes that: seeding takes the page off the public route and leaves the row
 * in `/admin/docs`, where deleting is a deliberate human act with a confirm
 * dialog in front of it. A seed script is the wrong place to destroy content —
 * it runs unattended, and an admin may have rewritten that page since.
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
     * Retiring a page means moving its slug from `PAGES` to `RETIRED` below —
     * that unpublishes the row on the next seed rather than leaving it live.
     */
    {
        slug: 'how-to-use',
        title: 'How to use ApexOps',
        group: 'Get started',
        groupOrder: 0,
        order: 2,
        summary: 'The whole loop once: install the snippet, read the error, decide, and turn it into work.',
    },
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
        slug: 'features',
        title: 'Features',
        group: 'Using ApexOps',
        groupOrder: 1,
        order: 3,
        summary: 'Every surface in the product, what it does, and what it deliberately does not do.',
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
        slug: 'design-system',
        title: 'Design system',
        group: 'Design',
        groupOrder: 4,
        order: 0,
        summary: 'The six laws, the palette, type, radius, elevation and motion — and where to see them running.',
    },
    {
        slug: 'ingest-api',
        title: 'Ingest API',
        group: 'API reference',
        groupOrder: 5,
        order: 0,
        summary: 'The single public endpoint the SDK posts to. Key-authenticated, write-only.',
    },
    {
        slug: 'rest-api',
        title: 'REST API',
        group: 'API reference',
        groupOrder: 5,
        order: 1,
        summary: 'Session-authenticated endpoints for projects, issues and tickets.',
    },
];

/**
 * Pages that were seeded once and are no longer part of the documentation.
 *
 * Each entry carries the reason, because the next reader's question is always
 * *"why is this here and can I delete it?"* — and the honest answer is a
 * sentence, not a slug.
 */
interface RetiredPage {
    slug: string;
    /** Why it went, and where its content lives now. */
    reason: string;
}

const RETIRED: RetiredPage[] = [
    {
        slug: 'daily-notes',
        reason: "the /daily page it documented was folded into /notes and /tasks (notes-ssot blueprint phase 3.5); 'tasks' replaces it",
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

    let retired = 0;
    for (const page of RETIRED) {
        const existing = await prisma.docPage.findUnique({
            where: { slug: page.slug },
            select: { id: true, status: true, title: true },
        });

        // Never seeded here, or already gone: nothing to do, and nothing to say.
        if (!existing) continue;

        if (existing.status !== 'published') {
            console.log(`  already retired ${page.slug} — ${existing.status}`);
            continue;
        }

        await prisma.docPage.update({ where: { id: existing.id }, data: { status: 'draft' } });
        console.log(`  unpublished ${page.slug} — ${page.reason}`);
        retired += 1;
    }

    console.log(
        `Docs seed complete: ${created} created, ${updated} updated, ${skipped} skipped, ${retired} unpublished.`
    );
    if (retired) {
        // Said once, at the end, rather than per page: the row is recoverable and
        // deleting it is a decision, not a cleanup step this script should take.
        console.log('  Retired pages are drafts, not deletions — remove them for good from /admin/docs.');
    }
}

main()
    .catch((err) => {
        console.error('Docs seed failed:', err);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
