import type { FC, ReactNode } from 'react';

type Tone = 'accent' | 'neutral' | 'outline' | 'solid';

interface BadgeProps {
    tone?: Tone;
    children: ReactNode;
    className?: string;
}

const tones: Record<Tone, string> = {
    accent: 'bg-brand-accent text-brand-dark',
    solid: 'bg-white text-brand-dark',
    neutral: 'bg-black/5 dark:bg-white/10 text-gray-600 dark:text-gray-300',
    outline: 'border border-gray-500/50 text-gray-500 dark:text-gray-400',
};

/** Nano status chip — uppercase, tracked, tiny. */
const Badge: FC<BadgeProps> = ({ tone = 'neutral', children, className = '' }) => {
    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${tones[tone]} ${className}`.trim()}
        >
            {children}
        </span>
    );
};

export default Badge;
