import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { FiArrowRight } from 'react-icons/fi';
import { Surface } from '@/components/design-system';
import { fadeUp, inViewOnce } from '@/lib/motion';

const LandingCTA: FC = () => {
    return (
        <section className="px-4 py-16 sm:px-6">
            <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={inViewOnce}
                className="mx-auto max-w-6xl"
            >
                <Surface variant="dark" radius="3xl" padding="none" className="relative overflow-hidden">
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-accent/15 via-transparent to-transparent" />
                    <div className="pointer-events-none absolute -bottom-24 left-1/2 h-64 w-[60%] -translate-x-1/2 rounded-full bg-brand-accent/25 blur-[100px]" />

                    <div className="relative flex flex-col items-center px-6 py-16 text-center sm:py-20">
                        <h2 className="max-w-2xl font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
                            Bring calm to your&nbsp;
                            <span className="text-brand-accent">operations.</span>
                        </h2>
                        <p className="mt-5 max-w-xl text-base text-gray-300 sm:text-lg">
                            Start free in minutes. No credit card, no setup theatre — just a control room
                            your whole team will want to live in.
                        </p>
                        <div className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
                            <Link
                                to="/dashboard"
                                className="ds-glow inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-accent px-7 py-4 text-sm font-bold text-brand-dark transition hover:bg-brand-accentHover sm:w-auto"
                            >
                                Get started free
                                <FiArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                to="/design-system"
                                className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-7 py-4 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
                            >
                                Explore the system
                            </Link>
                        </div>
                    </div>
                </Surface>
            </motion.div>
        </section>
    );
};

export default LandingCTA;
