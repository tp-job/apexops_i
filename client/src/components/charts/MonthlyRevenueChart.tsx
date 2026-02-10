import type { FC } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, ArrowUpRight } from 'lucide-react';

const MonthlyRevenueChart: FC = () => {
    const monthlyRevenue = [
        { month: 'Jan', revenue: 45000 },
        { month: 'Feb', revenue: 52000 },
        { month: 'Mar', revenue: 48000 },
        { month: 'Apr', revenue: 61000 },
        { month: 'May', revenue: 55000 },
        { month: 'Jun', revenue: 67000 }
    ];

    const totalRevenue = monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0);
    const avgRevenue = Math.round(totalRevenue / monthlyRevenue.length);
    const lastMonth = monthlyRevenue[monthlyRevenue.length - 1].revenue;
    const prevMonth = monthlyRevenue[monthlyRevenue.length - 2].revenue;
    const growth = Math.round(((lastMonth - prevMonth) / prevMonth) * 100);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="px-4 py-3 rounded-xl shadow-lg border bg-white border-light-border dark:bg-dark-surface dark:border-dark-border">
                    <p className="text-sm font-bold mb-1 text-light-text-primary dark:text-dark-text-primary">
                        {label}
                    </p>
                    <p className="text-ember font-bold text-lg">
                        ${payload[0].value.toLocaleString()}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="rounded-2xl overflow-hidden bg-white border-light-border dark:bg-dark-surface dark:border-dark-border border">
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between border-light-border dark:border-dark-border">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-wine to-ember flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-light-text-primary dark:text-dark-text-primary">
                            Monthly Revenue
                        </h3>
                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                            Last 6 months
                        </p>
                    </div>
                </div>
                <span className={`
                    flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium
                    ${growth > 0 
                        ? 'bg-global-green/10 text-global-green' 
                        : 'bg-global-red/10 text-global-red'}
                `}>
                    {growth > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : null}
                    {growth > 0 ? '+' : ''}{growth}%
                </span>
            </div>

            {/* Stats Summary */}
            <div className="px-6 py-4 grid grid-cols-3 gap-4 border-b border-light-border bg-light-surface-2/50 dark:border-dark-border dark:bg-dark-surface-2/50">
                <div>
                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                        Total Revenue
                    </p>
                    <p className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary">
                        ${(totalRevenue / 1000).toFixed(0)}k
                    </p>
                </div>
                <div>
                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                        Average
                    </p>
                    <p className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary">
                        ${(avgRevenue / 1000).toFixed(1)}k
                    </p>
                </div>
                <div>
                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                        This Month
                    </p>
                    <p className="text-lg font-bold text-ember">
                        ${(lastMonth / 1000).toFixed(0)}k
                    </p>
                </div>
            </div>

            {/* Chart */}
            <div className="p-6">
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={monthlyRevenue} barCategoryGap="20%">
                        <CartesianGrid 
                            strokeDasharray="3 3" 
                            className="stroke-black/5 dark:stroke-white/5"
                            vertical={false}
                        />
                        <XAxis 
                            dataKey="month" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12 }}
                            className="fill-gray-500 dark:fill-gray-400"
                        />
                        <YAxis 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12 }}
                            className="fill-gray-500 dark:fill-gray-400"
                            tickFormatter={(value) => `$${value / 1000}k`}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                        <Bar 
                            dataKey="revenue" 
                            fill="url(#revenueGradient)" 
                            radius={[8, 8, 0, 0]}
                        />
                        <defs>
                            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#F64668" />
                                <stop offset="100%" stopColor="#984063" />
                            </linearGradient>
                        </defs>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-light-border bg-light-surface-2 dark:border-dark-border dark:bg-dark-surface-2">
                <button className="w-full py-2 rounded-lg text-sm font-medium text-ember hover:bg-ember/10 transition-colors flex items-center justify-center gap-2">
                    <span>View Detailed Report</span>
                    <ArrowUpRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default MonthlyRevenueChart;
