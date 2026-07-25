import type { FC, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
    FiActivity,
    FiAlertTriangle,
    FiArrowRight,
    FiCalendar,
    FiCheckCircle,
    FiMonitor,
    FiShield,
    FiTerminal,
    FiZap,
} from 'react-icons/fi';
import { Surface, AccentButton, Badge, AnimatedNumber } from '@/components/design-system';
import { fadeUp, scaleIn, stagger, inViewOnce } from '@/lib/motion';

/**
 * Public landing page — the only screen an unauthenticated visitor sees.
 *
 * No template exists for this page (`.agents/template/*` has no landing mockup),
 * so it is composed directly from the Luxe v2 vocabulary in
 * `.agents/design-system/design.md`: `Surface` for every card, motion only from
 * `@/lib/motion`, `react-icons/fi` for icons, and exactly one glowing accent
 * element per view — here, the primary "Create an account" CTA.
 *
 * Everything claimed below maps to a real endpoint. There is no invoicing
 * feature and no marketing fiction; see `.agents/docs/features.md`.
 */

// ── Section shell ─────────────────────────────────────────────
const Section: FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => (
    <motion.section
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        className={`mx-auto w-full max-w-6xl px-6 ${className}`}
    >
        {children}
    </motion.section>
);

const SectionHeading: FC<{ eyebrow: string; title: string; blurb?: string }> = ({ eyebrow, title, blurb }) => (
    <div className="flex flex-col gap-3 max-w-2xl">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
            {eyebrow}
        </span>
        <h2 className="text-3xl md:text-4xl font-bold font-heading text-brand-dark dark:text-white text-balance">
            {title}
        </h2>
        {blurb && <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">{blurb}</p>}
    </div>
);

// ── Feature data — one entry per real, shipped backend capability ──
interface Feature {
    icon: ReactNode;
    title: string;
    body: string;
    points: string[];
}

const FEATURES: Feature[] = [
    {
        icon: <FiAlertTriangle size={20} />,
        title: 'Bug tracker',
        body: 'Tickets with status, priority, assignee and reporter — updating live over websockets, not on a refresh timer.',
        points: ['Realtime board updates', 'Priority + status filters', 'OWASP category tagging'],
    },
    {
        icon: <FiTerminal size={20} />,
        title: 'Log management',
        body: 'Structured application logs with levels, sources and stack traces. Batch ingest for high-volume services.',
        points: ['Error / warning / info levels', 'Batch insert endpoint', '24-hour and 7-day rollups'],
    },
    {
        icon: <FiMonitor size={20} />,
        title: 'Console monitor',
        body: 'Point it at a running URL and it captures that browser console in real time — several sessions at once.',
        points: ['Live console capture', 'Per-session isolation', 'Owner-scoped access'],
    },
    {
        icon: <FiCalendar size={20} />,
        title: 'Notes & calendar',
        body: 'Rich notes — text, checklists, images, links — that roll up into a month view of what actually happened.',
        points: ['Four note types', 'Pinning, colours and tags', 'Month calendar view'],
    },
];

const PRINCIPLES = [
    {
        icon: <FiZap size={18} />,
        title: 'Realtime by default',
        body: 'Ticket changes arrive over a socket. No polling, no stale board, no manual refresh.',
    },
    {
        icon: <FiShield size={18} />,
        title: 'Roles that mean something',
        body: 'Admins manage users, publish documentation and hold the destructive actions. Everyone else gets a clean workspace.',
    },
    {
        icon: <FiActivity size={18} />,
        title: 'One workspace',
        body: 'Bugs, logs, notes and the calendar in a single surface — not four tools wearing a trench coat.',
    },
];

const Home: FC = () => (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg font-body">
        {/* ── Top bar ─────────────────────────────────────────── */}
        <header className="sticky top-0 z-40 border-b border-black/5 dark:border-white/10 bg-light-bg/80 dark:bg-dark-bg/80 backdrop-blur-xl">
            <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
                <Link to="/" className="flex items-center gap-2.5" aria-label="ApexOps home">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-dark dark:bg-brand-accent">
                        <FiActivity className="text-brand-accent dark:text-brand-dark" size={16} />
                    </span>
                    <span className="text-lg font-bold font-heading text-brand-dark dark:text-white">ApexOps</span>
                </Link>
                <div className="flex items-center gap-2">
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
            <motion.div variants={stagger(0.08)} initial="hidden" animate="show" className="flex flex-col items-start gap-7">
                <motion.div variants={fadeUp}>
                    <Badge tone="neutral">Bug &amp; log management for developers</Badge>
                </motion.div>

                <motion.h1
                    variants={fadeUp}
                    className="max-w-3xl text-4xl md:text-6xl font-bold font-heading leading-[1.08] tracking-tight text-brand-dark dark:text-white text-balance"
                >
                    Every bug, log and console error in{' '}
                    <span className="relative whitespace-nowrap">
                        one workspace
                        <span className="absolute inset-x-0 -bottom-1 h-3 -z-10 rounded-full bg-brand-accent/40" aria-hidden />
                    </span>
                    .
                </motion.h1>

                <motion.p variants={fadeUp} className="max-w-xl text-lg leading-relaxed text-gray-600 dark:text-gray-400">
                    ApexOps tracks tickets, collects structured logs, and captures a live browser console — so the thing
                    that broke and the record of it breaking live in the same place.
                </motion.p>

                <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-3">
                    {/* The single glowing element on this page — accent budget spent here. */}
                    <Link to="/register">
                        <AccentButton variant="accent" icon={<FiArrowRight size={16} />}>
                            Create an account
                        </AccentButton>
                    </Link>
                    <Link to="/login">
                        <AccentButton variant="ghost">Sign in</AccentButton>
                    </Link>
                </motion.div>

                {/* Capability strip — counts describe the product, not fake usage metrics. */}
                <motion.div variants={scaleIn} className="w-full pt-6">
                    <Surface variant="frost" radius="3xl" padding="lg">
                        <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                            {[
                                { label: 'Core modules', value: 4 },
                                { label: 'API endpoints', value: 38 },
                                { label: 'Realtime channels', value: 2 },
                                { label: 'Note types', value: 4 },
                            ].map((s) => (
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
            </motion.div>
        </Section>

        {/* ── Features ────────────────────────────────────────── */}
        <Section className="pb-20 md:pb-28">
            <div className="flex flex-col gap-10">
                <SectionHeading
                    eyebrow="What's inside"
                    title="Four modules, one mental model"
                    blurb="Each one is a real, shipped capability with a real API behind it — not a roadmap promise."
                />

                <motion.div
                    variants={stagger(0.07)}
                    initial="hidden"
                    whileInView="show"
                    viewport={inViewOnce}
                    className="grid gap-5 md:grid-cols-2"
                >
                    {FEATURES.map((f) => (
                        <motion.div key={f.title} variants={fadeUp}>
                            <Surface variant="panel" radius="2xl" padding="lg" interactive className="h-full">
                                <div className="flex h-full flex-col gap-4">
                                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-accent/20 text-brand-dark dark:text-brand-accent">
                                        {f.icon}
                                    </span>
                                    <div className="flex flex-col gap-2">
                                        <h3 className="text-xl font-bold font-heading text-brand-dark dark:text-white">
                                            {f.title}
                                        </h3>
                                        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">{f.body}</p>
                                    </div>
                                    <ul className="mt-auto flex flex-col gap-2 pt-2">
                                        {f.points.map((p) => (
                                            <li
                                                key={p}
                                                className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                                            >
                                                <FiCheckCircle
                                                    className="shrink-0 text-brand-dark/40 dark:text-brand-accent/70"
                                                    size={15}
                                                />
                                                {p}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </Surface>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </Section>

        {/* ── Principles ──────────────────────────────────────── */}
        <Section className="pb-20 md:pb-28">
            <Surface variant="dark" radius="3xl" padding="lg" className="overflow-hidden">
                <div className="flex flex-col gap-10 py-4">
                    <div className="flex flex-col gap-3 max-w-2xl">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
                            How it works
                        </span>
                        <h2 className="text-3xl md:text-4xl font-bold font-heading text-white text-balance">
                            Built for the moment something breaks
                        </h2>
                    </div>

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
                                <h3 className="text-lg font-semibold font-heading text-white">{p.title}</h3>
                                <p className="text-sm leading-relaxed text-gray-400">{p.body}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </Surface>
        </Section>

        {/* ── Closing CTA ─────────────────────────────────────── */}
        <Section className="pb-24">
            <Surface variant="frost" radius="3xl" padding="lg">
                <div className="flex flex-col items-start justify-between gap-6 py-4 md:flex-row md:items-center">
                    <div className="flex flex-col gap-2">
                        <h2 className="text-2xl md:text-3xl font-bold font-heading text-brand-dark dark:text-white">
                            Start tracking in a few minutes
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Create an account and land straight in your workspace.
                        </p>
                    </div>
                    <Link to="/register" className="shrink-0">
                        <AccentButton variant="dark" icon={<FiArrowRight size={16} />}>
                            Create an account
                        </AccentButton>
                    </Link>
                </div>
            </Surface>
        </Section>

        {/* ── Footer ──────────────────────────────────────────── */}
        <footer className="border-t border-black/5 dark:border-white/10">
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 sm:flex-row">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    ApexOps — bug &amp; log management for developers.
                </p>
                <Link
                    to="/design-system"
                    className="text-sm text-gray-500 hover:text-brand-dark dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                    Design system
                </Link>
            </div>
        </footer>
    </div>
);

export default Home;
