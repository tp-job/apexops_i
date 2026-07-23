import { useState, useEffect, type FC } from 'react';
import { getIcon } from '@/utils/iconMapping';
import type { Ticket as TicketType, Log } from '@/types/bugTrackerApp';
import { hasMockFlag } from '@/types/api';
import { ticketsAPI, logsAPI } from '@/services/api';
// components
import TicketStatusChart from '@/components/charts/TicketStatusChart';
import PriorityChart from '@/components/charts/PriorityChart';
import LogsOverviewChart from '@/components/charts/LogsOverviewChart';
import RecentActivityList from '@/components/charts/RecentActivityList';
import CalendarNotes from '@/components/charts/CalendarNotes';
import NoteStatsChart from '@/components/charts/NoteStatsChart';
import NoteActivityChart from '@/components/charts/NoteActivityChart';
import LoadingSpinner from '@/components/common/alert/LoadingSpinner';
import QuickActionsBar from '@/components/ui/dashboard/QuickActionsBar';
import DashboardPulsePanel from '@/components/ui/dashboard/DashboardPulsePanel';
import { PageHeader, GlassPanel, KpiCard } from '@/components/common/layout';
import { FiActivity, FiAlertCircle, FiCheckCircle, FiClock, FiPlus } from 'react-icons/fi';

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
                const offlineMockUsed = hasMockFlag(ticketsData) || hasMockFlag(logsData);
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
    void buildWeeklyTrend;
    void isApiOnline;

    return (
        <div className="flex flex-col gap-5 max-w-[1600px] mx-auto w-full relative z-10">
            {/* Loading State */}
                {loading && <LoadingSpinner />}

                {/* API Offline Banner */}
                {isApiOffline && (
                    <div className="mb-6 rounded-xl bg-orange-500/10 border border-orange-500/20 px-4 py-3 flex items-center gap-3 animate-fade-in">
                        <div className="shrink-0">
                            {(() => {
                                const Icon = getIcon('ri-alert-line');
                                return Icon ? <Icon className="text-orange-500 text-lg transition-colors duration-200" /> : null;
                            })()}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-orange-500">
                                API is offline
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5 font-medium">
                                Showing dashboard layout only. Start the server / connect PostgreSQL to load real metrics.
                            </p>
                        </div>
                    </div>
                )}

                {/* Offline Mock Banner */}
                {isOfflineMock && (
                    <div className="mb-6 rounded-xl bg-blue-500/10 border border-blue-500/20 px-4 py-3 flex items-center gap-3 animate-fade-in">
                        <div className="shrink-0">
                            {(() => {
                                const Icon = getIcon('ri-wifi-off-line');
                                return Icon ? <Icon className="text-blue-500 text-lg transition-colors duration-200" /> : null;
                            })()}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-blue-500">
                                后端不可达（Mock 预览）
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5 font-medium">
                                当前展示的是 mock 数据（只读）。启动后端服务后将自动切回真实数据。
                            </p>
                        </div>
                    </div>
                )}

                {/* Connection Status Banner */}
                {hasNoData && (
                    <div className="mb-6 rounded-xl bg-blue-500/10 border border-blue-500/20 px-4 py-3 flex items-center gap-3 animate-fade-in">
                        <div className="shrink-0">
                            {(() => {
                                const InfoIcon = getIcon('ri-alert-line');
                                return InfoIcon ? <InfoIcon className="text-blue-500 text-lg transition-colors duration-200" /> : null;
                            })()}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-blue-500">
                                Database Connection Status
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5 font-medium">
                                Connected, but no records yet. Layout structure is displayed below.
                            </p>
                        </div>
                    </div>
                )}

                {/* Page header - Invoices language */}
                {!loading && (
                    <PageHeader
                        title="Dashboard"
                        subtitle="System monitoring & issue tracking overview"
                        actions={
                            <button
                                type="button"
                                className="bg-white/60 hover:bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition shadow-sm"
                            >
                                <FiPlus className="w-4 h-4" />
                                New Ticket
                            </button>
                        }
                    />
                )}

                {/* KPI row - unified glass-panel with 4 KPIs */}
                {!loading && (
                    <GlassPanel padding="md" className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        <KpiCard
                            label="Total tickets"
                            value={totalTickets}
                            icon={<FiActivity className="w-5 h-5" />}
                        />
                        <KpiCard
                            label="Open issues"
                            value={ticketStats.open}
                            icon={<FiAlertCircle className="w-5 h-5" />}
                        />
                        <KpiCard
                            label="In progress"
                            value={ticketStats.inProgress}
                            icon={<FiClock className="w-5 h-5" />}
                        />
                        <KpiCard
                            label="Resolved rate"
                            value={totalTickets > 0 ? `${resolvedRate}%` : '0%'}
                            icon={<FiCheckCircle className="w-5 h-5" />}
                        />
                    </GlassPanel>
                )}

                {/* dark pulse panel - Profit / Payment score / Activity */}
                {!loading && (
                    <article className="mt-6">
                        <DashboardPulsePanel />
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
        </div>
    );
};

export default Dashboard;
