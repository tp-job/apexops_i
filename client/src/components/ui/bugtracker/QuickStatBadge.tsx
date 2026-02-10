import type { FC } from 'react';

const QuickStatBadge: FC<{ label: string, value: string, color: 'ember' | 'indigo' | 'green', icon: any; }> = ({ label, value, color, icon }) => {
    const colorClasses = {
        ember: 'border-ember/30 text-ember',
        indigo: 'border-indigo/50 text-indigo',
        green: 'border-global-green/30 text-global-green',
    };

    return (
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 min-w-[100px] text-center hover:bg-white/15 transition-all duration-300 hover:scale-105 cursor-default">
            <div className={`flex items-center justify-center mb-2 ${colorClasses[color]}`}>
                {icon}
            </div>
            <div className="text-2xl font-bold text-white mb-1">{value}</div>
            <div className="text-xs text-white/60">{label}</div>
        </div>
    );
};

export default QuickStatBadge;
