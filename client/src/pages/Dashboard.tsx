import { useState, useEffect, type FC } from 'react';
import { getIcon } from '@/utils/iconMapping';
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
    const [apiReachable, setApiReachable] = useState<boolean | null>(null);
    const [isOfflineMock, setIsOfflineMock] = useState(false);

    // fetch data
    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('accessToken');

            // 如果尚未登入，就不要打需要驗證的 API，避免 401 error 汙染 console
            if (!token) {
                setTickets([]);
                setLogs([]);
                setApiReachable(false);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const [ticketsData, logsData] = await Promise.all([
                    ticketsAPI.getAll(),
                    logsAPI.getAll()
                ]);
                const offlineMockUsed = !!(ticketsData as any)?.__isMock || !!(logsData as any)?.__isMock;
                setIsOfflineMock(offlineMockUsed);
                setTickets(ticketsData || []);
                setLogs(logsData || []);
                setApiReachable(!offlineMockUsed);
            } catch {
                // Offline/API unreachable: 只更新狀態，不再在 console 印錯誤
                setTickets([]);
                setLogs([]);
                setApiReachable(false);
                setIsOfflineMock(false);
            } finally {
                setLoading(false);
            }
        };
        void fetchData();
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

    const buildWeeklyTrend = (items: TicketType[]) => {
        if (!items.length) return [];
        const now = new Date();
        const buckets = Array.from({ length: 4 }).map((_, idx) => {
            const start = new Date(now);
            start.setDate(now.getDate() - (3 - idx) * 7);
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(start.getDate() + 7);
            const count = items.filter((t) => {
                const d = new Date(t.createdAt || t.updatedAt);
                return d >= start && d < end;
            }).length;
            const label = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return { week: label, tickets: count };
        });
        return buckets;
    };

    // Check connection states
    const isApiOffline = apiReachable === false && !isOfflineMock;
    const isApiOnline = apiReachable === true;
    const hasNoData = !loading && (isApiOnline || isOfflineMock) && tickets.length === 0 && logs.length === 0;
    const isConnected = isApiOnline || isOfflineMock;
    const weeklyTrend = isConnected ? buildWeeklyTrend(tickets) : [];

    return (
        <main className="min-h-screen bg-light-bg dark:bg-dark-bg transition-colors duration-300">
            {/* main content */}
            <section className="relative z-10 p-6 lg:p-8 max-w-[1800px] mx-auto transition-colors duration-300">
                {/* Loading State */}
                {loading && <LoadingSpinner />}

                {/* API Offline Banner */}
                {isApiOffline && (
                    <div className="mb-6 rounded-xl bg-orange-primary/10 dark:bg-orange-primary/20 border border-orange-primary/30 px-4 py-3 flex items-center gap-3 animate-fade-in">
                        <div className="shrink-0">
                            {(() => {
                                const Icon = getIcon('ri-alert-line');
                                return Icon ? <Icon className="text-orange-primary text-lg transition-colors duration-200" /> : null;
                            })()}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-orange-primary">
                                API is offline
                            </p>
                            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-0.5">
                                Showing dashboard layout only. Start the server / connect PostgreSQL to load real metrics.
                            </p>
                        </div>
                    </div>
                )}

                {/* Offline Mock Banner */}
                {isOfflineMock && (
                    <div className="mb-6 rounded-xl bg-blue-primary/10 dark:bg-blue-primary/20 border border-blue-primary/30 px-4 py-3 flex items-center gap-3 animate-fade-in">
                        <div className="shrink-0">
                            {(() => {
                                const Icon = getIcon('ri-wifi-off-line');
                                return Icon ? <Icon className="text-blue-primary text-lg transition-colors duration-200" /> : null;
                            })()}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-blue-primary">
                                后端不可达（Mock 预览）
                            </p>
                            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-0.5">
                                当前展示的是 mock 数据（只读）。启动后端服务后将自动切回真实数据。
                            </p>
                        </div>
                    </div>
                )}

                {/* Connection Status Banner */}
                {hasNoData && (
                    <div className="mb-6 rounded-xl bg-blue-primary/10 dark:bg-blue-primary/20 border border-blue-primary/30 px-4 py-3 flex items-center gap-3 animate-fade-in">
                        <div className="shrink-0">
                            {(() => {
                                const InfoIcon = getIcon('ri-alert-line');
                                return InfoIcon ? <InfoIcon className="text-blue-primary text-lg transition-colors duration-200" /> : null;
                            })()}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-blue-primary dark:text-blue-primary">
                                Database Connection Status
                            </p>
                            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-0.5">
                                Connected, but no records yet. Layout structure is displayed below.
                            </p>
                        </div>
                    </div>
                )}

                {/* welcome card - full width */}
                {!loading && (
                    <WelcomeCard 
                        userName="Developer" 
                        ticketStats={{ 
                            open: ticketStats.open, 
                            inProgress: ticketStats.inProgress, 
                            resolved: ticketStats.resolved, 
                            critical: priorityStats.critical 
                        }} 
                    />
                )}

                {/* stats card grid - full width */}
                {!loading && (
                    <article className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatsCard 
                            title="Total Tickets" 
                            value={totalTickets} 
                            subtitle="All tickets" 
                            description="in the system" 
                            data={isConnected ? weeklyTrend : []} 
                            dataKey="tickets" 
                            color="blue" 
                            trend={isConnected ? 15 : undefined} 
                            icon={(() => {
                                const TicketIcon = getIcon('ri-coupon-3-line');
                                return TicketIcon ? <TicketIcon className="text-lg transition-colors duration-200" /> : <i className="ri-coupon-3-line"></i>;
                            })()} 
                        />
                        <StatsCard 
                            title="Open Issues" 
                            value={ticketStats.open} 
                            subtitle="Need attention" 
                            description="waiting to be fixed" 
                            color="orange" 
                            trend={isConnected && ticketStats.open > 5 ? -8 : isConnected ? 12 : undefined} 
                            icon={(() => {
                                const BugIcon = getIcon('ri-bug-line');
                                return BugIcon ? <BugIcon className="text-lg transition-colors duration-200" /> : <i className="ri-bug-line"></i>;
                            })()} 
                        />
                        <StatsCard 
                            title="In Progress" 
                            value={ticketStats.inProgress} 
                            subtitle="Being worked on" 
                            description="by the team" 
                            color="purple" 
                            icon={(() => {
                                const TimeIcon = getIcon('ri-time-line');
                                return TimeIcon ? <TimeIcon className="text-lg transition-colors duration-200" /> : <i className="ri-time-line"></i>;
                            })()} 
                        />
                        <StatsCard 
                            title="Resolved" 
                            value={totalTickets > 0 ? `${resolvedRate}%` : '0%'} 
                            subtitle="Resolution rate" 
                            description={totalTickets > 0 ? `${ticketStats.resolved} tickets fixed` : 'No tickets yet'} 
                            color="green" 
                            trend={isConnected && resolvedRate > 50 ? 5 : isConnected ? -5 : undefined} 
                            icon={(() => {
                                const CheckIcon = getIcon('ri-checkbox-circle-line');
                                return CheckIcon ? <CheckIcon className="text-lg transition-colors duration-200" /> : <i className="ri-checkbox-circle-line"></i>;
                            })()} 
                        />
                    </article>
                )}

                {/* main content grid - Always show layout structure */}
                {!loading && (
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
                )}
            </section>
        </main>
    );
};

export default Dashboard;
