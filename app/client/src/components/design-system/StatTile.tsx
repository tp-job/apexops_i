import type { FC, ReactNode } from 'react';
import { FiArrowUpRight, FiArrowDownRight } from 'react-icons/fi';
import Surface from './Surface';
import AnimatedNumber from './AnimatedNumber';

interface StatTileProps {
    label: string;
    value: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    /** Signed percentage; renders coloured trend pill. */
    trend?: number;
    icon?: ReactNode;
    variant?: 'frost' | 'dark' | 'accent';
    reveal?: boolean;
}

/**
 * KPI tile — animated mono value, optional trend, luxe surface.
 * The atomic unit of every dashboard header in the system.
 */
const StatTile: FC<StatTileProps> = ({
    label,
    value,
    prefix,
    suffix,
    decimals = 0,
    trend,
    icon,
    variant = 'frost',
    reveal = true,
}) => {
    const trendUp = (trend ?? 0) >= 0;
    const labelColor =
        variant === 'accent' ? 'text-brand-dark/70' : 'text-gray-500 dark:text-gray-400';
    const valueColor =
        variant === 'accent' ? 'text-brand-dark' : 'text-brand-dark dark:text-white';

    return (
        <Surface variant={variant} radius="2xl" padding="md" interactive reveal={reveal}>
            <div className="flex items-start justify-between gap-3">
                <p className={`text-sm font-medium ${labelColor}`}>{label}</p>
                {icon && (
                    <span className="w-9 h-9 rounded-xl bg-brand-accent/20 text-brand-dark dark:text-brand-accent flex items-center justify-center flex-shrink-0">
                        {icon}
                    </span>
                )}
            </div>

            <div className="mt-3 flex items-end justify-between gap-2">
                <div className="flex items-baseline gap-1 font-numbers">
                    {prefix && <span className="text-gray-400 text-lg">{prefix}</span>}
                    <span className={`text-3xl font-bold ${valueColor}`}>
                        <AnimatedNumber value={value} decimals={decimals} />
                    </span>
                    {suffix && <span className="text-gray-400 text-sm font-medium ml-1">{suffix}</span>}
                </div>

                {trend !== undefined && (
                    <span
                        className={`flex items-center gap-1 text-xs font-semibold font-numbers px-2 py-1 rounded-lg ${
                            trendUp
                                ? 'text-emerald-600 bg-emerald-500/10'
                                : 'text-red-500 bg-red-500/10'
                        }`}
                    >
                        {trendUp ? <FiArrowUpRight className="w-3.5 h-3.5" /> : <FiArrowDownRight className="w-3.5 h-3.5" />}
                        {Math.abs(trend)}%
                    </span>
                )}
            </div>
        </Surface>
    );
};

export default StatTile;
