import type { FC, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Surface } from '@/components/design-system';
import { fadeUp } from '@/lib/motion';

interface AuthShellProps {
    title: string;
    subtitle: string;
    /** Rendered under the card: the "no account yet?" / "already have one?" line. */
    footer: ReactNode;
    children: ReactNode;
}

/**
 * The frame both auth pages share: centred Luxe card, wordmark, title, footer link.
 *
 * Extracted on its second consumer rather than its first — two pages that are
 * visually identical except for their form is exactly the duplication that ends up
 * drifting into two different-looking sign-in screens.
 */
const AuthShell: FC<AuthShellProps> = ({ title, subtitle, footer, children }) => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-light-bg px-4 py-10 font-body dark:bg-dark-bg">
        <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="flex w-full max-w-md flex-col gap-6"
        >
            <div className="flex flex-col items-center gap-2 text-center">
                <Link
                    to="/"
                    className="rounded-lg font-heading text-2xl font-bold tracking-tight text-brand-dark outline-none focus-visible:ring-2 focus-visible:ring-brand-dark/40 dark:text-white dark:focus-visible:ring-brand-accent/50"
                >
                    Apex<span className="text-brand-accent">Ops</span>
                </Link>
            </div>

            <Surface variant="frost" radius="3xl" padding="lg">
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-1.5">
                        <h1 className="font-heading text-xl font-bold text-brand-dark dark:text-white">
                            {title}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
                    </div>

                    {children}
                </div>
            </Surface>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400">{footer}</p>
        </motion.div>
    </div>
);

export default AuthShell;
