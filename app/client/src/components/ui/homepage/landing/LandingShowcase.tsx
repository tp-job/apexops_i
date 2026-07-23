import type { FC } from 'react';
import { motion } from 'motion/react';
import { FiCheck, FiTerminal } from 'react-icons/fi';
import { Surface, Badge } from '@/components/design-system';
import { fadeUp, stagger, inViewOnce } from '@/lib/motion';

const POINTS = [
    'Unified stream — logs, errors, and tickets share one timeline.',
    'Keyboard-first triage that keeps engineers in flow.',
    'Every surface animated with the same cutting-edge feel.',
    'Dark, luxurious, and legible on any screen size.',
];

const LOG_ROWS = [
    { level: 'INFO', tone: 'text-brand-steel', msg: 'deploy · build #4821 succeeded' },
    { level: 'WARN', tone: 'text-amber-400', msg: 'latency spike on /api/invoices' },
    { level: 'OK', tone: 'text-brand-accent', msg: 'auto-scaled workers 4 → 8' },
    { level: 'INFO', tone: 'text-brand-steel', msg: 'ticket #177210 moved to Done' },
    { level: 'ERR', tone: 'text-red-400', msg: 'TypeError captured · grouped ×3' },
];

const LandingShowcase: FC = () => {
    return (
        <section id="showcase" className="scroll-mt-24 px-4 py-20 sm:px-6">
            <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
                {/* Copy */}
                <motion.div
                    variants={stagger(0.07)}
                    initial="hidden"
                    whileInView="show"
                    viewport={inViewOnce}
                >
                    <motion.div variants={fadeUp}>
                        <Badge tone="accent">The workflow</Badge>
                    </motion.div>
                    <motion.h2
                        variants={fadeUp}
                        className="mt-4 font-heading text-4xl font-bold tracking-tight text-brand-dark dark:text-white sm:text-5xl"
                    >
                        From alert to resolved, without leaving the room.
                    </motion.h2>
                    <motion.p
                        variants={fadeUp}
                        className="mt-4 text-base leading-relaxed text-gray-600 dark:text-gray-300"
                    >
                        ApexOps collapses the distance between noticing a problem and fixing it. One
                        control room, one motion language, zero friction.
                    </motion.p>

                    <motion.ul variants={fadeUp} className="mt-8 flex flex-col gap-4">
                        {POINTS.map((p) => (
                            <li key={p} className="flex items-start gap-3">
                                <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-accent text-brand-dark">
                                    <FiCheck className="h-3.5 w-3.5" strokeWidth={3} />
                                </span>
                                <span className="text-sm text-gray-700 dark:text-gray-200">{p}</span>
                            </li>
                        ))}
                    </motion.ul>
                </motion.div>

                {/* Mock terminal / stream */}
                <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="show"
                    viewport={inViewOnce}
                >
                    <Surface variant="frost" radius="3xl" padding="none" className="overflow-hidden">
                        <div className="flex items-center justify-between border-b border-black/5 px-5 py-3 dark:border-white/10">
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                <FiTerminal className="h-4 w-4" />
                                <span className="font-numbers text-xs">apexops · live stream</span>
                            </div>
                            <span className="flex items-center gap-1.5 text-[11px] font-medium text-brand-accent">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-accent" />
                                streaming
                            </span>
                        </div>
                        <div className="flex flex-col gap-1 p-4 font-numbers text-xs sm:text-sm">
                            {LOG_ROWS.map((row, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-black/[0.03] dark:hover:bg-white/5"
                                >
                                    <span className={`w-10 flex-shrink-0 font-bold ${row.tone}`}>{row.level}</span>
                                    <span className="text-gray-600 dark:text-gray-300">{row.msg}</span>
                                </div>
                            ))}
                        </div>
                    </Surface>
                </motion.div>
            </div>
        </section>
    );
};

export default LandingShowcase;
