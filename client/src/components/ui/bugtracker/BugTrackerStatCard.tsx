import type { FC } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface BugTrackerStatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: string;
    color: string;
}

export const BugTrackerStatCard: FC<BugTrackerStatCardProps> = ({ title, value, icon: Icon, trend, color }) => (
    <div className="stat-card">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">{title}</p>
                <h3 className="text-2xl font-bold mt-1 text-light-text-primary dark:text-dark-text-primary">{value}</h3>
            </div>
            <div className={`p-2 rounded-lg ${color} bg-opacity-10 text-opacity-100`}>
                <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
            </div>
        </div>
        {trend && (
            <div className="mt-4 flex items-center text-xs text-green">
                <span className="font-medium">{trend}</span>
                <span className="ml-1 text-light-text-secondary dark:text-dark-text-secondary">vs last week</span>
            </div>
        )}
    </div>
);
