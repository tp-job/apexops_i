import { useState, useEffect, type FC } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { FileText, Image, List, Link2, Pin, TrendingUp } from 'lucide-react';

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
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const NoteStatsChart: FC = () => {
    const [stats, setStats] = useState<NoteStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState<'daily' | 'monthly'>('daily');

    useEffect(() => {
        const fetchStats = async () => {
            const token = localStorage.getItem('accessToken');
            if (!token) {
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
                }
            } catch (err) {
                console.error('Error fetching note stats:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const typeData = stats ? [
        { name: 'Text', value: stats.byType.text, color: '#6366F1', icon: FileText },
        { name: 'Image', value: stats.byType.image, color: '#F64668', icon: Image },
        { name: 'List', value: stats.byType.list, color: '#0F9D58', icon: List },
        { name: 'Link', value: stats.byType.link, color: '#F4B400', icon: Link2 },
    ] : [];

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="px-4 py-3 rounded-xl shadow-xl border backdrop-blur-sm bg-white/95 border-light-border dark:bg-dark-surface/95 dark:border-dark-border">
                    <p className="text-sm font-bold text-light-text-primary dark:text-dark-text-primary">
                        {label}
                    </p>
                    <p className="text-ember font-bold text-lg">
                        {payload[0].value} notes
                    </p>
                </div>
            );
        }
        return null;
    };

    const PieTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="px-3 py-2 rounded-lg shadow-lg border bg-white border-light-border dark:bg-dark-surface dark:border-dark-border">
                    <p className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                        {data.name}: {data.value}
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
        return (
            <div className="rounded-2xl overflow-hidden p-6 bg-white border-light-border dark:bg-dark-surface dark:border-dark-border border">
                <p className="text-center text-light-text-secondary dark:text-dark-text-secondary">
                    No data available
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-2xl overflow-hidden bg-white border-light-border dark:bg-dark-surface dark:border-dark-border border">
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between border-light-border dark:border-dark-border">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo to-wine flex items-center justify-center">
                        <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-light-text-primary dark:text-dark-text-primary">
                            Notes Overview
                        </h3>
                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                            Your note activity
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setActiveView('daily')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            activeView === 'daily'
                                ? 'bg-ember text-white'
                                : 'bg-light-surface-2 text-light-text-secondary hover:text-light-text-primary dark:bg-dark-surface-2 dark:text-dark-text-secondary dark:hover:text-dark-text-primary'
                        }`}
                    >
                        Daily
                    </button>
                    <button
                        onClick={() => setActiveView('monthly')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            activeView === 'monthly'
                                ? 'bg-ember text-white'
                                : 'bg-light-surface-2 text-light-text-secondary hover:text-light-text-primary dark:bg-dark-surface-2 dark:text-dark-text-secondary dark:hover:text-dark-text-primary'
                        }`}
                    >
                        Monthly
                    </button>
                </div>
            </div>

            <div className="p-6">
                {/* Stats Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="p-4 rounded-xl bg-light-surface-2 dark:bg-dark-surface-2">
                        <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-4 h-4 text-indigo" />
                            <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                Total Notes
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                            {stats.total}
                        </p>
                    </div>
                    <div className="p-4 rounded-xl bg-light-surface-2 dark:bg-dark-surface-2">
                        <div className="flex items-center gap-2 mb-2">
                            <Pin className="w-4 h-4 text-ember" />
                            <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                Pinned
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                            {stats.pinned.pinned}
                        </p>
                    </div>
                    <div className="p-4 rounded-xl bg-light-surface-2 dark:bg-dark-surface-2">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="w-4 h-4 text-global-green" />
                            <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                This Week
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                            {stats.daily.reduce((sum, d) => sum + d.count, 0)}
                        </p>
                    </div>
                    <div className="p-4 rounded-xl bg-light-surface-2 dark:bg-dark-surface-2">
                        <div className="flex items-center gap-2 mb-2">
                            <List className="w-4 h-4 text-wine" />
                            <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                Lists
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                            {stats.byType.list}
                        </p>
                    </div>
                </div>

                {/* Area Chart */}
                <div className="h-[200px] mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={activeView === 'daily' ? stats.daily : stats.monthly}
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="noteGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#F64668" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#F64668" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                className="stroke-gray-200 dark:stroke-gray-700"
                                vertical={false}
                            />
                            <XAxis
                                dataKey={activeView === 'daily' ? 'day' : 'monthName'}
                                tick={{ fontSize: 11 }}
                                className="fill-gray-500 dark:fill-gray-400"
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 11 }}
                                className="fill-gray-500 dark:fill-gray-400"
                                axisLine={false}
                                tickLine={false}
                                allowDecimals={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="count"
                                stroke="#F64668"
                                strokeWidth={2}
                                fill="url(#noteGradient)"
                                animationDuration={1000}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Type Distribution */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Pie Chart */}
                    <div className="flex items-center justify-center">
                        <div className="relative">
                            <ResponsiveContainer width={160} height={160}>
                                <PieChart>
                                    <Pie
                                        data={typeData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={70}
                                        paddingAngle={3}
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
                                <span className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                                    {stats.total}
                                </span>
                                <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                    Total
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="space-y-2">
                        {typeData.map((item) => {
                            const percentage = stats.total > 0 ? Math.round((item.value / stats.total) * 100) : 0;
                            const Icon = item.icon;
                            return (
                                <div
                                    key={item.name}
                                    className="flex items-center justify-between p-3 rounded-xl bg-light-surface-2 hover:bg-light-border dark:bg-dark-surface-2 dark:hover:bg-dark-border transition-all duration-200 cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                                            style={{ backgroundColor: `${item.color}20` }}
                                        >
                                            <Icon className="w-4 h-4" style={{ color: item.color }} />
                                        </div>
                                        <span className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                                            {item.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-light-text-primary dark:text-dark-text-primary">
                                            {item.value}
                                        </span>
                                        <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                            ({percentage}%)
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
