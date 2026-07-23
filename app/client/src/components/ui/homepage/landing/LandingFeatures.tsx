import type { FC } from 'react';
import { motion } from 'motion/react';
import {
    FiFileText,
    FiCpu,
    FiAlertTriangle,
    FiActivity,
    FiColumns,
    FiCalendar,
} from 'react-icons/fi';
import { Surface, Badge } from '@/components/design-system';
import { fadeUp, stagger, inViewOnce } from '@/lib/motion';

const FEATURES = [
    {
        icon: FiFileText,
        title: 'Log Management',
        body: 'Stream, search, and structure console logs in real time with instant filtering and retention you control.',
    },
    {
        icon: FiCpu,
        title: 'AI Diagnostics',
        body: 'Let ApexOps read the stack trace for you — root-cause suggestions and fixes surfaced the moment things break.',
    },
    {
        icon: FiAlertTriangle,
        title: 'Error Tracking',
        body: 'Group, dedupe, and prioritize exceptions with severity-aware alerts that reach the right engineer fast.',
    },
    {
        icon: FiColumns,
        title: 'JIRA-style Tickets',
        body: 'Turn any bug into a tracked ticket on a fluid board — assign, label, and move from open to shipped.',
    },
    {
        icon: FiActivity,
        title: 'Real-time Health',
        body: 'A live control room for uptime, latency, and throughput — see the pulse of every service at a glance.',
    },
    {
        icon: FiCalendar,
        title: 'Notes & Calendar',
        body: 'Capture incident notes and plan optimization sprints without ever leaving your workspace.',
    },
];

const LandingFeatures: FC = () => {
    return (
        <section id="features" className="scroll-mt-24 px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-6xl">
                <div className="mx-auto max-w-2xl text-center">
                    <Badge tone="accent">Everything in one place</Badge>
                    <h2 className="mt-4 font-heading text-4xl font-bold tracking-tight text-brand-dark dark:text-white sm:text-5xl">
                        A complete toolkit for
                        <span className="text-brand-dark/40 dark:text-brand-accent"> operational calm</span>
                    </h2>
                    <p className="mt-4 text-base text-gray-600 dark:text-gray-300">
                        Six tightly-integrated modules, one coherent luxe interface. No tab-hopping, no
                        context loss.
                    </p>
                </div>

                <motion.div
                    variants={stagger(0.06)}
                    initial="hidden"
                    whileInView="show"
                    viewport={inViewOnce}
                    className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                    {FEATURES.map((f) => (
                        <motion.div key={f.title} variants={fadeUp}>
                            <Surface variant="frost" radius="3xl" padding="lg" interactive className="h-full">
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-accent/20 text-brand-dark dark:text-brand-accent">
                                    <f.icon className="h-5 w-5" />
                                </span>
                                <h3 className="mt-5 font-heading text-xl font-bold text-brand-dark dark:text-white">
                                    {f.title}
                                </h3>
                                <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                                    {f.body}
                                </p>
                            </Surface>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};

export default LandingFeatures;
