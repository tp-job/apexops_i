import type { FC } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { HiSparkles } from 'react-icons/hi2';
import { FiMenu, FiX, FiSun, FiMoon, FiArrowUpRight } from 'react-icons/fi';
import { useTheme } from '@/context/ThemeContext';
import { EASE_LUX } from '@/lib/motion';

const NAV_LINKS = [
    { label: 'Product', href: '#features' },
    { label: 'Platform', href: '#metrics' },
    { label: 'Workflow', href: '#showcase' },
    { label: 'Docs', href: '/about' },
] as const;

const LandingNav: FC = () => {
    const { isDark, toggleTheme } = useTheme();
    const [open, setOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 px-4 pt-4 sm:px-6">
            <motion.nav
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE_LUX }}
                className="glass-panel mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-full py-2 pl-5 pr-2"
            >
                {/* Brand */}
                <Link to="/" className="flex flex-shrink-0 items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-accent text-brand-dark shadow-sm">
                        <HiSparkles className="h-4 w-4" />
                    </span>
                    <span className="font-heading text-lg font-bold tracking-tight text-brand-dark dark:text-white">
                        Apex<span className="text-brand-dark/50 dark:text-brand-accent">Ops</span>
                    </span>
                </Link>

                {/* Desktop links */}
                <div className="hidden items-center gap-1 rounded-full bg-white/50 p-1 text-sm font-medium dark:bg-white/5 lg:flex">
                    {NAV_LINKS.map((link) => (
                        <a
                            key={link.label}
                            href={link.href}
                            className="rounded-full px-4 py-1.5 text-gray-600 transition hover:bg-white hover:text-brand-dark dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                            {link.label}
                        </a>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex flex-shrink-0 items-center gap-2">
                    <button
                        type="button"
                        onClick={toggleTheme}
                        title="Toggle theme"
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:bg-white/60 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/10"
                    >
                        {isDark ? <FiSun className="h-4 w-4" /> : <FiMoon className="h-4 w-4" />}
                    </button>
                    <Link
                        to="/auth"
                        className="hidden rounded-full px-4 py-2 text-sm font-semibold text-gray-600 transition hover:text-brand-dark dark:text-gray-300 dark:hover:text-white sm:block"
                    >
                        Sign in
                    </Link>
                    <Link
                        to="/dashboard"
                        className="ds-glow inline-flex items-center gap-1.5 rounded-full bg-brand-accent px-4 py-2 text-sm font-bold text-brand-dark transition hover:bg-brand-accentHover"
                    >
                        Get started
                        <FiArrowUpRight className="h-4 w-4" />
                    </Link>
                    <button
                        type="button"
                        onClick={() => setOpen((v) => !v)}
                        title="Menu"
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:bg-white/60 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/10 lg:hidden"
                    >
                        {open ? <FiX className="h-4 w-4" /> : <FiMenu className="h-4 w-4" />}
                    </button>
                </div>
            </motion.nav>

            {/* Mobile menu */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.22, ease: EASE_LUX }}
                        className="glass-panel mx-auto mt-2 max-w-6xl rounded-3xl p-3 lg:hidden"
                    >
                        <div className="flex flex-col">
                            {NAV_LINKS.map((link) => (
                                <a
                                    key={link.label}
                                    href={link.href}
                                    onClick={() => setOpen(false)}
                                    className="rounded-2xl px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-white/70 dark:text-gray-200 dark:hover:bg-white/10"
                                >
                                    {link.label}
                                </a>
                            ))}
                            <Link
                                to="/auth"
                                onClick={() => setOpen(false)}
                                className="rounded-2xl px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-white/70 dark:text-gray-200 dark:hover:bg-white/10 sm:hidden"
                            >
                                Sign in
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
};

export default LandingNav;
