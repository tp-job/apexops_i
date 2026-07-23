import type { FC } from 'react';
import { motion } from 'motion/react';
import { Surface, AnimatedNumber } from '@/components/design-system';
import { fadeUp, stagger, inViewOnce } from '@/lib/motion';

const METRICS = [
    { label: 'Events ingested / day', value: 4.2, decimals: 1, suffix: 'B' },
    { label: 'Median resolution time', value: 12, prefix: '', suffix: 'min' },
    { label: 'Platform uptime', value: 99.99, decimals: 2, suffix: '%' },
    { label: 'Teams shipping faster', value: 8400, suffix: '+' },
];

const LandingMetrics: FC = () => {
    return (
        <section id="metrics" className="scroll-mt-24 px-4 py-10 sm:px-6">
            <div className="mx-auto max-w-6xl">
                <Surface variant="dark" radius="3xl" padding="none" className="relative overflow-hidden">
                    <div className="ds-mesh pointer-events-none absolute inset-0 opacity-60" />
                    <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-accent/20 blur-[100px]" />

                    <div className="relative p-8 sm:p-12">
                        <div className="max-w-xl">
                            <h2 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
                                Numbers that stay green.
                            </h2>
                            <p className="mt-3 text-sm text-gray-300 sm:text-base">
                                ApexOps is engineered for scale and calm — the metrics teams check every
                                morning and never worry about.
                            </p>
                        </div>

                        <motion.div
                            variants={stagger(0.08)}
                            initial="hidden"
                            whileInView="show"
                            viewport={inViewOnce}
                            className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4"
                        >
                            {METRICS.map((m) => (
                                <motion.div key={m.label} variants={fadeUp}>
                                    <div className="flex items-baseline font-numbers text-4xl font-bold text-brand-accent sm:text-5xl">
                                        {m.prefix}
                                        <AnimatedNumber value={m.value} decimals={m.decimals ?? 0} />
                                        <span className="ml-1 text-2xl sm:text-3xl">{m.suffix}</span>
                                    </div>
                                    <p className="mt-2 text-sm text-gray-400">{m.label}</p>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </Surface>
            </div>
        </section>
    );
};

export default LandingMetrics;
