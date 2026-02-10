import { useState, useEffect, type FC } from 'react';
import type { Ticket as TicketType, Log } from '@/types/bugTrackerApp';
import { ticketsAPI, logsAPI } from '@/services/api';
// components
import WelcomeCard from '@/components/ui/bugtracker/WelcomeCard';
import StatsCard from '@/components/ui/dashboard/StatsCard';
import TicketStatusChart from '@/components/charts/TicketStatusChart';
import PriorityChart from '@/components/charts/PriorityChart';
import LogsOverviewChart from '@/components/charts/LogsOverviewChart';
import RecentActivityList from '@/components/charts/RecentActivityList';
import CalendarNotes from '@/components/charts/CalendarNotes';
import NoteStatsChart from '@/components/charts/NoteStatsChart';
import NoteActivityChart from '@/components/charts/NoteActivityChart';
import LoadingSpinner from '@/components/common/alert/LoadingSpinner';
import QuickActionsBar from '@/components/ui/dashboard/QuickActionsBar';

const Dashboard: FC = () => {
    // data states
    const [tickets, setTickets] = useState<TicketType[]>([]);
    const [logs, setLogs] = useState<Log[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // fetch data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [ticketsData, logsData] = await Promise.all([
                    ticketsAPI.getAll(),
                    logsAPI.getAll()
                ]);
                setTickets(ticketsData || []);
                setLogs(logsData || []);
            } catch (err: any) {
                console.error('Failed to fetch data:', err);
                setError('Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // calculate stats
    const ticketStats = {
        open: tickets.filter(t => t.status === 'open').length,
        inProgress: tickets.filter(t => t.status === 'in-progress').length,
        resolved: tickets.filter(t => t.status === 'resolved').length,
        closed: tickets.filter(t => t.status === 'closed').length,
    };

    const priorityStats = {
        critical: tickets.filter(t => t.priority === 'critical').length,
        high: tickets.filter(t => t.priority === 'high').length,
        medium: tickets.filter(t => t.priority === 'medium').length,
        low: tickets.filter(t => t.priority === 'low').length,
    };

    const logStats = {
        errors: logs.filter(l => l.level === 'error').length,
        warnings: logs.filter(l => l.level === 'warning').length,
        info: logs.filter(l => l.level === 'info').length,
    };

    const totalTickets = tickets.length;
    const resolvedRate = totalTickets > 0 ? Math.round((ticketStats.resolved / totalTickets) * 100) : 0;

    // weekly trend data (mock for now - would come from API in production)
    const weeklyTrend = [
        { week: 'W1', tickets: 12 },
        { week: 'W2', tickets: 18 },
        { week: 'W3', tickets: 15 },
        { week: 'W4', tickets: totalTickets },
    ];

    if (loading) return <LoadingSpinner />;

    return (
        <main className="min-h-screen transition-colors duration-300">
            {/* main content */}
            <section className="relative z-10 p-6 lg:p-8 max-w-[1800px] mx-auto transition-colors duration-300">
                {/* error notification */}
                {error && (
                    <section className="fixed bottom-6 right-6 z-50">
                        <div className="flex items-center justify-between gap-4 w-[320px] rounded-xl bg-gradient-to-br from-navy via-indigo to-wine border-navy px-4 py-3 shadow-xl animate-slide-up">
                            <article className="flex items-start gap-3">
                                <div className="text-global-red bg-global-red/10 p-2 rounded-lg">
                                    <i className="ri-error-warning-line text-lg"></i>
                                </div>
                                <div className="text-sm">
                                    <p className="text-global-red font-medium">Action failed</p>
                                    <p className="text-dark-text-secondary text-xs mt-0.5">{error}</p>
                                </div>
                            </article>
                            <article className="flex items-center gap-2">
                                <button onClick={() => window.location.reload()} className="text-xs text-global-red hover:text-global-redpink transition">Retry</button>
                                <button onClick={() => setError(null)} className="text-light-surface transition" aria-label="Close">
                                    <i className="ri-close-line"></i>
                                </button>
                            </article>
                        </div>
                    </section>
                )}

                {/* welcome card - full width */}
                <WelcomeCard userName="Developer" ticketStats={{ open: ticketStats.open, inProgress: ticketStats.inProgress, resolved: ticketStats.resolved, critical: priorityStats.critical }} />

                {/* stats card grid - full width */}
                <article className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatsCard title="Total Tickets" value={totalTickets} subtitle="All tickets" description="in the system" data={weeklyTrend} dataKey="tickets" color="indigo" trend={15} icon={<i className="ri-coupon-3-line"></i>} />
                    <StatsCard title="Open Issues" value={ticketStats.open} subtitle="Need attention" description="waiting to be fixed" color="ember" trend={ticketStats.open > 5 ? -8 : 12} icon={<i className="ri-bug-line"></i>} />
                    <StatsCard title="In Progress" value={ticketStats.inProgress} subtitle="Being worked on" description="by the team" color="wine" icon={<i className="ri-time-line"></i>} />
                    <StatsCard title="Resolved" value={`${resolvedRate}%`} subtitle="Resolution rate" description={`${ticketStats.resolved} tickets fixed`} color="green" trend={resolvedRate > 50 ? 5 : -5} icon={<i className="ri-checkbox-circle-line"></i>} />
                </article>

                {/* main content grid */}
                <article className="mt-6 grid grid-cols-1 gap-6">
                    {/* ticket overview - 3 chart (2 row) */}
                    <section className="grid grid-cols-1 w-full space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <TicketStatusChart data={ticketStats} />
                            <PriorityChart data={priorityStats} />
                        </div>
                        <LogsOverviewChart data={logStats} />
                    </section>
                    {/* workspace overview - Calendar & Activity (2 cols) */}
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <RecentActivityList tickets={tickets} logs={logs} />
                        <CalendarNotes />
                    </section>
                    {/* note overview - Notes & Actions (2 cols) */}
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <NoteStatsChart />
                        <NoteActivityChart />
                    </section>
                    {/* quick actions */}
                    <QuickActionsBar />
                </article>
            </section>
        </main>
    );
};

export default Dashboard;
