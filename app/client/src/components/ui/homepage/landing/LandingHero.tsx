import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { FiArrowRight, FiActivity, FiZap, FiShield } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi2';
import { Surface, StatTile, Badge } from '@/components/design-system';
import { fadeUp, scaleIn, stagger, EASE_LUX } from '@/lib/motion';

const TRUST = ['Vercel', 'Linear', 'Retool', 'Supabase', 'Raycast'];

const LandingHero: FC = () => {
    return (
        <section className="relative overflow-hidden px-4 pb-10 pt-14 sm:px-6 sm:pt-20">
            {/* ambient depth */}
            <div className="ds-mesh pointer-events-none absolute inset-0 -z-10" />
            <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[420px] w-[820px] max-w-full -translate-x-1/2 rounded-full bg-brand-accent/10 blur-[120px]" />

            <motion.div
                variants={stagger(0.08)}
                initial="hidden"
                animate="show"
                className="mx-auto flex max-w-4xl flex-col items-center text-center"
            >
                <motion.div variants={fadeUp}>
                    <Badge tone="neutral" className="gap-1.5 !px-3 !py-1 !text-[11px] backdrop-blur">
                        <HiSparkles className="h-3.5 w-3.5 text-brand-accent" />
                        Now with AI-assisted diagnostics
                    </Badge>
                </motion.div>

                <motion.h1
                    variants={fadeUp}
                    className="mt-6 font-heading text-5xl font-bold leading-[1.05] tracking-tight text-brand-dark dark:text-white sm:text-6xl md:text-7xl"
                >
                    Ship with clarity.
                    <br />
                    <span className="relative inline-block">
                        <span className="relative z-10">Debug at the speed of light.</span>
                        <span className="absolute inset-x-0 bottom-1 -z-0 h-3 rounded-full bg-brand-accent/60 sm:h-4" />
                    </span>
                </motion.h1>

                <motion.p
                    variants={fadeUp}
                    className="mt-6 max-w-2xl text-base leading-relaxed text-gray-600 dark:text-gray-300 sm:text-lg"
                >
                    ApexOps is the intelligent bug &amp; log platform for modern teams — monitor console
                    logs, triage issues JIRA-style, and visualize real-time application health from one
                    luxurious control room.
                </motion.p>

                <motion.div
                    variants={fadeUp}
                    className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:flex-row"
                >
                    <Link
                        to="/dashboard"
                        className="ds-glow inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-accent px-6 py-3.5 text-sm font-bold text-brand-dark transition hover:bg-brand-accentHover sm:w-auto"
                    >
                        Get started free
                        <FiArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                        to="/invoices"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white/60 px-6 py-3.5 text-sm font-semibold text-brand-dark shadow-sm transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 sm:w-auto"
                    >
                        View live demo
                    </Link>
                </motion.div>

                <motion.div variants={fadeUp} className="mt-12 w-full">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
                        Trusted by fast-moving engineering teams
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 opacity-70">
                        {TRUST.map((name) => (
                            <span
                                key={name}
                                className="font-heading text-lg font-semibold text-gray-500 dark:text-gray-400"
                            >
                                {name}
                            </span>
                        ))}
                    </div>
                </motion.div>
            </motion.div>

            {/* Frosted product preview — echoes the Invoices control room */}
            <motion.div
                variants={scaleIn}
                initial="hidden"
                animate="show"
                transition={{ delay: 0.25, duration: 0.6, ease: EASE_LUX }}
                className="mx-auto mt-14 max-w-5xl"
            >
                <Surface variant="frost" radius="3xl" padding="none" className="overflow-hidden p-2 sm:p-3">
                    <div className="rounded-[1.35rem] bg-brand-nearBlack2/[0.03] p-4 dark:bg-black/20 sm:p-6">
                        <div className="mb-5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full bg-red-400/80" />
                                <span className="h-3 w-3 rounded-full bg-amber-400/80" />
                                <span className="h-3 w-3 rounded-full bg-brand-accent" />
                            </div>
                            <Badge tone="accent">Live health</Badge>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <StatTile label="Uptime" value={99.98} decimals={2} suffix="%" trend={0.4} icon={<FiShield className="h-4 w-4" />} />
                            <StatTile label="p50 latency" value={12} suffix="ms" trend={-8} icon={<FiZap className="h-4 w-4" />} />
                            <StatTile label="Events / day" value={4200000} trend={12} icon={<FiActivity className="h-4 w-4" />} />
                        </div>

                        {/* mini lime timeline, invoices-style */}
                        <div className="mt-4 grid grid-cols-4 gap-3">
                            {[
                                { m: 'Mon', p: 100 },
                                { m: 'Tue', p: 72 },
                                { m: 'Wed', p: 48 },
                                { m: 'Thu', p: 30 },
                            ].map((c) => (
                                <div key={c.m} className="flex flex-col gap-2">
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                                        <div className="ds-stripe-fill h-full rounded-full" style={{ width: `${c.p}%` }} />
                                    </div>
                                    <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{c.m}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Surface>
            </motion.div>
        </section>
    );
};

export default LandingHero;
