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
    color?: 'ember' | 'wine' | 'indigo' | 'peach' | 'green' | 'blue';
    trend?: number;
    icon?: React.ReactNode;
}

const colorMap = {
    ember: { primary: '#F64668', light: 'rgba(246, 70, 104, 0.15)', gradient: 'from-ember/20 to-ember/5' },
    wine: { primary: '#984063', light: 'rgba(152, 64, 99, 0.15)', gradient: 'from-wine/20 to-wine/5' },
    indigo: { primary: '#41436A', light: 'rgba(65, 67, 106, 0.15)', gradient: 'from-indigo/20 to-indigo/5' },
    peach: { primary: '#FE9677', light: 'rgba(254, 150, 119, 0.15)', gradient: 'from-peach/20 to-peach/5' },
    green: { primary: '#0F9D58', light: 'rgba(15, 157, 88, 0.15)', gradient: 'from-global-green/20 to-global-green/5' },
    blue: { primary: '#4285F4', light: 'rgba(66, 133, 244, 0.15)', gradient: 'from-global-blue/20 to-global-blue/5' },
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
    const trendColor = trend ? (trend > 0 ? 'text-global-green' : trend < 0 ? 'text-global-red' : 'text-gray-400') : '';

    return (
        <div className="group relative overflow-hidden rounded-2xl p-6 bg-white border-light-border dark:bg-dark-surface dark:border-dark-border border transition-all duration-300 hover:shadow-lg hover:shadow-ember/5 dark:hover:shadow-ember/10 hover:-translate-y-1">
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
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-light-text-secondary dark:text-dark-text-secondary">
                        {title}
                    </h3>
                </div>
                <button className="p-2 rounded-lg transition-colors hover:bg-light-surface-2 text-light-text-secondary dark:hover:bg-dark-surface-2 dark:text-dark-text-secondary">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                </button>
            </div>

            {/* Main Content */}
            <div className="flex items-end justify-between relative">
                <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-light-text-primary dark:text-dark-text-primary">
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
                        <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
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
