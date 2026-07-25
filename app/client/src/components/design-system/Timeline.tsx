import type { FC, ReactNode } from 'react';
import { motion } from 'motion/react';
import { fadeUp, stagger } from '@/lib/motion';

type Tone = 'neutral' | 'accent' | 'positive' | 'warning' | 'danger';

export interface TimelineItem {
    id: string;
    /** Primary line — what happened. */
    title: ReactNode;
    /** Optional second line — who / details. */
    meta?: ReactNode;
    /** Right-aligned timestamp. Pre-formatted by the caller. */
    timestamp?: string;
    /** Replaces the default dot. Use a react-icons `Fi*` component. */
    icon?: ReactNode;
    tone?: Tone;
}

interface TimelineProps {
    items: TimelineItem[];
    /** Tighter rhythm for dense rails (contact panels, side drawers). */
    dense?: boolean;
    /** Runs the staggered entrance. Disable when the parent already staggers. */
    reveal?: boolean;
    className?: string;
}

const dotTones: Record<Tone, string> = {
    neutral: 'bg-gray-300 dark:bg-white/25',
    accent: 'bg-brand-accent',
    positive: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
};

const iconTones: Record<Tone, string> = {
    neutral: 'bg-black/5 dark:bg-white/10 text-gray-500 dark:text-gray-400',
    accent: 'bg-brand-accent/20 text-brand-dark dark:text-brand-accent',
    positive: 'bg-emerald-500/10 text-emerald-600',
    warning: 'bg-amber-500/10 text-amber-600',
    danger: 'bg-red-500/10 text-red-500',
};

/**
 * Vertical activity feed — the canonical "what happened, in order" rail.
 * Used by invoice activity, bug history and note revisions.
 *
 * Renders nothing but the rail; wrap it in a `Surface` for card chrome.
 * For the zero-item case use `EmptyState` instead — an empty Timeline is
 * a bare line and reads as broken.
 */
const Timeline: FC<TimelineProps> = ({ items, dense = false, reveal = true, className = '' }) => {
    const gap = dense ? 'pb-4' : 'pb-6';
    const markerSize = dense ? 'w-6 h-6' : 'w-8 h-8';

    return (
        <motion.ol
            className={`relative ${className}`.trim()}
            variants={reveal ? stagger() : undefined}
            initial={reveal ? 'hidden' : undefined}
            animate={reveal ? 'show' : undefined}
        >
            {items.map((item, i) => {
                const tone = item.tone ?? 'neutral';
                const isLast = i === items.length - 1;

                return (
                    <motion.li
                        key={item.id}
                        className={`relative flex gap-4 ${isLast ? '' : gap}`}
                        variants={reveal ? fadeUp : undefined}
                    >
                        {/* rail + marker */}
                        <div className="relative flex flex-col items-center flex-shrink-0">
                            {item.icon ? (
                                <span
                                    className={`${markerSize} rounded-xl flex items-center justify-center ${iconTones[tone]}`}
                                >
                                    {item.icon}
                                </span>
                            ) : (
                                <span
                                    className={`${markerSize} rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${dotTones[tone]}`} />
                                </span>
                            )}
                            {!isLast && (
                                <span
                                    aria-hidden
                                    className="flex-1 w-px mt-1 bg-gray-200 dark:bg-white/10"
                                />
                            )}
                        </div>

                        {/* content */}
                        <div className="flex-1 min-w-0 -mt-0.5">
                            <div className="flex items-baseline justify-between gap-3">
                                <p className="text-sm font-semibold text-brand-dark dark:text-white truncate">
                                    {item.title}
                                </p>
                                {item.timestamp && (
                                    <span className="font-numbers text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                                        {item.timestamp}
                                    </span>
                                )}
                            </div>
                            {item.meta && (
                                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                    {item.meta}
                                </p>
                            )}
                        </div>
                    </motion.li>
                );
            })}
        </motion.ol>
    );
};

export default Timeline;
