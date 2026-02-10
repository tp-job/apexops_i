import type { FC } from 'react';
import { 
    Activity, Bug, CheckCircle2, Clock, AlertTriangle, 
    ChevronRight, Plus
} from 'lucide-react';
import type { Ticket, Log } from '@/types/bugTrackerApp';

interface RecentActivityListProps {
    tickets: Ticket[];
    logs: Log[];
}

type ActivityItem = {
    id: string;
    type: 'ticket_created' | 'ticket_updated' | 'ticket_resolved' | 'log_error' | 'log_warning';
    title: string;
    description: string;
    timestamp: string;
    priority?: string;
    status?: string;
};

const RecentActivityList: FC<RecentActivityListProps> = ({ tickets, logs }) => {
    // Combine and sort activities
    const activities: ActivityItem[] = [
        ...tickets.slice(0, 5).map(ticket => ({
            id: ticket.id,
            type: ticket.status === 'resolved' ? 'ticket_resolved' as const : 
                  ticket.status === 'open' ? 'ticket_created' as const : 'ticket_updated' as const,
            title: ticket.title,
            description: `${ticket.priority} priority • ${ticket.assignee || 'Unassigned'}`,
            timestamp: ticket.updatedAt,
            priority: ticket.priority,
            status: ticket.status
        })),
        ...logs.slice(0, 3).map(log => ({
            id: log.id,
            type: log.level === 'error' ? 'log_error' as const : 'log_warning' as const,
            title: log.message.substring(0, 50) + (log.message.length > 50 ? '...' : ''),
            description: `From ${log.source}`,
            timestamp: log.timestamp,
        }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 8);

    const getActivityStyle = (type: ActivityItem['type']) => {
        switch (type) {
            case 'ticket_created':
                return { icon: Bug, color: 'text-ember', bg: 'bg-ember/10', border: 'border-ember/30' };
            case 'ticket_updated':
                return { icon: Clock, color: 'text-indigo', bg: 'bg-indigo/10', border: 'border-indigo/30' };
            case 'ticket_resolved':
                return { icon: CheckCircle2, color: 'text-global-green', bg: 'bg-global-green/10', border: 'border-global-green/30' };
            case 'log_error':
                return { icon: AlertTriangle, color: 'text-global-red', bg: 'bg-global-red/10', border: 'border-global-red/30' };
            case 'log_warning':
                return { icon: AlertTriangle, color: 'text-global-yellow', bg: 'bg-global-yellow/10', border: 'border-global-yellow/30' };
            default:
                return { icon: Activity, color: 'text-gray-500', bg: 'bg-gray-100', border: 'border-gray-200' };
        }
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    return (
        <div className="rounded-2xl overflow-hidden bg-white border-light-border dark:bg-dark-surface dark:border-dark-border border">
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between border-light-border bg-light-surface-2 dark:border-dark-border dark:bg-dark-surface-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo to-wine flex items-center justify-center">
                        <Activity className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-light-text-primary dark:text-dark-text-primary">
                            Recent Activity
                        </h3>
                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                            Latest updates & events
                        </p>
                    </div>
                </div>
                <button className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-light-surface-2 hover:bg-light-border text-light-text-secondary dark:bg-dark-surface dark:hover:bg-dark-border dark:text-dark-text-secondary">
                    View All
                </button>
            </div>

            {/* Activity List */}
            <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                {activities.length === 0 ? (
                    <div className="text-center py-8 text-light-text-secondary dark:text-dark-text-secondary">
                        <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No recent activity</p>
                    </div>
                ) : (
                    activities.map((activity, index) => {
                        const style = getActivityStyle(activity.type);
                        const Icon = style.icon;
                        
                        return (
                            <div 
                                key={activity.id}
                                className="group relative p-4 rounded-xl border transition-all duration-300 bg-light-surface-2/50 border-light-border hover:bg-light-surface-2 dark:bg-dark-surface-2/50 dark:border-dark-border dark:hover:bg-dark-surface-2 hover:shadow-md cursor-pointer"
                            >
                                <div className="flex items-start gap-4">
                                    {/* Icon */}
                                    <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${style.bg} ${style.border} border`}>
                                        <Icon className={`w-5 h-5 ${style.color}`} />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            {activity.priority && (
                                                <span className={`
                                                    px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                                                    ${activity.priority === 'critical' ? 'bg-global-red/10 text-global-red' :
                                                      activity.priority === 'high' ? 'bg-ember/10 text-ember' :
                                                      activity.priority === 'medium' ? 'bg-global-yellow/10 text-global-yellow' :
                                                      'bg-global-green/10 text-global-green'}
                                                `}>
                                                    {activity.priority}
                                                </span>
                                            )}
                                            {activity.status && (
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${style.bg} ${style.color}`}>
                                                    {activity.status}
                                                </span>
                                            )}
                                        </div>
                                        <h4 className="font-medium text-sm mb-1 line-clamp-1 text-light-text-primary dark:text-dark-text-primary">
                                            {activity.title}
                                        </h4>
                                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                            {activity.description}
                                        </p>
                                    </div>

                                    {/* Time */}
                                    <div className="shrink-0 text-right">
                                        <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                            {formatTime(activity.timestamp)}
                                        </span>
                                    </div>

                                    {/* Arrow */}
                                    <ChevronRight className="w-5 h-5 shrink-0 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1 text-light-text-secondary dark:text-dark-text-secondary" />
                                </div>

                                {/* First item indicator */}
                                {index === 0 && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-gradient-to-b from-ember to-wine" />
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-light-border bg-light-surface-2 dark:border-dark-border dark:bg-dark-surface-2">
                <button className="w-full py-2 rounded-lg text-sm font-medium text-ember hover:bg-ember/10 transition-colors flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" />
                    <span>Create New Ticket</span>
                </button>
            </div>
        </div>
    );
};

export default RecentActivityList;
