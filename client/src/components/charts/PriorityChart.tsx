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
            color: '#DB4437', 
            bgColor: 'bg-global-red/10',
            icon: AlertOctagon,
            description: 'Requires immediate attention'
        },
        { 
            name: 'High', 
            value: data.high, 
            color: '#F64668', 
            bgColor: 'bg-ember/10',
            icon: AlertTriangle,
            description: 'Should be addressed soon'
        },
        { 
            name: 'Medium', 
            value: data.medium, 
            color: '#F4B400', 
            bgColor: 'bg-global-yellow/10',
            icon: AlertCircle,
            description: 'Normal priority'
        },
        { 
            name: 'Low', 
            value: data.low, 
            color: '#0F9D58', 
            bgColor: 'bg-global-green/10',
            icon: Info,
            description: 'Can be handled later'
        },
    ];

    const total = priorities.reduce((sum, p) => sum + p.value, 0);
    const maxValue = Math.max(...priorities.map(p => p.value));

    return (
        <div className="rounded-2xl overflow-hidden bg-white border-light-border dark:bg-dark-surface dark:border-dark-border border">
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between border-light-border dark:border-dark-border">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-global-red to-ember flex items-center justify-center">
                        <Target className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-light-text-primary dark:text-dark-text-primary">
                            Priority Breakdown
                        </h3>
                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                            Tickets by urgency level
                        </p>
                    </div>
                </div>
                {data.critical > 0 && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-global-red/10 text-global-red animate-pulse">
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
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${priority.bgColor}`}
                                    >
                                        <Icon className="w-4 h-4" style={{ color: priority.color }} />
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                                            {priority.name}
                                        </span>
                                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                            {priority.description}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary">
                                        {priority.value}
                                    </span>
                                    <span className="text-xs ml-1 text-light-text-secondary dark:text-dark-text-secondary">
                                        ({percentage}%)
                                    </span>
                                </div>
                            </div>
                            <div className="w-full rounded-full h-2.5 overflow-hidden bg-light-surface-2 dark:bg-dark-surface-2">
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
            <div className="mx-6 mb-4 p-4 rounded-xl bg-light-surface-2 dark:bg-dark-surface-2">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                            Total Active Tickets
                        </p>
                        <p className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                            {total}
                        </p>
                    </div>
                    <div className="flex -space-x-2">
                        {priorities.map((p, i) => (
                            <div 
                                key={i}
                                className="w-8 h-8 rounded-full border-2 border-white dark:border-dark-surface flex items-center justify-center text-xs font-bold text-white"
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
