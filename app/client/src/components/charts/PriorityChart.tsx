import type { FC } from 'react';
import { AlertTriangle, AlertCircle, AlertOctagon, Info, Target } from 'lucide-react';

interface PriorityChartProps {
    data: {
        critical: number;
        high: number;
        medium: number;
        low: number;
    };
}

const PriorityChart: FC<PriorityChartProps> = ({ data }) => {
    const priorities = [
        {
            name: 'Critical',
            value: data.critical,
            color: '#ef4444', // red
            icon: AlertOctagon,
            description: 'Requires immediate attention'
        },
        {
            name: 'High',
            value: data.high,
            color: '#f59e0b', // amber
            icon: AlertTriangle,
            description: 'Should be addressed soon'
        },
        {
            name: 'Medium',
            value: data.medium,
            color: '#9CB3C4', // brand-steel
            icon: AlertCircle,
            description: 'Normal priority'
        },
        {
            name: 'Low',
            value: data.low,
            color: '#84cc16', // lime-600
            icon: Info,
            description: 'Can be handled later'
        },
    ];

    const total = priorities.reduce((sum, p) => sum + p.value, 0);
    const maxValue = Math.max(...priorities.map(p => p.value));

    return (
        <div className="glass-panel rounded-3xl overflow-hidden flex flex-col h-full">
            {/* Header */}
            <div className="px-6 py-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-accent/20 text-brand-dark dark:text-brand-accent flex items-center justify-center">
                        <Target className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-brand-dark dark:text-white font-heading">
                            Priority Breakdown
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Tickets by urgency level
                        </p>
                    </div>
                </div>
                {data.critical > 0 && (
                    <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-red-500/10 text-red-500 animate-pulse">
                        {data.critical} Critical!
                    </span>
                )}
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
                {priorities.map((priority) => {
                    const percentage = total > 0 ? Math.round((priority.value / total) * 100) : 0;
                    const barWidth = maxValue > 0 ? (priority.value / maxValue) * 100 : 0;
                    const Icon = priority.icon;

                    return (
                        <div key={priority.name} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-8 h-8 rounded-xl flex items-center justify-center"
                                        style={{ backgroundColor: `${priority.color}1f` }}
                                    >
                                        <Icon className="w-4 h-4" style={{ color: priority.color }} />
                                    </div>
                                    <div>
                                        <span className="text-sm font-bold text-brand-dark dark:text-white">
                                            {priority.name}
                                        </span>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {priority.description}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-bold font-numbers text-brand-dark dark:text-white">
                                        {priority.value}
                                    </span>
                                    <span className="text-xs ml-1 font-numbers text-gray-500 dark:text-gray-400">
                                        ({percentage}%)
                                    </span>
                                </div>
                            </div>
                            <div className="w-full rounded-full h-2.5 overflow-hidden bg-black/[0.05] dark:bg-white/5">
                                <div
                                    className="h-full rounded-full transition-all duration-700 ease-out"
                                    style={{
                                        width: `${barWidth}%`,
                                        backgroundColor: priority.color
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Summary */}
            <div className="mx-6 mb-4 p-4 rounded-xl bg-black/[0.03] dark:bg-white/5">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Total Active Tickets
                        </p>
                        <p className="text-2xl font-bold font-numbers text-brand-dark dark:text-white">
                            {total}
                        </p>
                    </div>
                    <div className="flex -space-x-2">
                        {priorities.map((p, i) => (
                            <div
                                key={i}
                                className="w-8 h-8 rounded-full border-2 border-white dark:border-brand-nearBlack2 flex items-center justify-center text-xs font-bold font-numbers text-white"
                                style={{ backgroundColor: p.color }}
                            >
                                {p.value}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PriorityChart;
