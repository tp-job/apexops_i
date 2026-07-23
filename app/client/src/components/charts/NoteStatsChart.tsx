import { useState, type FC } from 'react';
import { getIcon } from '@/utils/iconMapping';
import { useNoteStatsOverview } from '@/hooks/useNoteStatsOverview';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import type { RechartsTooltipProps } from '@/types/charts';

const NoteStatsChart: FC = () => {
    const { stats, loading, hasAuth, isOffline } = useNoteStatsOverview();
    const [activeView, setActiveView] = useState<'daily' | 'monthly'>('daily');

    const typeData = stats ? [
        { name: 'Text', value: stats.byType.text, color: '#C5F43A', iconClass: 'ri-booklet-line' }, // brand-accent
        { name: 'Image', value: stats.byType.image, color: '#94a3b8', iconClass: 'ri-image-line' }, // gray-400
        { name: 'List', value: stats.byType.list, color: '#222222', iconClass: 'ri-list-check' }, // brand-dark
        { name: 'Link', value: stats.byType.link, color: '#64748b', iconClass: 'ri-link-line' }, // gray-500
    ] : [];

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

    const PieTooltip = ({ active, payload }: RechartsTooltipProps<any>) => {
        if (active && payload && payload.length) {
            return (
                <div className="glass-dark px-3 py-2 rounded-xl shadow-lg border border-white/10">
                    <p className="text-xs font-medium text-white">
                        {payload[0].payload.name}: <span className="font-numbers font-bold text-brand-accent">{payload[0].payload.value}</span>
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
        const HeaderIcon = getIcon('ri-booklet-fill');
        const PinIcon = getIcon('ri-pushpin-2-fill');
        const TrendIcon = getIcon('ri-line-chart-line');
        const ListIcon = getIcon('ri-list-check');
        return (
            <div className="glass-panel rounded-3xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-accent/20 flex items-center justify-center">
                            {HeaderIcon ? <HeaderIcon className="w-5 h-5 text-brand-dark" /> : null}
                        </div>
                        <div>
                            <h3 className="font-bold text-brand-dark font-heading">
                                Notes Overview
                            </h3>
                            <p className="text-xs text-gray-400 font-medium">
                                {hasAuth ? (isOffline ? 'Waiting for API connectionâ€¦' : 'Waiting for dataâ€¦') : 'Login required to load analytics'}
                            </p>
                        </div>
                    </div>
                    <span className="px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-white/5 text-gray-400 border border-white/10">
                        Preview
                    </span>
                </div>

                <div className="p-6">
                    {/* What this widget shows */}
                    <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-5">
                        <p className="text-xs font-bold text-brand-dark uppercase tracking-widest mb-2">
                            This panel will display
                        </p>
                        <ul className="text-xs text-gray-400 font-medium space-y-2">
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
                                Total notes, pinned notes, weekly volume, and lists
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
                                Daily / monthly note creation trend
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
                                Distribution by note type (Text / Image / List / Link)
                            </li>
                        </ul>
                    </div>

                    {/* Skeleton summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        {[
                            { label: 'Total Notes', icon: HeaderIcon, color: 'text-brand-dark' },
                            { label: 'Pinned', icon: PinIcon, color: 'text-brand-accent' },
                            { label: 'This Week', icon: TrendIcon, color: 'text-brand-dark' },
                            { label: 'Lists', icon: ListIcon, color: 'text-gray-400' },
                        ].map((item) => (
                            <div key={item.label} className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                <div className="flex items-center gap-2 mb-3">
                                    {item.icon ? <item.icon className={`w-4 h-4 ${item.color}`} /> : null}
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        {item.label}
                                    </span>
                                </div>
                                <div className="h-8 w-20 rounded-xl bg-white/10 animate-pulse" />
                            </div>
                        ))}
                    </div>

                    {/* Skeleton chart + distribution */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="h-[200px] rounded-xl bg-light-surface-2 dark:bg-dark-surface-2 border border-light-border/40 dark:border-dark-border/40 animate-pulse" />
                        <div className="space-y-2">
                            {['Text', 'Image', 'List', 'Link'].map((k) => (
                                <div key={k} className="h-12 rounded-xl bg-light-surface-2 dark:bg-dark-surface-2 border border-light-border/40 dark:border-dark-border/40 animate-pulse" />
                            ))}
                        </div>
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
                            const Icon = getIcon('ri-booklet-fill');
                            return Icon ? <Icon className="w-5 h-5 text-brand-dark" /> : null;
                        })()}
                    </div>
                    <div>
                        <h3 className="font-bold text-brand-dark font-heading">
                            Notes Overview
                        </h3>
                        <p className="text-xs text-gray-400 font-medium">
                            Your note activity analytics
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setActiveView('daily')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeView === 'daily'
                                ? 'bg-brand-accent text-brand-dark shadow-lg -accent/20'
                                : 'bg-white/5 text-gray-400 hover:text-brand-dark border border-white/10'
                            }`}
                    >
                        Daily
                    </button>
                    <button
                        onClick={() => setActiveView('monthly')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeView === 'monthly'
                                ? 'bg-brand-accent text-brand-dark shadow-lg -accent/20'
                                : 'bg-white/5 text-gray-400 hover:text-brand-dark border border-white/10'
                            }`}
                    >
                        Monthly
                    </button>
                </div>
            </div>

            <div className="p-6">
                {/* Stats Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-brand-accent/30 transition-colors">
                        <div className="flex items-center gap-2 mb-3">
                            {(() => {
                                const Icon = getIcon('ri-booklet-line');
                                return Icon ? <Icon className="w-4 h-4 text-brand-accent" /> : null;
                            })()}
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                Total Notes
                            </span>
                        </div>
                        <p className="text-3xl font-bold text-brand-dark font-numbers">
                            {stats.total}
                        </p>
                    </div>
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-brand-accent/30 transition-colors">
                        <div className="flex items-center gap-2 mb-3">
                            {(() => {
                                const Icon = getIcon('ri-pushpin-2-fill');
                                return Icon ? <Icon className="w-4 h-4 text-brand-accent" /> : null;
                            })()}
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                Pinned
                            </span>
                        </div>
                        <p className="text-3xl font-bold text-brand-dark font-numbers">
                            {stats.pinned.pinned}
                        </p>
                    </div>
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-brand-accent/30 transition-colors">
                        <div className="flex items-center gap-2 mb-3">
                            {(() => {
                                const Icon = getIcon('ri-line-chart-line');
                                return Icon ? <Icon className="w-4 h-4 text-brand-accent" /> : null;
                            })()}
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                This Week
                            </span>
                        </div>
                        <p className="text-3xl font-bold text-brand-dark font-numbers">
                            {stats.daily.reduce((sum, d) => sum + d.count, 0)}
                        </p>
                    </div>
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-brand-accent/30 transition-colors">
                        <div className="flex items-center gap-2 mb-3">
                            {(() => {
                                const Icon = getIcon('ri-list-check');
                                return Icon ? <Icon className="w-4 h-4 text-brand-accent" /> : null;
                            })()}
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                Lists
                            </span>
                        </div>
                        <p className="text-3xl font-bold text-brand-dark font-numbers">
                            {stats.byType.list}
                        </p>
                    </div>
                </div>

                {/* Area Chart */}
                <div className="h-[200px] mb-8">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={activeView === 'daily' ? stats.daily : stats.monthly}
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="noteGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#C5F43A" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#C5F43A" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="rgba(0,0,0,0.05)"
                                vertical={false}
                            />
                            <XAxis
                                dataKey={activeView === 'daily' ? 'day' : 'monthName'}
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
                            <Area
                                type="monotone"
                                dataKey="count"
                                stroke="#C5F43A"
                                strokeWidth={3}
                                fill="url(#noteGradient)"
                                animationDuration={1500}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Type Distribution */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Pie Chart */}
                    <div className="flex items-center justify-center">
                        <div className="relative" style={{ width: 160, height: 160 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={typeData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={75}
                                        paddingAngle={5}
                                        dataKey="value"
                                        strokeWidth={0}
                                    >
                                        {typeData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.color}
                                                className="hover:opacity-80 transition-opacity cursor-pointer"
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<PieTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-3xl font-bold text-brand-dark font-numbers">
                                    {stats.total}
                                </span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    Total
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="space-y-3">
                        {typeData.map((item) => {
                            const percentage = stats.total > 0 ? Math.round((item.value / stats.total) * 100) : 0;
                            const Icon = getIcon(item.iconClass);
                            return (
                                <div
                                    key={item.name}
                                    className="flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all duration-200 cursor-pointer border border-transparent hover:border-white/10"
                                >
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                                            style={{ backgroundColor: `${item.color}15` }}
                                        >
                                            {Icon ? <Icon className="w-5 h-5" style={{ color: item.color }} /> : null}
                                        </div>
                                        <span className="text-sm font-bold text-brand-dark uppercase tracking-wide">
                                            {item.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg font-bold text-brand-dark font-numbers">
                                            {item.value}
                                        </span>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 py-1 rounded-xl bg-white/5">
                                            {percentage}%
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NoteStatsChart;
