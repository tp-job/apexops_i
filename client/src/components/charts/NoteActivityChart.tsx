import { useState, useEffect, type FC } from 'react';
import { getIcon } from '@/utils/iconMapping';
import { isMockEnabled, isNetworkFailure } from '@/utils/offlineMock';
import { mockNoteStatsOverview } from '@/utils/mockData';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer
} from 'recharts';
import { Activity, Clock, FileText, Edit3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RecentActivity {
    id: string;
    title: string;
    type: string;
    createdAt: string;
    updatedAt: string;
}

interface NoteStats {
    total: number;
    byType: {
        text: number;
        image: number;
        list: number;
        link: number;
    };
    pinned: {
        pinned: number;
        unpinned: number;
    };
    daily: Array<{ date: string; day: string; count: number }>;
    monthly: Array<{ month: string; monthName: string; count: number }>;
    recentActivity: RecentActivity[];
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const NoteActivityChart: FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<NoteStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [hasAuth, setHasAuth] = useState<boolean>(true);
    const [isOffline, setIsOffline] = useState<boolean>(false);

    useEffect(() => {
        const fetchStats = async () => {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                setHasAuth(false);
                setLoading(false);
                return;
            }

            try {
                const res = await fetch(`${API_BASE_URL}/api/notes/stats/overview`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                    setIsOffline(false);
                }
            } catch (err) {
                console.error('Error fetching note stats:', err);
                setIsOffline(true);
                if (isMockEnabled() && isNetworkFailure(err)) {
                    setStats(mockNoteStatsOverview);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'text': {
                const Icon = getIcon('ri-booklet-line');
                return Icon ? <Icon className="w-4 h-4" /> : <FileText className="w-4 h-4" />;
            }
            case 'image': {
                const Icon = getIcon('ri-image-line');
                return Icon ? <Icon className="w-4 h-4" /> : <i className="ri-image-line text-base"></i>;
            }
            case 'list': {
                const Icon = getIcon('ri-list-check');
                return Icon ? <Icon className="w-4 h-4" /> : <i className="ri-list-check text-base"></i>;
            }
            case 'link': {
                const Icon = getIcon('ri-link-line');
                return Icon ? <Icon className="w-4 h-4" /> : <i className="ri-link-line text-base"></i>;
            }
            default: {
                const Icon = getIcon('ri-booklet-line');
                return Icon ? <Icon className="w-4 h-4" /> : <FileText className="w-4 h-4" />;
            }
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'text': return '#6366F1';
            case 'image': return '#F64668';
            case 'list': return '#0F9D58';
            case 'link': return '#F4B400';
            default: return '#6B7280';
        }
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="px-4 py-3 rounded-xl shadow-xl border backdrop-blur-sm bg-white/95 border-light-border dark:bg-dark-surface/95 dark:border-dark-border">
                    <p className="text-sm font-bold text-light-text-primary dark:text-dark-text-primary">
                        {label}
                    </p>
                    <p className="text-indigo font-bold text-lg">
                        {payload[0].value} notes
                    </p>
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="rounded-2xl overflow-hidden h-[400px] flex items-center justify-center bg-white border-light-border dark:bg-dark-surface dark:border-dark-border border">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ember"></div>
            </div>
        );
    }

    if (!stats) {
        const HeaderIcon = getIcon('ri-bar-chart-line');
        const ClockIcon = getIcon('ri-time-line');
        return (
            <div className="rounded-2xl overflow-hidden bg-white border-light-border dark:bg-dark-surface dark:border-dark-border border">
                <div className="px-6 py-4 border-b flex items-center justify-between border-light-border dark:border-dark-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-global-green to-indigo flex items-center justify-center">
                            {HeaderIcon ? <HeaderIcon className="w-5 h-5 text-white" /> : <Activity className="w-5 h-5 text-white" />}
                        </div>
                        <div>
                            <h3 className="font-bold text-light-text-primary dark:text-dark-text-primary">
                                Note Activity
                            </h3>
                            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                {hasAuth ? (isOffline ? 'Waiting for API connection…' : 'Waiting for data…') : 'Login required to load activity'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/note')}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-light-surface-2 text-light-text-secondary hover:text-light-text-primary dark:bg-dark-surface-2 dark:text-dark-text-secondary dark:hover:text-dark-text-primary transition-colors"
                    >
                        View All
                    </button>
                </div>

                <div className="p-6">
                    <div className="mb-5 rounded-xl border border-light-border/60 dark:border-dark-border/60 bg-light-surface-2/40 dark:bg-dark-surface-2/40 p-4">
                        <p className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary mb-1">
                            This panel will display
                        </p>
                        <ul className="text-xs text-light-text-secondary dark:text-dark-text-secondary space-y-1">
                            <li>- Weekly notes activity (bar chart)</li>
                            <li>- Recent note updates with type + time ago</li>
                            <li>- Quick access to open the note editor</li>
                        </ul>
                    </div>

                    <div className="h-[150px] rounded-xl bg-light-surface-2 dark:bg-dark-surface-2 border border-light-border/40 dark:border-dark-border/40 animate-pulse mb-6" />

                    <h4 className="text-sm font-semibold mb-4 flex items-center gap-2 text-light-text-primary dark:text-dark-text-primary">
                        {ClockIcon ? <ClockIcon className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        Recent Activity
                    </h4>
                    <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-14 rounded-xl bg-light-surface-2 dark:bg-dark-surface-2 border border-light-border/40 dark:border-dark-border/40 animate-pulse" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl overflow-hidden bg-white border-light-border dark:bg-dark-surface dark:border-dark-border border">
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between border-light-border dark:border-dark-border">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-global-green to-indigo flex items-center justify-center">
                        {(() => {
                            const Icon = getIcon('ri-bar-chart-line');
                            return Icon ? <Icon className="w-5 h-5 text-white" /> : <Activity className="w-5 h-5 text-white" />;
                        })()}
                    </div>
                    <div>
                        <h3 className="font-bold text-light-text-primary dark:text-dark-text-primary">
                            Note Activity
                        </h3>
                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                            Recent changes & trends
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/note')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-ember text-white hover:bg-wine transition-colors"
                >
                    View All
                </button>
            </div>

            <div className="p-6">
                {/* Weekly Bar Chart */}
                <div className="mb-6">
                    <h4 className="text-sm font-semibold mb-4 text-light-text-primary dark:text-dark-text-primary">
                        Weekly Activity
                    </h4>
                    <div className="h-[150px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={stats.daily}
                                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    className="stroke-light-border dark:stroke-dark-border"
                                    vertical={false}
                                />
                                <XAxis
                                    dataKey="day"
                                    tick={{ fontSize: 11 }}
                                    className="fill-light-text-secondary dark:fill-dark-text-secondary"
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fontSize: 11 }}
                                    className="fill-light-text-secondary dark:fill-dark-text-secondary"
                                    axisLine={false}
                                    tickLine={false}
                                    allowDecimals={false}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar
                                    dataKey="count"
                                    fill="#6366F1"
                                    radius={[6, 6, 0, 0]}
                                    animationDuration={1000}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Activity */}
                <div>
                    <h4 className="text-sm font-semibold mb-4 flex items-center gap-2 text-light-text-primary dark:text-dark-text-primary">
                        {(() => {
                            const Icon = getIcon('ri-time-line');
                            return Icon ? <Icon className="w-4 h-4" /> : <Clock className="w-4 h-4" />;
                        })()}
                        Recent Activity
                    </h4>
                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 scrollbar-thin">
                        {stats.recentActivity.length > 0 ? (
                            stats.recentActivity.map((activity) => (
                                <div
                                    key={activity.id}
                                    onClick={() => navigate(`/note-editor?id=${activity.id}`)}
                                    className="group flex items-center justify-between p-3 rounded-xl cursor-pointer bg-light-surface-2 hover:bg-light-border dark:bg-dark-surface-2 dark:hover:bg-dark-border transition-all duration-200"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                            style={{ backgroundColor: `${getTypeColor(activity.type)}20` }}
                                        >
                                            <span style={{ color: getTypeColor(activity.type) }}>
                                                {getTypeIcon(activity.type)}
                                            </span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate text-light-text-primary dark:text-dark-text-primary">
                                                {activity.title || 'Untitled Note'}
                                            </p>
                                            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                                Updated {formatTimeAgo(activity.updatedAt)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/note-editor?id=${activity.id}`);
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-light-surface dark:hover:bg-dark-surface"
                                        >
                                            {(() => {
                                                const Icon = getIcon('ri-edit-line');
                                                return Icon ? <Icon className="w-4 h-4 text-indigo" /> : <Edit3 className="w-4 h-4 text-indigo" />;
                                            })()}
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-light-text-secondary dark:text-dark-text-secondary">
                                {(() => {
                                    const Icon = getIcon('ri-booklet-line');
                                    return Icon ? <Icon className="w-12 h-12 mx-auto mb-3 opacity-20" /> : <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />;
                                })()}
                                <p className="text-sm">No recent activity</p>
                                <button
                                    onClick={() => navigate('/note-editor')}
                                    className="mt-3 px-4 py-2 rounded-lg bg-ember text-white text-sm font-medium hover:bg-wine transition-colors"
                                >
                                    Create Your First Note
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NoteActivityChart;
