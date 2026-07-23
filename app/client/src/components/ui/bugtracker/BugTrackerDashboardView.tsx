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
                <BugTrackerStatCard title="Total Tickets" value={totalTickets} icon={Bug} color="bg-brand-accent" />
                <BugTrackerStatCard title="Critical Issues" value={criticalTickets} icon={AlertCircle} color="bg-white/10" />
                <BugTrackerStatCard title="Resolved" value={resolvedTickets} icon={CheckCircle2} color="bg-brand-accent" />
                <BugTrackerStatCard title="Error Logs" value={errorLogs} icon={Terminal} color="bg-white/10" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-panel p-6 rounded-3xl">
                    <h3 className="text-lg font-bold mb-4 text-brand-dark font-heading">Recent Activity</h3>
                    <div className="space-y-4">
                        {tickets.slice(0, 5).map((ticket) => (
                            <div
                                key={ticket.id}
                                className="flex items-center gap-3 pb-3 border-b border-white/10 last:border-0 last:pb-0"
                            >
                                <div
                                    className={`w-2 h-2 rounded-full ${ticket.status === 'resolved' ? 'bg-brand-accent' : 'bg-gray-400'}`}
                                />
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-brand-dark uppercase tracking-wide">
                                        {ticket.title}
                                    </p>
                                    <p className="text-[10px] font-bold font-numbers text-gray-500 uppercase tracking-widest">
                                        {new Date(ticket.updatedAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <span className="text-[10px] font-bold font-numbers bg-white/5 border border-white/10 px-2 py-1 rounded-xl text-gray-400 uppercase tracking-widest">
                                    {ticket.status}
                                </span>
                            </div>
                        ))}
                        {tickets.length === 0 && (
                            <p className="text-gray-400 text-sm">
                                No recent activity
                            </p>
                        )}
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-3xl">
                    <h3 className="text-lg font-bold mb-4 text-brand-dark font-heading">System Health</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Error Rate</span>
                            <span className="text-sm font-bold font-numbers text-brand-accent">
                                {logs.length > 0 ? ((errorLogs / logs.length) * 100).toFixed(1) : 0}%
                            </span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-2 border border-white/5">
                            <div
                                className="bg-brand-accent h-2 rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(197,244,58,0.3)]"
                                style={{
                                    width: `${logs.length > 0 ? (errorLogs / logs.length) * 100 : 0}%`,
                                }}
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-2 font-numbers">
                            Based on {logs.length} captured logs
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
