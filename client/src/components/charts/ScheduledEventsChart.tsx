import type { FC } from 'react';
import { CalendarCheck, ChevronRight, Users, FlaskConical, Briefcase } from 'lucide-react';

const ScheduledEventsChart: FC = () => {
    const events = [
        { icon: <Users className="w-4 h-4" />, label: 'Consultations', count: 2, color: 'indigo' },
        { icon: <FlaskConical className="w-4 h-4" />, label: 'Laboratory analysis', count: 10, color: 'wine' },
        { icon: <Briefcase className="w-4 h-4" />, label: 'Meetings', count: 3, color: 'ember' },
    ];

    const total = events.reduce((sum, e) => sum + e.count, 0);
    const percentage = 95;

    const colorClasses = {
        indigo: { bg: 'bg-indigo/10', text: 'text-indigo', border: 'border-indigo/30' },
        wine: { bg: 'bg-wine/10', text: 'text-wine', border: 'border-wine/30' },
        ember: { bg: 'bg-ember/10', text: 'text-ember', border: 'border-ember/30' },
    };

    return (
        <div className="rounded-2xl overflow-hidden bg-white border-light-border dark:bg-dark-surface dark:border-dark-border border">
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between border-light-border dark:border-dark-border">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ember to-wine flex items-center justify-center">
                        <CalendarCheck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-light-text-primary dark:text-dark-text-primary">
                            Scheduled Events
                        </h3>
                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                            Today's overview
                        </p>
                    </div>
                </div>
                <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-ember text-white hover:bg-wine transition-colors">
                    Today
                </button>
            </div>

            {/* Content */}
            <div className="p-6">
                {/* Circular Progress */}
                <div className="flex items-center justify-center mb-6">
                    <div className="relative w-44 h-44">
                        <svg className="transform -rotate-90 w-44 h-44">
                            {/* Background circle */}
                            <circle 
                                cx="88" cy="88" r="70" 
                                className="stroke-black/5 dark:stroke-white/10"
                                strokeWidth="14" 
                                fill="none" 
                            />
                            {/* Progress circle */}
                            <circle
                                cx="88" cy="88" r="70"
                                stroke="url(#eventGradient)"
                                strokeWidth="14"
                                fill="none"
                                strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 70 * (percentage / 100)} ${2 * Math.PI * 70}`}
                                className="transition-all duration-1000 ease-out"
                            />
                            <defs>
                                <linearGradient id="eventGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#F64668" />
                                    <stop offset="50%" stopColor="#984063" />
                                    <stop offset="100%" stopColor="#41436A" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <div className="text-5xl font-bold text-light-text-primary dark:text-dark-text-primary">
                                {percentage}
                            </div>
                            <div className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">
                                % Complete
                            </div>
                        </div>
                    </div>
                </div>

                {/* Events List */}
                <div className="space-y-3">
                    {events.map((event, index) => {
                        const colors = colorClasses[event.color as keyof typeof colorClasses];
                        return (
                            <div 
                                key={index}
                                className="group flex items-center justify-between p-3 rounded-xl bg-light-surface-2 hover:bg-light-border dark:bg-dark-surface-2 dark:hover:bg-dark-border transition-all duration-200 cursor-pointer"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors.bg} ${colors.text}`}>
                                        {event.icon}
                                    </div>
                                    <span className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                                        {event.label}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2.5 py-1 rounded-lg text-sm font-bold ${colors.bg} ${colors.text}`}>
                                        {event.count}
                                    </span>
                                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-light-text-secondary dark:text-dark-text-secondary" />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer Stats */}
                <div className="mt-4 pt-4 border-t flex items-center justify-between border-light-border dark:border-dark-border">
                    <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        Total scheduled
                    </span>
                    <span className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary">
                        {total} events
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ScheduledEventsChart;
