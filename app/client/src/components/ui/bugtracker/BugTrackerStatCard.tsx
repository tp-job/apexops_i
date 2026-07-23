import type { FC } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface BugTrackerStatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: string;
    color: string;
}

export const BugTrackerStatCard: FC<BugTrackerStatCardProps> = ({ title, value, icon: Icon, trend, color }) => {
    const isBrand = color.includes('brand-accent');
    return (
        <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:border-white/20">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{title}</p>
                    <h3 className="text-3xl font-bold font-numbers mt-3 text-brand-dark">{value}</h3>
                </div>
                <div className={`p-3 rounded-2xl ${isBrand ? 'bg-brand-accent text-brand-dark shadow-lg -accent/20' : 'bg-white/5 text-gray-400 border border-white/10'}`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
            {trend && (
                <div className="mt-4 flex items-center text-[10px] font-bold uppercase tracking-widest text-brand-accent">
                    <span className="">{trend}</span>
                    <span className="ml-2 text-gray-500">vs last week</span>
                </div>
            )}
        </div>
    );
};
