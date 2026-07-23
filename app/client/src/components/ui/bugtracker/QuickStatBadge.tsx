import type { FC } from 'react';

const QuickStatBadge: FC<{ label: string, value: string, color: 'ember' | 'indigo' | 'green', icon: any; }> = ({ label, value, color, icon }) => {
    const colorClasses = {
        ember: 'border-brand-accent/30 text-brand-accent',
        indigo: 'border-blue-400/50 text-blue-400',
        green: 'border-green-400/30 text-green-400',
    };

    return (
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 min-w-[100px] text-center hover:bg-white/15 transition-all duration-300 hover:scale-105 cursor-default">
            <div className={`flex items-center justify-center mb-2 ${colorClasses[color]}`}>
                {icon}
            </div>
            <div className="text-2xl font-bold font-numbers text-white mb-1">{value}</div>
            <div className="text-xs text-white/60 uppercase tracking-wider">{label}</div>
        </div>
    );
};

export default QuickStatBadge;
