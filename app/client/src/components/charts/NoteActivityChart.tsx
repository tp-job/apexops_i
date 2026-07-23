import { type FC } from 'react';
import { getIcon } from '@/utils/iconMapping';
import { useNoteStatsOverview } from '@/hooks/useNoteStatsOverview';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer
} from 'recharts';
import { Activity, Clock, FileText, Edit3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { RechartsTooltipProps } from '@/types/charts';

const NoteActivityChart: FC = () => {
    const navigate = useNavigate();
    const { stats, loading, isOffline, hasAuth } = useNoteStatsOverview();

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
            case 'text': return '#C5F43A'; // brand-accent
            case 'image': return '#94a3b8'; // gray-400
            case 'list': return '#222222'; // brand-dark
            case 'link': return '#64748b'; // gray-500
            default: return '#94a3b8';
        }
    };
    const CustomTooltip = ({ active, payload, label }: RechartsTooltipProps) => {
        if (active && payload && payload.length) {
            return (
                <div className="glass-dark px-4 py-3 rounded-2xl shadow-xl border border-white/10 backdrop-blur-md">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
                        {label}
                    </p>
                    <p className="text-brand-accent font-numbers font-bold text-xl">
                        {payload[0].value} <span className="text-xs font-normal text-gray-400 ml-1">notes</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="glass-panel h-[400px] flex items-center justify-center rounded-3xl">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-accent"></div>
            </div>
        );
    }

    if (!stats) {
        const HeaderIcon = getIcon('ri-bar-chart-line');
        const ClockIcon = getIcon('ri-time-line');
        return (
            <div className="glass-panel rounded-3xl overflow-hidden">
                <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-accent/20 flex items-center justify-center">
                            {HeaderIcon ? <HeaderIcon className="w-5 h-5 text-brand-dark" /> : <Activity className="w-5 h-5 text-brand-dark" />}
                        </div>
                        <div>
                            <h3 className="font-bold text-brand-dark font-heading">
                                Note Activity
                            </h3>
                            <p className="text-xs text-gray-400 font-medium">
                                {hasAuth ? (isOffline ? 'Waiting for API connectionâ€¦' : 'Waiting for dataâ€¦') : 'Login required to load activity'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/note')}
                        className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-white/5 text-gray-400 hover:text-brand-dark border border-white/10 transition-all"
                    >
                        View All
                    </button>
                </div>

                <div className="p-6">
                    <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-5">
                        <p className="text-xs font-bold text-brand-dark uppercase tracking-widest mb-2">
                            This panel will display
                        </p>
                        <ul className="text-xs text-gray-400 font-medium space-y-2">
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
                                Weekly notes activity (bar chart)
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
                                Recent note updates with type + time ago
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
                                Quick access to open the note editor
                            </li>
                        </ul>
                    </div>

                    <div className="h-[150px] rounded-2xl bg-white/5 border border-white/5 animate-pulse mb-8" />

                    <h4 className="text-[10px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2 text-gray-400">
                        {ClockIcon ? <ClockIcon className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        Recent Activity
                    </h4>
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-16 rounded-2xl bg-white/5 border border-white/5 animate-pulse" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-panel rounded-3xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-accent/20 flex items-center justify-center">
                        {(() => {
                            const Icon = getIcon('ri-bar-chart-line');
                            return Icon ? <Icon className="w-5 h-5 text-brand-dark" /> : <Activity className="w-5 h-5 text-brand-dark" />;
                        })()}
                    </div>
                    <div>
                        <h3 className="font-bold text-brand-dark font-heading">
                            Note Activity
                        </h3>
                        <p className="text-xs text-gray-400 font-medium">
                            Recent changes & trends
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/note')}
                    className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest bg-brand-accent text-brand-dark shadow-lg -accent/20 hover:-accent/40 transition-all active:scale-95"
                >
                    View All
                </button>
            </div>

            <div className="p-6">
                {/* Weekly Bar Chart */}
                <div className="mb-8">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest mb-5 text-gray-400">
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
                                    stroke="rgba(0,0,0,0.05)"
                                    vertical={false}
                                />
                                <XAxis
                                    dataKey="day"
                                    tick={{ fontSize: 10, fontWeight: 600 }}
                                    className="fill-gray-400"
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fontWeight: 600 }}
                                    className="fill-gray-400"
                                    axisLine={false}
                                    tickLine={false}
                                    allowDecimals={false}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar
                                    dataKey="count"
                                    fill="#C5F43A"
                                    radius={[4, 4, 0, 0]}
                                    animationDuration={1500}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Activity */}
                <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2 text-gray-400">
                        {(() => {
                            const Icon = getIcon('ri-time-line');
                            return Icon ? <Icon className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />;
                        })()}
                        Recent Activity
                    </h4>
                    <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2 scrollbar-thin">
                        {(stats.recentActivity ?? []).length > 0 ? (
                            (stats.recentActivity ?? []).map((activity) => (
                                <div
                                    key={activity.id}
                                    onClick={() => navigate(`/note-editor?id=${activity.id}`)}
                                    className="group flex items-center justify-between p-4 rounded-2xl cursor-pointer bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all duration-200"
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                                            style={{ backgroundColor: `${getTypeColor(activity.type)}15` }}
                                        >
                                            <span style={{ color: getTypeColor(activity.type) }}>
                                                {getTypeIcon(activity.type)}
                                            </span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold uppercase tracking-wide truncate text-brand-dark">
                                                {activity.title || 'Untitled Note'}
                                            </p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                Updated {formatTimeAgo(activity.updatedAt)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/note-editor?id=${activity.id}`);
                                            }}
                                            className="p-2 rounded-xl bg-white/10 hover:bg-brand-accent hover:text-brand-dark transition-all text-gray-400"
                                        >
                                            {(() => {
                                                const Icon = getIcon('ri-edit-line');
                                                return Icon ? <Icon className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />;
                                            })()}
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12">
                                {(() => {
                                    const Icon = getIcon('ri-booklet-line');
                                    return Icon ? <Icon className="w-16 h-16 mx-auto mb-4 text-gray-400/20" /> : <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400/20" />;
                                })()}
                                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">No recent activity</p>
                                <button
                                    onClick={() => navigate('/note-editor')}
                                    className="mt-5 px-6 py-2.5 rounded-xl bg-brand-accent text-brand-dark text-xs font-bold uppercase tracking-widest shadow-lg -accent/20 hover:-accent/40 transition-all active:scale-95"
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
