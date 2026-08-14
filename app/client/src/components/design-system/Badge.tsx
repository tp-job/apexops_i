import type { FC, ReactNode } from 'react';

export type Tone =
    | 'accent' | 'neutral' | 'outline' | 'solid'
    // Semantic tones. These carry *meaning*, so pick by what the value means
    // (resolved → success) and never by what colour looks nice.
    | 'success' | 'warning' | 'info' | 'danger';

interface BadgeProps {
    tone?: Tone;
    /** Leading glyph or status dot. Decorative — the text carries the meaning. */
    icon?: ReactNode;
    /**
     * Keeps the label's own casing instead of the default uppercase. For values
     * that are read as words rather than as status keys — a person's name, a
     * tag someone typed.
     */
    plainCase?: boolean;
    children: ReactNode;
    className?: string;
}

const tones: Record<Tone, string> = {
    accent: 'bg-brand-accent text-brand-dark',
    solid: 'bg-white text-brand-dark',
    neutral: 'bg-black/5 dark:bg-white/10 text-gray-600 dark:text-gray-300',
    outline: 'border border-gray-500/50 text-gray-500 dark:text-gray-400',
    success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    info: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
    danger: 'bg-global-red/10 text-global-red dark:text-red-400',
};

/**
 * Nano status chip — uppercase, tracked, tiny.
 *
 * The four semantic tones were added because meaning-to-colour maps were being
 * hand-rolled per page — `BugTracker` alone carried two (`STATUS_TONE` and
 * `PRIORITY_STYLE`) with their own greens and ambers, invisible to any audit of
 * the system. That decision belongs in one file.
 *
 * Semantic tones are tinted, not solid, on purpose: several can appear in one
 * list without any of them competing with the view's single accent.
 */
const Badge: FC<BadgeProps> = ({ tone = 'neutral', icon, plainCase = false, children, className = '' }) => {
    return (
        <span
            className={[
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wider',
                plainCase ? '' : 'uppercase',
                tones[tone],
                className,
            ].filter(Boolean).join(' ')}
        >
            {icon && <span aria-hidden className="shrink-0">{icon}</span>}
            {children}
        </span>
    );
};

export default Badge;
