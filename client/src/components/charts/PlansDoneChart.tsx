import type { FC } from 'react';
import { Plus, Target, CheckCircle2, Clock } from 'lucide-react';

interface PlanItem {
    label: string;
    done: number;
    total: number;
    color: 'indigo' | 'wine' | 'ember' | 'peach';
}

const PlansDoneChart: FC = () => {
    const plans: PlanItem[] = [
        { label: 'Consultations', done: 8, total: 10, color: 'indigo' },
        { label: 'Laboratory analysis', done: 6, total: 10, color: 'wine' },
        { label: 'Meetings', done: 2, total: 3, color: 'ember' },
        { label: 'Reports', done: 4, total: 5, color: 'peach' },
    ];

    const totalDone = plans.reduce((sum, p) => sum + p.done, 0);
    const totalPlans = plans.reduce((sum, p) => sum + p.total, 0);
    const overallPercentage = Math.round((totalDone / totalPlans) * 100);

    const colorMap = {
        indigo: { from: 'from-indigo', to: 'to-wine', text: 'text-indigo', bg: 'bg-indigo' },
        wine: { from: 'from-wine', to: 'to-ember', text: 'text-wine', bg: 'bg-wine' },
        ember: { from: 'from-ember', to: 'to-peach', text: 'text-ember', bg: 'bg-ember' },
        peach: { from: 'from-peach', to: 'to-ember', text: 'text-peach', bg: 'bg-peach' },
    };

    return (
        <div className="rounded-2xl overflow-hidden bg-white border-light-border dark:bg-dark-surface dark:border-dark-border border">
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between border-light-border dark:border-dark-border">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo to-wine flex items-center justify-center">
                        <Target className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-light-text-primary dark:text-dark-text-primary">
                            Plans Progress
                        </h3>
                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                            Today's tasks
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`
                        px-3 py-1.5 rounded-lg text-xs font-bold
                        ${overallPercentage >= 70 
                            ? 'bg-global-green/10 text-global-green' 
                            : overallPercentage >= 50 
                                ? 'bg-global-yellow/10 text-global-yellow' 
                                : 'bg-global-red/10 text-global-red'}
                    `}>
                        {overallPercentage}% Done
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
                {plans.map((plan, index) => {
                    const percentage = Math.round((plan.done / plan.total) * 100);
                    const colors = colorMap[plan.color];
                    
                    return (
                        <div key={index} className="group">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${colors.bg}`} />
                                    <span className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                                        {plan.label}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                                        {plan.done}/{plan.total}
                                    </span>
                                    {percentage === 100 ? (
                                        <CheckCircle2 className="w-4 h-4 text-global-green" />
                                    ) : (
                                        <Clock className="w-4 h-4 text-light-text-secondary dark:text-dark-text-secondary" />
                                    )}
                                </div>
                            </div>
                            <div className="w-full rounded-full h-2.5 overflow-hidden bg-light-surface-2 dark:bg-dark-surface-2">
                                <div 
                                    className={`h-full rounded-full bg-gradient-to-r ${colors.from} ${colors.to} transition-all duration-500 ease-out`}
                                    style={{ width: `${percentage}%` }}
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
                            Completed today
                        </p>
                        <p className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                            {totalDone} <span className="text-sm font-normal opacity-50">/ {totalPlans}</span>
                        </p>
                    </div>
                    <div className="w-16 h-16 relative">
                        <svg className="transform -rotate-90 w-16 h-16">
                            <circle 
                                cx="32" cy="32" r="26" 
                                className="stroke-black/5 dark:stroke-white/10"
                                strokeWidth="6" 
                                fill="none" 
                            />
                            <circle
                                cx="32" cy="32" r="26"
                                stroke="url(#planGradient)"
                                strokeWidth="6"
                                fill="none"
                                strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 26 * (overallPercentage / 100)} ${2 * Math.PI * 26}`}
                            />
                            <defs>
                                <linearGradient id="planGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#41436A" />
                                    <stop offset="100%" stopColor="#F64668" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-bold text-light-text-primary dark:text-dark-text-primary">
                                {overallPercentage}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-light-border bg-light-surface-2 dark:border-dark-border dark:bg-dark-surface-2">
                <button className="w-full py-2 rounded-lg text-sm font-medium text-ember hover:bg-ember/10 transition-colors flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" />
                    <span>Add New Plan</span>
                </button>
            </div>
        </div>
    );
};

export default PlansDoneChart;
