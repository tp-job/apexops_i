import type { FC } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Terminal, TrendingUp, AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface LogsOverviewChartProps {
    data: {
        errors: number;
        warnings: number;
        info: number;
    };
    chartData?: Array<{
        time: string;
        errors: number;
        warnings: number;
        info: number;
    }>;
}

const LogsOverviewChart: FC<LogsOverviewChartProps> = ({ data, chartData }) => {
    // Default chart data if not provided
    const defaultChartData = chartData || [
        { time: '00:00', errors: 2, warnings: 5, info: 10 },
        { time: '04:00', errors: 1, warnings: 3, info: 8 },
        { time: '08:00', errors: 4, warnings: 7, info: 15 },
        { time: '12:00', errors: 3, warnings: 4, info: 12 },
        { time: '16:00', errors: 5, warnings: 8, info: 20 },
        { time: '20:00', errors: 2, warnings: 6, info: 14 },
        { time: 'Now', errors: data.errors, warnings: data.warnings, info: data.info },
    ];

    const total = data.errors + data.warnings + data.info;
    const errorRate = total > 0 ? Math.round((data.errors / total) * 100) : 0;

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="px-4 py-3 rounded-xl shadow-lg border bg-white border-light-border dark:bg-dark-surface dark:border-dark-border">
                    <p className="text-sm font-bold mb-2 text-light-text-primary dark:text-dark-text-primary">
                        {label}
                    </p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-xs">
                            <div 
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-light-text-secondary dark:text-dark-text-secondary">
                                {entry.name}:
                            </span>
                            <span className="font-medium" style={{ color: entry.color }}>
                                {entry.value}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    const stats = [
        { 
            label: 'Errors', 
            value: data.errors, 
            icon: AlertTriangle, 
            color: '#DB4437',
            bg: 'bg-global-red/10'
        },
        { 
            label: 'Warnings', 
            value: data.warnings, 
            icon: AlertCircle, 
            color: '#F4B400',
            bg: 'bg-global-yellow/10'
        },
        { 
            label: 'Info', 
            value: data.info, 
            icon: Info, 
            color: '#4285F4',
            bg: 'bg-global-blue/10'
        },
    ];

    return (
        <div className="rounded-2xl overflow-hidden bg-white border-light-border dark:bg-dark-surface dark:border-dark-border border">
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between border-light-border dark:border-dark-border">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-navy to-indigo flex items-center justify-center">
                        <Terminal className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-light-text-primary dark:text-dark-text-primary">
                            Console Logs
                        </h3>
                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                            Last 24 hours
                        </p>
                    </div>
                </div>
                <span className={`
                    flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium
                    ${errorRate > 20 
                        ? 'bg-global-red/10 text-global-red' 
                        : errorRate > 10 
                            ? 'bg-global-yellow/10 text-global-yellow' 
                            : 'bg-global-green/10 text-global-green'}
                `}>
                    {errorRate}% Error Rate
                </span>
            </div>

            {/* Stats Summary */}
            <div className="px-6 py-4 grid grid-cols-3 gap-4 border-b border-light-border bg-light-surface-2/50 dark:border-dark-border dark:bg-dark-surface-2/50">
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className="text-center">
                            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg mb-2 ${stat.bg}`}>
                                <Icon className="w-5 h-5" style={{ color: stat.color }} />
                            </div>
                            <p className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                                {stat.value}
                            </p>
                            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                {stat.label}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Chart */}
            <div className="p-6">
                <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={defaultChartData}>
                        <defs>
                            <linearGradient id="errorGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#DB4437" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="#DB4437" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="warningGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#F4B400" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="#F4B400" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="infoGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#4285F4" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="#4285F4" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid 
                            strokeDasharray="3 3" 
                            className="stroke-black/5 dark:stroke-white/5"
                            vertical={false}
                        />
                        <XAxis 
                            dataKey="time" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11 }}
                            className="fill-gray-500 dark:fill-gray-400"
                        />
                        <YAxis 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11 }}
                            className="fill-gray-500 dark:fill-gray-400"
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area 
                            type="monotone" 
                            dataKey="errors" 
                            stroke="#DB4437" 
                            strokeWidth={2}
                            fill="url(#errorGradient)"
                            name="Errors"
                        />
                        <Area 
                            type="monotone" 
                            dataKey="warnings" 
                            stroke="#F4B400" 
                            strokeWidth={2}
                            fill="url(#warningGradient)"
                            name="Warnings"
                        />
                        <Area 
                            type="monotone" 
                            dataKey="info" 
                            stroke="#4285F4" 
                            strokeWidth={2}
                            fill="url(#infoGradient)"
                            name="Info"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t flex items-center justify-between border-light-border bg-light-surface-2 dark:border-dark-border dark:bg-dark-surface-2">
                <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                    Total: {total} logs captured
                </span>
                <button className="text-sm font-medium text-ember hover:text-wine transition-colors flex items-center gap-1">
                    View Terminal
                    <TrendingUp className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default LogsOverviewChart;
