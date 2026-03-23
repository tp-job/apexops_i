import type { FC } from 'react';

export interface PrincipleCardProps {
    variant: 'blue' | 'orange' | 'violet';
    imageSrc: string;
    imageAlt: string;
    number: string;
    title: string;
    description: string;
    exploreHref: string;
}

const variantStyles = {
    blue: {
        border: 'hover:border-[var(--color-blue-primary)]/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]',
        gradient: 'from-[var(--color-blue-primary)]/10',
        overlay: 'bg-[var(--color-blue-primary)]/20',
        badge: 'text-[var(--color-blue-primary)] border-[var(--color-blue-primary)] bg-[var(--color-blue-primary)]/10 shadow-[0_0_10px_rgba(59,130,246,0.3)]',
        title: 'group-hover:text-[var(--color-blue-primary)]',
    },
    orange: {
        border: 'hover:border-[var(--color-orange-primary)]/50 hover:shadow-[0_0_30px_rgba(255,111,65,0.2)]',
        gradient: 'from-[var(--color-orange-primary)]/10',
        overlay: 'bg-[var(--color-orange-primary)]/20',
        badge: 'text-[var(--color-orange-primary)] border-[var(--color-orange-primary)] bg-[var(--color-orange-primary)]/10 shadow-[0_0_10px_rgba(255,111,65,0.3)]',
        title: 'group-hover:text-[var(--color-orange-primary)]',
    },
    violet: {
        border: 'hover:border-[var(--color-violet)]/50 hover:shadow-[0_0_30px_rgba(139,92,246,0.2)]',
        gradient: 'from-[var(--color-violet)]/10',
        overlay: 'bg-[var(--color-violet)]/20',
        badge: 'text-[var(--color-violet)] border-[var(--color-violet)] bg-[var(--color-violet)]/10 shadow-[0_0_10px_rgba(139,92,246,0.3)]',
        title: 'group-hover:text-[var(--color-violet)]',
    },
};

export const PrincipleCard: FC<PrincipleCardProps> = ({
    variant,
    imageSrc,
    imageAlt,
    number,
    title,
    description,
    exploreHref,
}) => {
    const s = variantStyles[variant];
    return (
        <div
            className={`glass-card p-10 hover:-translate-y-4 transition-all duration-500 group rounded-2xl border-t border-l border-white/10 border-b border-r border-black/50 relative overflow-hidden ${s.border}`}
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            <div className="h-56 overflow-hidden mb-10 rounded-lg relative">
                <div className={`absolute inset-0 ${s.overlay} mix-blend-overlay z-10`} />
                <img
                    alt={imageAlt}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    src={imageSrc}
                />
            </div>
            <div className="flex items-center gap-4 mb-6 relative z-10">
                <span className={`text-xs font-black uppercase tracking-widest block border px-3 py-1 rounded ${s.badge}`}>
                    {number}
                </span>
                <div className="h-px bg-white/20 flex-grow" />
            </div>
            <h3 className={`font-display text-3xl text-white mb-4 transition-colors relative z-10 ${s.title}`}>
                {title}
            </h3>
            <p className="text-base text-light-text-secondary dark:text-dark-text-secondary leading-relaxed font-light mb-8 relative z-10 group-hover:text-dark-text-secondary transition-colors">
                {description}
            </p>
            <a
                className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-white hover:text-[var(--color-blue-primary)] transition-colors pb-1 group/link relative z-10 font-bold"
                href={exploreHref}
            >
                Explore
                <span className="material-symbols-outlined text-sm group-hover/link:translate-x-1 transition-transform group-hover/link:text-glow">
                    arrow_forward
                </span>
            </a>
        </div>
    );
};
