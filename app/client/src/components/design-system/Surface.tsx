import type { FC, ReactNode } from 'react';
import { motion } from 'motion/react';
import { fadeUp, hoverLift } from '@/lib/motion';

type Variant = 'frost' | 'panel' | 'dark' | 'blue' | 'accent';
type Radius = 'xl' | '2xl' | '3xl';
type Pad = 'none' | 'sm' | 'md' | 'lg';

interface SurfaceProps {
    variant?: Variant;
    radius?: Radius;
    padding?: Pad;
    /** Adds hover-lift + tap interaction. */
    interactive?: boolean;
    /** Runs the fadeUp entrance (use inside a stagger container, or standalone). */
    reveal?: boolean;
    className?: string;
    children: ReactNode;
}

const variants: Record<Variant, string> = {
    frost: 'ds-frost',
    panel: 'glass-panel',
    dark: 'bg-brand-nearBlack2 text-white border border-white/5',
    blue: 'glass-blue text-white',
    accent: 'ds-stripe-fill text-brand-dark',
};

const radii: Record<Radius, string> = {
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    '3xl': 'rounded-3xl',
};

const pads: Record<Pad, string> = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
};

/**
 * The system's card. `frost` is the canonical luxe surface.
 * Compose everything on top of these — never raw div + bg utilities.
 */
const Surface: FC<SurfaceProps> = ({
    variant = 'frost',
    radius = '3xl',
    padding = 'md',
    interactive = false,
    reveal = false,
    className = '',
    children,
}) => {
    const cls = `${variants[variant]} ${radii[radius]} ${pads[padding]} ${className}`.trim();

    return (
        <motion.div
            className={cls}
            variants={reveal ? fadeUp : undefined}
            {...(interactive ? hoverLift : {})}
        >
            {children}
        </motion.div>
    );
};

export default Surface;
