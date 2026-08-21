import type { FC, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
    FiActivity,
    FiAlertTriangle,
    FiArrowRight,
    FiCalendar,
    FiCheckCircle,
    FiCpu,
    FiFolder,
    FiLayers,
    FiList,
    FiRadio,
    FiShield,
    FiZap,
} from 'react-icons/fi';
import { Surface, AccentButton, AnimatedNumber } from '@/components/design-system';
import { fadeUp, scaleIn, stagger, inViewOnce } from '@/lib/motion';
import {
    AuroraBackdrop,
    Magnet,
    Reveal,
    ShinyText,
    SplitText,
    SpotlightCard,
} from '@/components/landing/effects';

/**
 * Public landing page — the only screen an unauthenticated visitor sees.
 *
 * Composed from the Luxe v2 vocabulary (`.agents/design-system/design.md`):
 * `Surface` for every card, motion only from `@/lib/motion`, and exactly one
 * glowing element — the primary CTA.
 *
 * **The effects are ours, not a library's.** The entrance, spotlight, magnet and
 * backdrop in `components/landing/effects.tsx` follow the React Bits catalogue in
 * spirit while using this system's easing and palette, because a dropped-in
 * blue-violet aurora would break the two rules this page exists to demonstrate.
 *
 * **Every claim maps to something shipped.** The previous version promised
 * "realtime board updates" for the ticket board, which has not been true since
 * that socket hook was deleted — the *issue list* is what streams. Nothing here
 * describes a roadmap.
 */

// ── Section shell ─────────────────────────────────────────────
const Section: FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => (
    <section className={`mx-auto w-full max-w-6xl px-6 ${className}`}>{children}</section>
);

/**
 * `onDark` is for the one panel that is dark in BOTH themes (`Surface
 * variant="dark"`). Its text takes fixed light greys with no `dark:` sibling on
 * purpose — the ground never changes, so pairing them would be the bug. Measured
 * on that ground: gray-300 is 10.8:1 and gray-400 is 6.27:1, both past AA.
 */
const SectionHeading: FC<{ eyebrow: string; title: string; blurb?: string; onDark?: boolean }> = ({
    eyebrow,
    title,
    blurb,
    onDark,
}) => (
    <div className="flex max-w-2xl flex-col gap-3">
        <span
            className={`text-xs font-semibold uppercase tracking-[0.18em] ${
                onDark ? 'text-brand-accent' : 'text-gray-500 dark:text-gray-400'
            }`}
        >
            {eyebrow}
        </span>
        <h2
            className={`text-balance font-heading text-3xl font-bold md:text-4xl ${
                onDark ? 'text-white' : 'text-brand-dark dark:text-white'
            }`}
        >
            {title}
        </h2>
        {blurb && (
            <p className={`text-base leading-relaxed ${onDark ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}`}>
                {blurb}
            </p>
        )}
    </div>
);

// ── Content — one entry per shipped surface ───────────────────

interface Feature {
    icon: ReactNode;
    title: string;
    body: string;
    points: string[];
}

const FEATURES: Feature[] = [
    {
        icon: <FiAlertTriangle size={20} />,
        title: 'Error tracking',
        body: 'A script tag in your app, and every uncaught error arrives here — grouped, counted, and readable.',
        points: ['One row per distinct error', 'Live list that patches in place', 'Source-mapped stack traces'],
    },
    {
        icon: <FiCheckCircle size={20} />,
        title: 'Bug tracker',
        body: 'Promote an issue and it becomes a ticket carrying its culprit, count and latest stack across.',
        points: ['Status, priority, assignee, comments', 'Linked back to the issue it came from', 'Delete archives — restore anytime'],
    },
    {
        icon: <FiFolder size={20} />,
        title: 'Projects & roles',
        body: 'Each project owns its key, its capture levels, its retention window and its people.',
        points: ['Owner, admin, member', 'Rotate the ingest key instantly', 'Invite by email'],
    },
    {
        icon: <FiList size={20} />,
        title: 'Tasks',
        body: 'Everything planned, across every day, on one page — with overdue meaning a real deadline that passed.',
        points: ['To do, overdue, done', 'Reschedule without leaving the list', 'Search across every day'],
    },
    {
        icon: <FiCalendar size={20} />,
        title: 'Notes & calendar',
        body: 'One set of notes, two views. Schedule a note onto a future day and the calendar becomes a plan.',
        points: ['Rich editor everywhere', 'Colours, tags and pinning', 'Days resolve in your timezone'],
    },
    {
        icon: <FiCpu size={20} />,
        title: 'AI assistant',
        body: 'A panel on every page, running on your own provider key — validated before it is stored, encrypted at rest.',
        points: ['Bring your own key', 'Never returned unmasked', 'Your quota, your control'],
    },
];

const PIPELINE = [
    { step: '01', title: 'Capture', body: 'The SDK batches uncaught errors and posts them to one write-only endpoint.' },
    { step: '02', title: 'Group', body: 'Identical errors collapse by fingerprint. A thousand occurrences is one row with a count.' },
    { step: '03', title: 'Triage', body: 'Resolve, ignore, or promote. A resolved error that returns comes back as a regression.' },
    { step: '04', title: 'Ship', body: 'Promotion opens a ticket carrying the stack, the count and where it came from.' },
];

const PRINCIPLES = [
    {
        icon: <FiRadio size={18} />,
        title: 'Live where it counts',
        body: 'The issue list streams and patches itself. Its badge reads live, reconnecting or offline — and never claims live over a dead connection.',
    },
    {
        icon: <FiShield size={18} />,
        title: 'Permissions that hold',
        body: 'Roles are re-read from the database on every request, so a demotion takes effect on the next click rather than when a token expires.',
    },
    {
        icon: <FiLayers size={18} />,
        title: 'One workspace',
        body: 'Issues, tickets, tasks, notes and the calendar in a single surface — not four tools wearing a trench coat.',
    },
];

/** Measured from the repository, not rounded up for a landing page. */
const STATS = [
    { label: 'API routes', value: 105 },
    { label: 'Data models', value: 20 },
    { label: 'App screens', value: 25 },
    { label: 'UI primitives', value: 29 },
];

const Home: FC = () => (
    <div className="relative min-h-screen bg-light-bg font-body dark:bg-dark-bg">
        <AuroraBackdrop />

        {/* ── Top bar ─────────────────────────────────────────── */}
        <header className="sticky top-0 z-40 border-b border-black/5 bg-light-bg/70 backdrop-blur-xl dark:border-white/10 dark:bg-dark-bg/70">
            <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
                <Link to="/" className="flex items-center gap-2.5" aria-label="ApexOps home">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-dark dark:bg-brand-accent">
                        <FiActivity className="text-brand-accent dark:text-brand-dark" size={16} />
                    </span>
                    <span className="font-heading text-lg font-bold text-brand-dark dark:text-white">ApexOps</span>
                </Link>
                <div className="flex items-center gap-2">
                    <Link
                        to="/docs/how-to-use"
                        className="hidden px-3 text-sm text-gray-600 transition-colors hover:text-brand-dark sm:block dark:text-gray-300 dark:hover:text-white"
                    >
                        Docs
                    </Link>
                    <Link to="/login">
                        <AccentButton variant="ghost" size="sm">
                            Sign in
                        </AccentButton>
                    </Link>
                    <Link to="/register" className="hidden sm:block">
                        <AccentButton variant="dark" size="sm">
                            Get started
                        </AccentButton>
                    </Link>
                </div>
            </nav>
        </header>

        {/* ── Hero ────────────────────────────────────────────── */}
        <Section className="pt-16 pb-20 md:pt-24 md:pb-28">
            <div className="flex flex-col items-start gap-7">
                <motion.span
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="rounded-full border border-black/10 bg-white/60 px-3 py-1 backdrop-blur dark:border-white/15 dark:bg-white/5"
                >
                    <ShinyText className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-600 dark:text-gray-300">
                        Error tracking &amp; workspace for small teams
                    </ShinyText>
                </motion.span>

                <h1 className="max-w-4xl text-balance font-heading text-4xl font-bold leading-[1.08] tracking-tight text-brand-dark md:text-6xl dark:text-white">
                    <SplitText text="Every error, from the browser it broke in" />{' '}
                    <span className="relative whitespace-nowrap">
                        <SplitText text="to the ticket that fixes it" delay={0.32} />
                        <span
                            aria-hidden
                            className="absolute inset-x-0 -bottom-1 -z-10 h-3 rounded-full bg-brand-accent/40"
                        />
                    </span>
                    .
                </h1>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.55 }}
                    className="max-w-xl text-lg leading-relaxed text-gray-600 dark:text-gray-400"
                >
                    One script tag, and the thing that broke and the record of it breaking live in the same place —
                    grouped, counted, source-mapped, and one click from being work someone owns.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.68 }}
                    className="flex flex-wrap items-center gap-3"
                >
                    {/* The single glowing element on this page — the accent budget,
                        spent once, on the one action this page is asking for. */}
                    <Magnet>
                        <Link to="/register">
                            <AccentButton variant="accent" icon={<FiArrowRight size={16} />}>
                                Create an account
                            </AccentButton>
                        </Link>
                    </Magnet>
                    <Link to="/docs/how-to-use">
                        <AccentButton variant="ghost">See how it works</AccentButton>
                    </Link>
                </motion.div>

                {/* Counts that describe the product, not invented usage metrics. */}
                <motion.div variants={scaleIn} initial="hidden" animate="show" className="w-full pt-6">
                    <Surface variant="frost" radius="3xl" padding="lg">
                        <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                            {STATS.map((s) => (
                                <div key={s.label} className="flex flex-col gap-1">
                                    <dt className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {s.label}
                                    </dt>
                                    <dd className="font-numbers text-3xl font-bold text-brand-dark dark:text-white">
                                        <AnimatedNumber value={s.value} />
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </Surface>
                </motion.div>
            </div>
        </Section>

        {/* ── The pipeline ────────────────────────────────────── */}
        <Section className="pb-20 md:pb-28">
            <div className="flex flex-col gap-10">
                <Reveal>
                    <SectionHeading
                        eyebrow="The loop"
                        title="Four steps from thrown to fixed"
                        blurb="The product is this loop. Everything else exists around it."
                    />
                </Reveal>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {PIPELINE.map((p, i) => (
                        <Reveal key={p.step} delay={i * 0.07}>
                            <Surface variant="panel" radius="2xl" padding="lg" className="h-full">
                                <div className="flex h-full flex-col gap-3">
                                    <span className="font-numbers text-2xl font-bold text-brand-accent">{p.step}</span>
                                    <h3 className="font-heading text-lg font-bold text-brand-dark dark:text-white">
                                        {p.title}
                                    </h3>
                                    <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">{p.body}</p>
                                </div>
                            </Surface>
                        </Reveal>
                    ))}
                </div>
            </div>
        </Section>

        {/* ── Features ────────────────────────────────────────── */}
        <Section className="pb-20 md:pb-28">
            <div className="flex flex-col gap-10">
                <Reveal>
                    <SectionHeading
                        eyebrow="What's inside"
                        title="Six surfaces, one mental model"
                        blurb="Each one is shipped and reachable today, with a real API behind it — not a roadmap promise."
                    />
                </Reveal>

                <motion.div
                    variants={stagger(0.07)}
                    initial="hidden"
                    whileInView="show"
                    viewport={inViewOnce}
                    className="grid gap-5 md:grid-cols-2 lg:grid-cols-3"
                >
                    {FEATURES.map((f) => (
                        <motion.div key={f.title} variants={fadeUp}>
                            <SpotlightCard className="h-full rounded-2xl">
                                <Surface variant="panel" radius="2xl" padding="lg" className="h-full">
                                    <div className="flex h-full flex-col gap-4">
                                        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-accent/20 text-brand-dark dark:text-brand-accent">
                                            {f.icon}
                                        </span>
                                        <div className="flex flex-col gap-2">
                                            <h3 className="font-heading text-xl font-bold text-brand-dark dark:text-white">
                                                {f.title}
                                            </h3>
                                            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                                                {f.body}
                                            </p>
                                        </div>
                                        <ul className="mt-auto flex flex-col gap-2 pt-2">
                                            {f.points.map((point) => (
                                                <li
                                                    key={point}
                                                    className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                                                >
                                                    <FiCheckCircle
                                                        className="shrink-0 text-brand-dark/40 dark:text-brand-accent/70"
                                                        size={15}
                                                    />
                                                    {point}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </Surface>
                            </SpotlightCard>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </Section>

        {/* ── Principles ──────────────────────────────────────── */}
        <Section className="pb-20 md:pb-28">
            <Reveal>
                <Surface variant="dark" radius="3xl" padding="lg" className="overflow-hidden">
                    <div className="flex flex-col gap-10 py-4">
                        <SectionHeading
                            eyebrow="How it behaves"
                            title="Built for the moment something breaks"
                            onDark
                        />

                        <motion.div
                            variants={stagger(0.07)}
                            initial="hidden"
                            whileInView="show"
                            viewport={inViewOnce}
                            className="grid gap-8 md:grid-cols-3"
                        >
                            {PRINCIPLES.map((p) => (
                                <motion.div key={p.title} variants={fadeUp} className="flex flex-col gap-3">
                                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-brand-accent">
                                        {p.icon}
                                    </span>
                                    <h3 className="font-heading text-lg font-semibold text-white">{p.title}</h3>
                                    {/* Fixed grey, no `dark:` pair — see SectionHeading's note:
                                        this panel is dark in both themes. */}
                                    <p className="text-sm leading-relaxed text-gray-400">{p.body}</p>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </Surface>
            </Reveal>
        </Section>

        {/* ── Closing CTA ─────────────────────────────────────── */}
        <Section className="pb-24">
            <Reveal>
                <Surface variant="frost" radius="3xl" padding="lg">
                    <div className="flex flex-col items-start justify-between gap-6 py-4 md:flex-row md:items-center">
                        <div className="flex flex-col gap-2">
                            <h2 className="font-heading text-2xl font-bold text-brand-dark md:text-3xl dark:text-white">
                                Start tracking in a few minutes
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Create an account, make a project, paste one script tag.
                            </p>
                        </div>
                        <Magnet className="shrink-0">
                            <Link to="/register">
                                <AccentButton variant="dark" icon={<FiZap size={16} />}>
                                    Create an account
                                </AccentButton>
                            </Link>
                        </Magnet>
                    </div>
                </Surface>
            </Reveal>
        </Section>

        {/* ── Footer ──────────────────────────────────────────── */}
        <footer className="border-t border-black/5 dark:border-white/10">
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 sm:flex-row">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    ApexOps — error tracking and a workspace for the team that fixes it.
                </p>
                <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
                    <Link to="/docs/how-to-use" className="transition-colors hover:text-brand-dark dark:hover:text-white">
                        How to use
                    </Link>
                    <Link to="/docs/features" className="transition-colors hover:text-brand-dark dark:hover:text-white">
                        Features
                    </Link>
                    <Link to="/docs/design-system" className="transition-colors hover:text-brand-dark dark:hover:text-white">
                        Design system
                    </Link>
                    <Link to="/design-system" className="transition-colors hover:text-brand-dark dark:hover:text-white">
                        Style guide
                    </Link>
                </nav>
            </div>
        </footer>
    </div>
);

export default Home;
