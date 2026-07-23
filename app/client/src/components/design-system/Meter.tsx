import type { FC } from 'react';
import { motion } from 'motion/react';
import { EASE_LUX } from '@/lib/motion';

interface MeterProps {
    /** 0–100 */
    value: number;
    /** Show the glowing draggable-style knob at the fill head. */
    knob?: boolean;
    /** Track height in px. */
    height?: number;
    className?: string;
}

/**
 * Striped lime progress meter with an optional glowing knob.
 * Canonical "sales target / timeline" element (ref images 1 & 4).
 */
const Meter: FC<MeterProps> = ({ value, knob = true, height = 10, className = '' }) => {
    const pct = Math.max(0, Math.min(100, value));

    return (
        <div
            className={`relative w-full rounded-full bg-black/10 dark:bg-white/10 overflow-visible ${className}`}
            style={{ height }}
        >
            <motion.div
                className="ds-stripe-fill h-full rounded-full relative"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.9, ease: EASE_LUX }}
                style={{ height }}
            >
                {knob && (
                    <motion.span
                        className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 rounded-full bg-white ds-glow"
                        style={{ width: height + 8, height: height + 8 }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.5, ease: EASE_LUX, delay: 0.4 }}
                    />
                )}
            </motion.div>
        </div>
    );
};

export default Meter;
