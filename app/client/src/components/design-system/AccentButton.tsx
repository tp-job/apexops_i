import type { ButtonHTMLAttributes, FC, ReactNode } from 'react';
import { motion } from 'motion/react';
import { pressable } from '@/lib/motion';

type Variant = 'accent' | 'dark' | 'ghost';
type Size = 'sm' | 'md';

interface AccentButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'ref'> {
    variant?: Variant;
    size?: Size;
    icon?: ReactNode;
    children: ReactNode;
}

const base =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-dark/40 dark:focus-visible:ring-brand-accent/50';

const variants: Record<Variant, string> = {
    accent: 'bg-brand-accent text-brand-dark hover:bg-brand-accentHover shadow-md ds-glow',
    dark: 'bg-brand-dark text-white hover:bg-black shadow-md',
    ghost: 'bg-white/60 dark:bg-white/5 text-brand-dark dark:text-white border border-gray-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 shadow-sm',
};

const sizes: Record<Size, string> = {
    sm: 'text-xs px-3.5 py-2',
    md: 'text-sm px-5 py-2.5',
};

/**
 * The system's button. `accent` is the single focal CTA per view (glows);
 * `dark` for secondary solid; `ghost` for tertiary on glass.
 */
const AccentButton: FC<AccentButtonProps> = ({
    variant = 'accent',
    size = 'md',
    icon,
    children,
    className = '',
    ...rest
}) => {
    return (
        <motion.button
            {...pressable}
            className={`${base} ${variants[variant]} ${sizes[size]} ${className}`.trim()}
            {...(rest as object)}
        >
            {icon}
            {children}
        </motion.button>
    );
};

export default AccentButton;
