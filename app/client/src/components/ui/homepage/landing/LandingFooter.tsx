import type { FC } from 'react';
import { Link } from 'react-router-dom';
import { HiSparkles } from 'react-icons/hi2';
import { FiGithub, FiTwitter, FiGlobe } from 'react-icons/fi';

const COLUMNS = [
    {
        heading: 'Product',
        links: [
            { label: 'Log Management', to: '#features' },
            { label: 'AI Diagnostics', to: '#features' },
            { label: 'Error Tracking', to: '#features' },
            { label: 'Live demo', to: '/invoices' },
        ],
    },
    {
        heading: 'Resources',
        links: [
            { label: 'Documentation', to: '/about' },
            { label: 'Design System', to: '/design-system' },
            { label: 'Dashboard', to: '/dashboard' },
            { label: 'Community', to: '/about' },
        ],
    },
    {
        heading: 'Company',
        links: [
            { label: 'About', to: '/about' },
            { label: 'Careers', to: '/about' },
            { label: 'Contact', to: '/about' },
            { label: 'Sign in', to: '/auth' },
        ],
    },
];

const SOCIALS = [FiGithub, FiTwitter, FiGlobe];

const LandingFooter: FC = () => {
    const year = new Date().getFullYear();

    return (
        <footer className="px-4 pb-10 pt-8 sm:px-6">
            <div className="mx-auto max-w-6xl border-t border-black/10 pt-14 dark:border-white/10">
                <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
                    <div className="col-span-2">
                        <Link to="/" className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-accent text-brand-dark">
                                <HiSparkles className="h-4 w-4" />
                            </span>
                            <span className="font-heading text-lg font-bold tracking-tight text-brand-dark dark:text-white">
                                ApexOps
                            </span>
                        </Link>
                        <p className="mt-5 max-w-xs text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                            The intelligent bug &amp; log platform that gives engineering teams a calm,
                            luxurious control room.
                        </p>
                        <div className="mt-6 flex gap-3">
                            {SOCIALS.map((Icon, i) => (
                                <a
                                    key={i}
                                    href="#"
                                    className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-gray-500 transition hover:border-brand-accent hover:text-brand-dark dark:border-white/10 dark:text-gray-400 dark:hover:text-white"
                                >
                                    <Icon className="h-4 w-4" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {COLUMNS.map((col) => (
                        <div key={col.heading}>
                            <h6 className="font-heading text-sm font-bold text-brand-dark dark:text-white">
                                {col.heading}
                            </h6>
                            <ul className="mt-5 flex flex-col gap-3 text-sm">
                                {col.links.map((link) => (
                                    <li key={link.label}>
                                        <Link
                                            to={link.to}
                                            className="text-gray-600 transition hover:text-brand-dark dark:text-gray-400 dark:hover:text-white"
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-black/10 pt-6 text-xs text-gray-500 dark:border-white/10 dark:text-gray-400 sm:flex-row">
                    <p>© {year} ApexOps Inc. All rights reserved.</p>
                    <div className="flex gap-6">
                        <a href="#" className="transition hover:text-brand-dark dark:hover:text-white">Privacy</a>
                        <a href="#" className="transition hover:text-brand-dark dark:hover:text-white">Terms</a>
                        <a href="#" className="transition hover:text-brand-dark dark:hover:text-white">Cookies</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default LandingFooter;
