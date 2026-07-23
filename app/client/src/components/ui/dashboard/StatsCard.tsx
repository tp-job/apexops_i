import type { FC } from 'react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsCardProps {
    title: string;
    value: number | string;
    subtitle: string;
    description?: string;
    data?: any[];
    dataKey?: string;
    color?: 'ember' | 'wine' | 'indigo' | 'peach' | 'green' | 'blue' | 'orange' | 'purple';
    trend?: number;
    icon?: React.ReactNode;
}

// Neutral + lime per design.md §2. All variants render the same brand-dark
// surface; the color prop is kept for API compat but no longer drives hue.
const NEUTRAL = { primary: '#222222', light: 'rgba(34,34,34,0.06)', gradient: 'from-black/10 to-black/0' };
const colorMap = {
    blue: NEUTRAL, orange: NEUTRAL, purple: NEUTRAL, green: NEUTRAL,
    ember: NEUTRAL, wine: NEUTRAL, indigo: NEUTRAL, peach: NEUTRAL,
};

const StatsCard: FC<StatsCardProps> = ({
    title,
    value,
    subtitle,
    description,
    data = [],
    dataKey = 'value',
    color = 'ember',
    trend,
    icon
}) => {
    const colors = colorMap[color];

    const TrendIcon = trend ? (trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus) : null;
    const trendColor = trend ? (trend > 0 ? 'text-green-500' : trend < 0 ? 'text-orange-500' : 'text-gray-400') : '';

    return (
        <div className="glass-panel group relative overflow-hidden rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1">
            {/* Background Gradient Accent */}
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colors.gradient} rounded-full blur-2xl -translate-y-8 translate-x-8 opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

            {/* Header */}
            <div className="flex items-center justify-between mb-4 relative">
                <div className="flex items-center gap-3">
                    {icon && (
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: colors.light }}
                        >
                            <div style={{ color: colors.primary }}>{icon}</div>
                        </div>
                    )}
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                        {title}
                    </h3>
                </div>
                <button className="p-2 rounded-xl transition-colors hover:bg-white/10 text-gray-400 hover:text-brand-dark">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                </button>
            </div>

            {/* Main Content */}
            <div className="flex items-end justify-between relative">
                <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold font-numbers text-brand-dark">
                            {value}
                        </span>
                        {trend !== undefined && TrendIcon && (
                            <span className={`flex items-center gap-1 text-sm font-medium ${trendColor}`}>
                                <TrendIcon className="w-4 h-4" />
                                {Math.abs(trend)}%
                            </span>
                        )}
                    </div>
                    <div className="text-sm font-medium" style={{ color: colors.primary }}>
                        {subtitle}
                    </div>
                    {description && (
                        <div className="text-xs text-gray-400">
                            {description}
                        </div>
                    )}
                </div>

                {/* Mini Chart */}
                {data.length > 0 && (
                    <div className="w-24 h-16">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={colors.primary} stopOpacity={0.4} />
                                        <stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area
                                    type="monotone"
                                    dataKey={dataKey}
                                    stroke={colors.primary}
                                    strokeWidth={2}
                                    fill={`url(#gradient-${color})`}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatsCard;
