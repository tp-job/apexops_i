import type { FC } from 'react';
import { Bug, AlertCircle, CheckCircle2, Terminal } from 'lucide-react';
import type { Log, Ticket } from '@/types/bugTrackerApp';
import { BugTrackerStatCard } from './BugTrackerStatCard';

export interface BugTrackerDashboardViewProps {
    tickets: Ticket[];
    logs: Log[];
}

export const BugTrackerDashboardView: FC<BugTrackerDashboardViewProps> = ({ tickets, logs }) => {
    const totalTickets = tickets.length;
    const criticalTickets = tickets.filter((t) => t.priority === 'critical').length;
    const resolvedTickets = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;
    const errorLogs = logs.filter((l) => l.level === 'error').length;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <BugTrackerStatCard title="Total Tickets" value={totalTickets} icon={Bug} color="bg-blue-primary" />
                <BugTrackerStatCard title="Critical Issues" value={criticalTickets} icon={AlertCircle} color="bg-orange-primary" />
                <BugTrackerStatCard title="Resolved" value={resolvedTickets} icon={CheckCircle2} color="bg-green" />
                <BugTrackerStatCard title="Error Logs" value={errorLogs} icon={Terminal} color="bg-orange-primary" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card-modern p-6">
                    <h3 className="text-lg font-bold mb-4 dark:text-white">Recent Activity</h3>
                    <div className="space-y-4">
                        {tickets.slice(0, 5).map((ticket) => (
                            <div
                                key={ticket.id}
                                className="flex items-center gap-3 pb-3 border-b border-light-border dark:border-dark-border last:border-0 last:pb-0"
                            >
                                <div
                                    className={`w-2 h-2 rounded-full ${ticket.status === 'resolved' ? 'bg-green' : 'bg-blue-primary'}`}
                                />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                                        {ticket.title}
                                    </p>
                                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                        {new Date(ticket.updatedAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <span className="text-xs font-mono bg-light-surface-2 dark:bg-white/10 px-2 py-1 rounded text-light-text-secondary dark:text-dark-text-secondary">
                                    {ticket.status}
                                </span>
                            </div>
                        ))}
                        {tickets.length === 0 && (
                            <p className="text-light-text-secondary dark:text-dark-text-secondary text-sm">
                                No recent activity
                            </p>
                        )}
                    </div>
                </div>

                <div className="card-modern p-6">
                    <h3 className="text-lg font-bold mb-4 dark:text-white">System Health</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-light-text dark:text-dark-text">Error Rate</span>
                            <span className="text-sm font-bold text-orange-primary">
                                {logs.length > 0 ? ((errorLogs / logs.length) * 100).toFixed(1) : 0}%
                            </span>
                        </div>
                        <div className="w-full bg-light-surface-2 dark:bg-dark-surface-2 rounded-full h-2">
                            <div
                                className="bg-orange-primary h-2 rounded-full transition-all duration-500"
                                style={{
                                    width: `${logs.length > 0 ? (errorLogs / logs.length) * 100 : 0}%`,
                                }}
                            />
                        </div>
                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-2">
                            Based on {logs.length} captured logs
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
