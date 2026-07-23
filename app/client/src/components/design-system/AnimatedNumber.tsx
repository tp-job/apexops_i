import { type FC, useEffect, useState } from 'react';
import { animate, useMotionValue, useReducedMotion } from 'motion/react';
import { EASE_LUX } from '@/lib/motion';

interface AnimatedNumberProps {
    value: number;
    /** Decimal places to render (financial defaults to 2). */
    decimals?: number;
    /** Thousands grouping. */
    group?: boolean;
    duration?: number;
    className?: string;
}

const format = (n: number, decimals: number, group: boolean) =>
    n.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        useGrouping: group,
    });

/**
 * Count-up number for the system's monospaced financial figures.
 * Always render inside a `font-numbers` context so width never shifts.
 *
 * Resilient by design: if the user prefers reduced motion — or the
 * animation frame loop never runs — the final value is still shown.
 */
const AnimatedNumber: FC<AnimatedNumberProps> = ({
    value,
    decimals = 0,
    group = true,
    duration = 0.9,
    className,
}) => {
    const reduce = useReducedMotion();
    const mv = useMotionValue(0);
    const [display, setDisplay] = useState(() => format(value, decimals, group));

    useEffect(() => {
        if (reduce) {
            setDisplay(format(value, decimals, group));
            return;
        }
        const unsubscribe = mv.on('change', (latest) =>
            setDisplay(format(latest, decimals, group)),
        );
        const controls = animate(mv, value, { duration, ease: EASE_LUX });
        // Guarantee the final value lands even if rAF is throttled/paused.
        const settle = window.setTimeout(
            () => setDisplay(format(value, decimals, group)),
            duration * 1000 + 80,
        );
        return () => {
            controls.stop();
            unsubscribe();
            window.clearTimeout(settle);
        };
    }, [mv, value, decimals, group, duration, reduce]);

    return <span className={className}>{display}</span>;
};

export default AnimatedNumber;
