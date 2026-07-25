import type { FC, ReactNode } from 'react';
import { motion } from 'motion/react';
import { fadeUp } from '@/lib/motion';

interface EmptyStateProps {
    /** A react-icons `Fi*` component. Kept neutral — never accent-filled. */
    icon?: ReactNode;
    title: string;
    /** One sentence: why it's empty and what fills it. */
    description?: string;
    /** The action that resolves the emptiness. Usually an `AccentButton`. */
    action?: ReactNode;
    /** `sm` for inside panels and rails, `md` for a full page region. */
    size?: 'sm' | 'md';
    className?: string;
}

/**
 * The zero-data state. Every list, table, timeline and chart in the system
 * needs one — an empty container with no explanation reads as a failure.
 *
 * Distinguish *never had data* from *filtered to nothing* in the copy: they
 * need different actions ("Create your first invoice" vs "Clear filters").
 */
const EmptyState: FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    action,
    size = 'md',
    className = '',
}) => {
    const pad = size === 'sm' ? 'py-8 px-4' : 'py-16 px-6';
    const iconBox = size === 'sm' ? 'w-10 h-10' : 'w-14 h-14';
    const titleSize = size === 'sm' ? 'text-sm' : 'text-base';

    return (
        <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className={`flex flex-col items-center justify-center text-center ${pad} ${className}`.trim()}
        >
            {icon && (
                <span
                    className={`${iconBox} rounded-2xl flex items-center justify-center bg-black/5 dark:bg-white/10 text-gray-400 dark:text-gray-500 mb-4`}
                >
                    {icon}
                </span>
            )}

            <p className={`${titleSize} font-semibold text-brand-dark dark:text-white`}>{title}</p>

            {description && (
                <p className="mt-1.5 max-w-sm text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {description}
                </p>
            )}

            {action && <div className="mt-5">{action}</div>}
        </motion.div>
    );
};

export default EmptyState;
