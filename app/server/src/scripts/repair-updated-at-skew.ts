/**
 * One-off repair for the `+7h updated_at` skew.
 *
 * Until `lib/prisma.ts` pinned the session timezone to UTC, every Prisma
 * `@updatedAt` write landed in the database shifted forward by the session's
 * UTC offset — see the comment in that file for the mechanism. Rows written
 * only by an INSERT are correct, because Prisma serialises those differently;
 * the skew is introduced exclusively by UPDATE.
 *
 * **The detection rule.** An INSERT sets `created_at` and `updated_at` from the
 * same value, so an untouched row has them exactly equal. A skewed row was
 * written as `true_update_time + offset`, and since `true_update_time` is never
 * earlier than `created_at`, a skewed row always satisfies
 * `updated_at >= created_at + offset`. That inequality — not merely
 * `updated_at <> created_at` — is the rule this script uses.
 *
 * **Why the looser rule was wrong.** A first draft matched every row where the
 * two columns merely differed. A safety check found six rows that would have
 * been pushed *before* their own `created_at`, which is impossible for a genuine
 * skew and therefore proof those rows were never skewed at all — something wrote
 * them with correct UTC (a seed using raw SQL, most likely). The loose rule
 * would have corrupted them in the opposite direction while claiming to repair
 * them. The inequality excludes them by construction, and the script re-checks
 * for inversions before writing regardless.
 *
 * **The one case this cannot resolve.** A row legitimately updated more than
 * `offset` hours after it was created is indistinguishable from a skewed one.
 * Every UPDATE that went through Prisma was skewed, so treating those as skewed
 * is right far more often than not — but it is an inference, not a proof, and it
 * is the only part of this repair that is.
 *
 * Bangkok has no daylight saving, so the offset is a constant +7 and does not
 * need to be resolved per row. On a database that has moved between offsets,
 * check before trusting this.
 *
 * **This script is NOT idempotent, and it guards itself.** After a successful
 * repair, rows that were genuinely updated more than `offset` hours after they
 * were created still satisfy the detection rule — a row created on the 4th and
 * edited on the 16th is still twelve days apart once seven hours come off. A
 * second run would happily subtract another seven. So the script records each
 * applied run in `_timestamp_repairs` and refuses to write again unless
 * `--force` is passed. Do not remove that guard.
 *
 * Dry run by default. Pass `--apply` to write, `--offset=<hours>` to override.
 *
 *   npx ts-node -T src/scripts/repair-updated-at-skew.ts
 *   npx ts-node -T src/scripts/repair-updated-at-skew.ts --apply
 */

import { PrismaClient } from '@prisma/client';
import prisma from '../lib/prisma';

const APPLY = process.argv.includes('--apply');
const offsetArg = process.argv.find((a) => a.startsWith('--offset='));

interface TableRow { table_name: string }
interface CountRow { n: bigint }
interface SampleRow { created_at: Date; updated_at: Date }

/**
 * The offset the corruption was written with is the database's timezone as it
 * was *before* `lib/prisma.ts` started pinning the session to UTC.
 *
 * It cannot be read through the shared client: that connection sets the
 * timezone itself, so `pg_settings` reports `UTC` for `setting`, `reset_val`
 * *and* source `client` — the original value is simply not visible from inside
 * a session that overrode it. So this opens one deliberately unpinned
 * connection against the raw `DATABASE_URL` to ask what the server would have
 * used on its own.
 */
async function resolveOffsetHours(): Promise<number> {
    if (offsetArg) return Number(offsetArg.split('=')[1]);

    const plain = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
    try {
        const [{ tz }] = await plain.$queryRawUnsafe<Array<{ tz: string }>>(
            `select current_setting('TimeZone') as tz`,
        );
        const [{ h }] = await plain.$queryRawUnsafe<Array<{ h: number }>>(
            `select extract(epoch from (now() at time zone $1) - (now() at time zone 'UTC')) / 3600 as h`,
            tz,
        );
        console.log(`server default timezone: ${tz}`);
        return Math.round(Number(h));
    } finally {
        await plain.$disconnect();
    }
}

/** Records applied runs so a second one cannot silently shift the data again. */
async function ensureLedger(): Promise<number> {
    await prisma.$executeRawUnsafe(
        `create table if not exists _timestamp_repairs (
            id serial primary key,
            ran_at timestamptz not null default now(),
            offset_hours int not null,
            rows_affected int not null
         )`,
    );
    const [{ n }] = await prisma.$queryRawUnsafe<CountRow[]>(
        `select count(*)::bigint as n from _timestamp_repairs`,
    );
    return Number(n);
}

async function main(): Promise<void> {
    const hours = await resolveOffsetHours();
    const priorRuns = await ensureLedger();

    if (priorRuns > 0) {
        const past = await prisma.$queryRawUnsafe<Array<{ ran_at: Date; offset_hours: number; rows_affected: number }>>(
            `select ran_at, offset_hours, rows_affected from _timestamp_repairs order by ran_at`,
        );
        console.log('This repair has already been applied:');
        for (const r of past) {
            console.log(`  ${r.ran_at.toISOString()}  offset=${r.offset_hours}h  rows=${r.rows_affected}`);
        }
        if (APPLY && !process.argv.includes('--force')) {
            console.log('');
            console.log('Refusing to write again — a second pass would subtract another offset');
            console.log('from rows that were legitimately edited hours after they were created.');
            console.log('Pass --force only if you are certain a fresh skew was introduced.');
            return;
        }
        console.log('');
    }

    console.log(`mode   : ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'}`);
    console.log(`offset : ${hours}h will be subtracted from skewed rows\n`);

    if (hours === 0) {
        console.log('Offset is zero — nothing to repair.');
        return;
    }

    // Every table carrying both columns, rather than a hardcoded list, so a
    // model added later is not silently missed.
    const tables = await prisma.$queryRawUnsafe<TableRow[]>(
        `select c1.table_name
           from information_schema.columns c1
           join information_schema.columns c2
             on c1.table_name = c2.table_name and c2.column_name = 'updated_at'
          where c1.table_schema = 'public' and c1.column_name = 'created_at'
          order by c1.table_name`,
    );

    // Skewed rows satisfy this; rows written with correct UTC cannot.
    const WHERE = `updated_at >= created_at + make_interval(hours => ${hours})`;

    let grand = 0;
    let skippedTotal = 0;
    for (const { table_name: t } of tables) {
        const [{ n }] = await prisma.$queryRawUnsafe<CountRow[]>(
            `select count(*)::bigint as n from "${t}" where ${WHERE}`,
        );
        // Rows that differ but are NOT skewed — reported so the exclusion is
        // visible rather than silently swallowed.
        const [{ n: sk }] = await prisma.$queryRawUnsafe<CountRow[]>(
            `select count(*)::bigint as n from "${t}" where updated_at <> created_at and not (${WHERE})`,
        );
        const skewed = Number(n);
        const skipped = Number(sk);
        skippedTotal += skipped;
        if (skewed === 0) {
            console.log(`  ${t.padEnd(18)} clean${skipped ? `   (${skipped} already correct)` : ''}`);
            continue;
        }

        // A skewed row can never move before its own creation. If one would,
        // the rule is wrong for this database and nothing should be written.
        const [{ n: inv }] = await prisma.$queryRawUnsafe<CountRow[]>(
            `select count(*)::bigint as n from "${t}"
              where ${WHERE} and updated_at - make_interval(hours => ${hours}) < created_at`,
        );
        if (Number(inv) > 0) {
            throw new Error(`${t}: ${inv} row(s) would invert — refusing to write. Investigate before repairing.`);
        }

        const sample = await prisma.$queryRawUnsafe<SampleRow[]>(
            `select created_at, updated_at from "${t}" where ${WHERE} order by updated_at desc limit 1`,
        );
        const before = sample[0].updated_at.toISOString();
        const after = new Date(sample[0].updated_at.getTime() - hours * 3600_000).toISOString();

        if (APPLY) {
            await prisma.$executeRawUnsafe(
                `update "${t}" set updated_at = updated_at - make_interval(hours => ${hours}) where ${WHERE}`,
            );
        }
        console.log(`  ${t.padEnd(18)} ${String(skewed).padStart(5)} rows   e.g. ${before} -> ${after}${skipped ? `   (${skipped} already correct, skipped)` : ''}`);
        grand += skewed;
    }

    console.log(`\n${grand} row(s) ${APPLY ? 'repaired' : 'would be repaired'}.`);
    if (!APPLY) console.log('Re-run with --apply to write.');
    else console.log('Verify: no row should now have updated_at in the future.');
}

main()
    .catch((err) => { console.error(err); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
