import type { FC } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Ticket, ChevronRight, CircleDot, Clock, CheckCircle2, XCircle } from 'lucide-react';

interface TicketStatusChartProps {
    data: {
        open: number;
        inProgress: number;
        resolved: number;
        closed: number;
    };
}

const TicketStatusChart: FC<TicketStatusChartProps> = ({ data }) => {
    const chartData = [
        { name: 'Open', value: data.open, color: '#F64668', icon: CircleDot },
        { name: 'In Progress', value: data.inProgress, color: '#41436A', icon: Clock },
        { name: 'Resolved', value: data.resolved, color: '#0F9D58', icon: CheckCircle2 },
        { name: 'Closed', value: data.closed, color: '#6B7280', icon: XCircle },
    ];

    const total = chartData.reduce((sum, item) => sum + item.value, 0);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const percentage = total > 0 ? Math.round((data.value / total) * 100) : 0;
            return (
                <div className="px-3 py-2 rounded-lg shadow-lg border bg-white border-light-border dark:bg-dark-surface dark:border-dark-border">
                    <p className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                        {data.name}
                    </p>
                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                        {data.value} tickets ({percentage}%)
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
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ember to-wine flex items-center justify-center">
                        <Ticket className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-light-text-primary dark:text-dark-text-primary">
                            Ticket Status
                        </h3>
                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                            Distribution overview
                        </p>
                    </div>
                </div>
                <span className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                    {total} Total
                </span>
            </div>

            {/* Chart */}
            <div className="p-6">
                <div className="flex items-center justify-center mb-6">
                    <div className="relative">
                        <ResponsiveContainer width={180} height={180}>
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={3}
                                    dataKey="value"
                                    strokeWidth={0}
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={entry.color}
                                            className="hover:opacity-80 transition-opacity cursor-pointer"
                                        />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary">
                                {total}
                            </span>
                            <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                Tickets
                            </span>
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div className="space-y-2">
                    {chartData.map((item) => {
                        const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
                        const Icon = item.icon;
                        return (
                            <div 
                                key={item.name}
                                className="group flex items-center justify-between p-3 rounded-xl bg-light-surface-2 hover:bg-light-border dark:bg-dark-surface-2 dark:hover:bg-dark-border transition-all duration-200 cursor-pointer"
                            >
                                <div className="flex items-center gap-3">
                                    <div 
                                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                                        style={{ backgroundColor: `${item.color}20` }}
                                    >
                                        <Icon className="w-4 h-4" style={{ color: item.color }} />
                                    </div>
                                    <span className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                                        {item.name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-light-text-primary dark:text-dark-text-primary">
                                        {item.value}
                                    </span>
                                    <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                        ({percentage}%)
                                    </span>
                                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-light-text-secondary dark:text-dark-text-secondary" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default TicketStatusChart;
