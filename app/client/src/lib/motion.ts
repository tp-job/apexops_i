/**
 * ApexOps Design System v2 "Luxe" — Motion vocabulary
 * ------------------------------------------------------
 * A small, strict set of motion variants so every surface animates
 * with the same cutting-edge feel. Import from '@/lib/motion' and
 * spread onto `motion.*` elements. Do not hand-roll one-off tweens.
 *
 * Powered by the `motion` package (motion/react).
 */
import type { Variants, Transition } from 'motion/react';

/** The one signature easing curve of the system (expo-out-ish). */
export const EASE_LUX: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const EASE_SOFT: [number, number, number, number] = [0.4, 0, 0.2, 1];

export const DUR = {
    fast: 0.16,
    base: 0.28,
    slow: 0.52,
} as const;

/** Spring used for interactive lifts / knobs — snappy but composed. */
export const SPRING: Transition = {
    type: 'spring',
    stiffness: 420,
    damping: 32,
    mass: 0.7,
};

/** Fade + rise. The default entrance for cards, rows, hero blocks. */
export const fadeUp: Variants = {
    hidden: { opacity: 0, y: 16 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: DUR.base, ease: EASE_LUX },
    },
};

/** Fade + scale. For focal elements (KPIs, modals, badges). */
export const scaleIn: Variants = {
    hidden: { opacity: 0, scale: 0.96 },
    show: {
        opacity: 1,
        scale: 1,
        transition: { duration: DUR.base, ease: EASE_LUX },
    },
};

/** Plain fade. */
export const fade: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: DUR.base, ease: EASE_SOFT } },
};

/** Parent stagger container — children use fadeUp / scaleIn. */
export const stagger = (gap = 0.06, delay = 0): Variants => ({
    hidden: {},
    show: {
        transition: { staggerChildren: gap, delayChildren: delay },
    },
});

/** Interactive hover-lift + tap-press for cards / tiles. */
export const hoverLift = {
    whileHover: { y: -4, transition: SPRING },
    whileTap: { scale: 0.985, transition: SPRING },
};

/** Interactive press for buttons (no lift, just a confident press). */
export const pressable = {
    whileHover: { scale: 1.02, transition: SPRING },
    whileTap: { scale: 0.96, transition: SPRING },
};

/** Reusable viewport config so scroll-reveals only fire once. */
export const inViewOnce = { once: true, margin: '-60px' } as const;
