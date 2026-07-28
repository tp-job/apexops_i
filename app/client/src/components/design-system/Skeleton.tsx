import type { FC } from 'react';

interface SkeletonProps {
    /** Tailwind height class. Defaults to a text-row height. */
    height?: string;
    /** Tailwind width class. Defaults to full width. */
    width?: string;
    radius?: 'md' | 'lg' | 'xl' | 'full';
    className?: string;
}

const radii = {
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
} as const;

/**
 * A single loading placeholder block.
 *
 * Promoted from the local `SkeletonPanel` in `Dashboard.tsx`. It is `aria-hidden`
 * and carries no text: the *container* owns the announcement (`aria-busy` plus a
 * visually-hidden "Loading…"), because a screen reader should hear one loading
 * message per region, not one per grey rectangle.
 */
export const Skeleton: FC<SkeletonProps> = ({
    height = 'h-9',
    width = 'w-full',
    radius = 'xl',
    className = '',
}) => (
    <div
        aria-hidden
        className={`animate-pulse bg-black/5 dark:bg-white/5 ${height} ${width} ${radii[radius]} ${className}`.trim()}
    />
);

interface SkeletonTextProps {
    lines?: number;
    /** Tailwind height class applied to each line. */
    lineHeight?: string;
    className?: string;
}

/**
 * A stack of skeleton rows with the announcement attached once, at the top.
 *
 * This is the shape almost every caller wants, and having it here is what stops
 * each page from re-deciding whether loading state is announced at all.
 */
export const SkeletonText: FC<SkeletonTextProps> = ({
    lines = 4,
    lineHeight = 'h-9',
    className = '',
}) => (
    <div role="status" aria-busy="true" className={`flex flex-col gap-3 ${className}`.trim()}>
        <span className="sr-only">Loading…</span>
        {Array.from({ length: lines }).map((_, i) => (
            <Skeleton key={i} height={lineHeight} />
        ))}
    </div>
);

export default Skeleton;
