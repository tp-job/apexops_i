import { useState } from 'react';
import type { FC } from 'react';
import {
    Search, Plus, Bug, AlertCircle, Terminal,
    Globe, LayoutDashboard,
    XCircle, Radio, Wifi, WifiOff
} from 'lucide-react';
import type { Log, Ticket } from '@/types/bugTrackerApp';
import { logsAPI, ticketsAPI, consoleLogsAPI } from '@/services/api';
import LoadingSpinner from '@/components/common/alert/LoadingSpinner';
import { useBugTrackerSocket } from '@/hooks/useBugTrackerSocket';
import { TicketModal } from '@/components/ui/bugtracker/TicketModal';
import { InjectScriptModal } from '@/components/ui/bugtracker/InjectScriptModal';
import { useToast } from '@/context/ToastContext';
import { useBugTrackerData } from '@/hooks/useBugTrackerData';
import { BugTrackerDashboardView } from '@/components/ui/bugtracker/BugTrackerDashboardView';
import { BugTrackerKanbanView } from '@/components/ui/bugtracker/BugTrackerKanbanView';
import { BugTrackerTerminalView } from '@/components/ui/bugtracker/BugTrackerTerminalView';
import { readOnlyOfflineMessage } from '@/utils/offlineMock';

type ViewMode = 'dashboard' | 'kanban' | 'terminal';
type MonitorMode = 'snapshot' | 'realtime';

// --- Main Component ---

const BugTrackerApp: FC = () => {
    const [view, setView] = useState<ViewMode>('dashboard');
    const { showError: showErrorToast } = useToast();
    const {
        logs,
        setLogs,
        tickets,
        setTickets,
        loading,
        error,
        setError,
        isOfflineMock,
    } = useBugTrackerData();

    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [logFilterLevel, setLogFilterLevel] = useState('all');

    // Selection State
    const [selectedLog, setSelectedLog] = useState<Log | null>(null);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [showCreateTicket, setShowCreateTicket] = useState(false);

    // Create Ticket State
    const [newTicketData, setNewTicketData] = useState({
        title: '',
        description: '',
        priority: 'medium' as Ticket['priority'],
        assignee: ''
    });

    // Console Fetch State
    const [targetUrl, setTargetUrl] = useState('http://localhost:5173/');
    const [fetchingConsole, setFetchingConsole] = useState(false);

    // Real-time Monitoring State
    const [monitorMode, setMonitorMode] = useState<MonitorMode>('realtime');
    const [showInjectScript, setShowInjectScript] = useState(false);
    
    // Extracted Hook
    const { wsConnected, targetApps } = useBugTrackerSocket(monitorMode, setLogs);

    // Ticket Actions
    const handleStatusUpdate = async (id: string, newStatus: Ticket['status']) => {
        if (isOfflineMock) {
            const msg = readOnlyOfflineMessage();
            setError(msg);
            showErrorToast(msg);
            return;
        }
        // Optimistic UI Update directly
        setTickets(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));

        try {
            await ticketsAPI.update(id, { status: newStatus });
        } catch (err) {
            console.error("Failed to update ticket status", err);
            const data = await ticketsAPI.getAll();
            setTickets(Array.isArray(data) ? data : []);
        }
    };

    const handleCreateTicket = async () => {
        if (!newTicketData.title) return;
        if (isOfflineMock) {
            const msg = readOnlyOfflineMessage();
            setError(msg);
            showErrorToast(msg);
            return;
        }
        try {
            await ticketsAPI.create({
                ...newTicketData,
                status: 'open',
                reporter: 'User',
                relatedLogs: selectedLog ? [selectedLog.id] : []
            });
            setShowCreateTicket(false);
            setNewTicketData({ title: '', description: '', priority: 'medium', assignee: '' });
            setSelectedLog(null);

            const data = await ticketsAPI.getAll();
            setTickets(Array.isArray(data) ? data : []);
            setView('kanban');
        } catch (err) {
            console.error("Create ticket failed", err);
            setError("Failed to create ticket");
            showErrorToast("Failed to create ticket");
        }
    };

    // Log Actions
    const handleCreateTicketFromLog = (log: Log) => {
        if (isOfflineMock) {
            const msg = readOnlyOfflineMessage();
            setError(msg);
            showErrorToast(msg);
            return;
        }
        setSelectedLog(log);
        setShowCreateTicket(true);
    };

    // Console Fetch
    const handleFetchConsole = async () => {
        if (!targetUrl) return;
        if (isOfflineMock) {
            const msg = readOnlyOfflineMessage();
            setError(msg);
            showErrorToast(msg);
            return;
        }
        setFetchingConsole(true);
        try {
            await consoleLogsAPI.fetchFromUrl(targetUrl);
            const data = await logsAPI.getAll();
            setLogs(Array.isArray(data) ? data : []);
            setView('terminal');
        } catch (err) {
            setError("Failed to fetch console logs");
            showErrorToast("Failed to fetch console logs");
        } finally {
            setFetchingConsole(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="flex flex-col gap-5 relative pb-10">

            {/* --- Header --- */}
            <header className="glass-panel shrink-0 z-10 rounded-3xl flex flex-col gap-4 p-6 mx-6">
                <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-brand-accent/20 p-2 rounded-xl text-brand-dark">
                            <Bug className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-brand-dark tracking-tight font-heading">Bug Tracker</h1>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">System monitoring & issue tracking</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* View Switcher */}
                        <div className="flex p-1 rounded-xl border bg-white/5 border-white/10">
                            {[
                                { id: 'dashboard', icon: LayoutDashboard, label: 'Dash' },
                                { id: 'kanban', icon: AlertCircle, label: 'Board' },
                                { id: 'terminal', icon: Terminal, label: 'Logs' },
                            ].map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setView(item.id as ViewMode)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${view === item.id
                                        ? 'bg-brand-accent text-brand-dark shadow-sm font-bold'
                                        : 'text-gray-400 hover:text-brand-dark'
                                        }`}
                                >
                                    <item.icon className="w-4 h-4" />
                                    <span className="hidden sm:inline">{item.label}</span>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => {
                                if (isOfflineMock) {
                                    const msg = readOnlyOfflineMessage();
                                    setError(msg);
                                    showErrorToast(msg);
                                    return;
                                }
                                setShowCreateTicket(true);
                            }}
                            className="bg-brand-accent text-brand-dark font-bold text-sm py-2 px-4 rounded-xl hover:bg-[#b5db00] transition-colors shadow-lg flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">New Ticket</span>
                        </button>
                    </div>
                </div>

                {/* --- Filters Bar --- */}
                <div className="flex gap-4 items-center overflow-x-auto pt-4 border-t border-gray-200">
                    <div className="relative group max-w-xs w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search everything..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-1.5 text-sm rounded-xl border bg-white/5 border-white/10 text-brand-dark focus:ring-2 focus:ring-brand-accent/50 outline-none transition-all"
                        />
                    </div>

                    <div className="h-4 w-px bg-white/10 mx-2" />

                    {/* Mode Switcher */}
                    <div className="flex p-0.5 rounded-xl border bg-white/5 border-white/10">
                        <button
                            onClick={() => setMonitorMode('snapshot')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${monitorMode === 'snapshot'
                                ? 'bg-white/20 text-brand-dark shadow-sm'
                                : 'text-gray-400 hover:text-brand-dark'
                                }`}
                        >
                            <Globe className="w-3 h-3" />
                            Snapshot
                        </button>
                        <button
                            onClick={() => setMonitorMode('realtime')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${monitorMode === 'realtime'
                                ? 'bg-white/20 text-brand-dark shadow-sm'
                                : 'text-gray-400 hover:text-brand-dark'
                                }`}
                        >
                            <Radio className="w-3 h-3" />
                            Real-time
                        </button>
                    </div>

                    <div className="h-4 w-px bg-white/10 mx-2" />

                    {/* Snapshot Mode: URL Fetcher */}
                    {monitorMode === 'snapshot' && (
                        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                            <Globe className="w-4 h-4 text-gray-400" />
                            <input
                                value={targetUrl}
                                onChange={(e) => setTargetUrl(e.target.value)}
                                className="flex-1 bg-transparent text-sm outline-none px-2 text-brand-dark font-numbers"
                                placeholder="Fetch logs from URL..."
                            />
                            <button
                                onClick={handleFetchConsole}
                                disabled={fetchingConsole}
                                className="text-xs font-bold text-brand-dark hover:text-brand-accent hover:underline disabled:opacity-50"
                            >
                                {fetchingConsole ? '...' : 'FETCH'}
                            </button>
                        </div>
                    )}

                    {/* Real-time Mode: Connection Status + URL Input */}
                    {monitorMode === 'realtime' && (
                        <div className="flex items-center gap-3 flex-1">
                            {/* URL Input for Real-time */}
                            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                                <Globe className="w-4 h-4 text-gray-400" />
                                <input
                                    value={targetUrl}
                                    onChange={(e) => setTargetUrl(e.target.value)}
                                    className="flex-1 bg-transparent text-sm outline-none px-2 text-brand-dark font-numbers"
                                    placeholder="Target URL (e.g., http://localhost:3000)"
                                />
                            </div>

                            <div className="h-4 w-px bg-white/10" />

                            {/* Connection Status */}
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${wsConnected
                                ? 'bg-green-500/10 text-green-500'
                                : 'bg-orange-500/10 text-orange-500'
                                }`}>
                                {wsConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                                {wsConnected ? 'Connected' : 'Disconnected'}
                            </div>

                            {/* Connected Apps */}
                            {targetApps.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400">Monitoring:</span>
                                    {targetApps.map(app => (
                                        <span
                                            key={app.socketId}
                                            className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-xs rounded-full font-numbers"
                                            title={app.url}
                                        >
                                            {app.appName}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Setup Button */}
                            <button
                                onClick={() => setShowInjectScript(true)}
                                className="ml-auto text-xs font-bold text-brand-dark hover:text-brand-accent hover:underline flex items-center gap-1"
                            >
                                <Plus className="w-3 h-3" />
                                Setup Target App
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* --- Main Content --- */}
            <main className="max-w-[1600px] w-full mx-auto p-6">
                {isOfflineMock && (
                    <div className="mb-6 bg-blue-500/10 border border-blue-500/20 text-blue-500 p-4 rounded-xl flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <WifiOff className="w-5 h-5" />
                            åŽç«¯ä¸å¯è¾¾ï¼ˆMock é¢„è§ˆï¼‰ï¼šå½“å‰æ•°æ®ä¸º mockï¼ˆåªè¯»ï¼‰
                        </span>
                        <button onClick={() => setError(null)} className="opacity-60 hover:opacity-100">
                            <XCircle className="w-5 h-5" />
                        </button>
                    </div>
                )}
                {error && (
                    <div className="mb-6 bg-orange-500/10 border border-orange-500/20 text-orange-500 p-4 rounded-xl flex items-center justify-between">
                        <span className="flex items-center gap-2"><AlertCircle className="w-5 h-5" /> {error}</span>
                        <button onClick={() => setError(null)}><XCircle className="w-5 h-5" /></button>
                    </div>
                )}

                {view === 'dashboard' && <BugTrackerDashboardView tickets={tickets} logs={logs} />}

                {view === 'kanban' && (
                    <BugTrackerKanbanView
                        tickets={tickets.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()))}
                        onUpdateStatus={handleStatusUpdate}
                        onSelectTicket={(t) => {
                            if (isOfflineMock) {
                                const msg = readOnlyOfflineMessage();
                                setError(msg);
                                showErrorToast(msg);
                                return;
                            }
                            setSelectedTicket(t);
                            setShowCreateTicket(true);
                        }} // Simplified edit
                    />
                )}

                {view === 'terminal' && (
                    <BugTrackerTerminalView
                        logs={logs.filter(l => l.message.toLowerCase().includes(searchTerm.toLowerCase()))}
                        onSelectLog={handleCreateTicketFromLog}
                        filterLevel={logFilterLevel}
                        setFilterLevel={setLogFilterLevel}
                    />
                )}
            </main>

            {/* --- Create/Edit Ticket Modal --- */}
            <TicketModal
                isOpen={showCreateTicket}
                onClose={() => { 
                    setShowCreateTicket(false); 
                    setSelectedTicket(null); 
                    setSelectedLog(null); 
                }}
                initialTicket={selectedTicket}
                linkedLog={selectedLog}
                onSave={async (data) => {
                    if (selectedTicket) {
                        // Optimistic and API update for edit
                        await handleStatusUpdate(selectedTicket.id, data.status || selectedTicket.status); // Fallback to status update as original logic
                    } else {
                        // Create API call
                        setNewTicketData(data as any);
                        await handleCreateTicket();
                    }
                }}
            />

            {/* --- Inject Script Modal --- */}
            <InjectScriptModal
                isOpen={showInjectScript}
                onClose={() => setShowInjectScript(false)}
                targetUrl={targetUrl}
            />
        </div>
    );
};

export default BugTrackerApp;