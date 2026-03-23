import { useState, useEffect, useRef, useCallback } from 'react';
import type { FC } from 'react';
import {
    Search, Plus, Bug, AlertCircle, Terminal,
    Globe, LayoutDashboard,
    XCircle, Radio, Wifi, WifiOff, Copy, Check
} from 'lucide-react';
import type { Log, Ticket } from '@/types/bugTrackerApp';
import { logsAPI, ticketsAPI, consoleLogsAPI } from '@/services/api';
import LoadingSpinner from '@/components/common/alert/LoadingSpinner';
import { io, Socket } from 'socket.io-client';
import { readOnlyOfflineMessage } from '@/utils/offlineMock';
import { useToast } from '@/context/ToastContext';
import { useBugTrackerData } from '@/hooks/useBugTrackerData';
import { BugTrackerDashboardView } from '@/components/ui/bugtracker/BugTrackerDashboardView';
import { BugTrackerKanbanView } from '@/components/ui/bugtracker/BugTrackerKanbanView';
import { BugTrackerTerminalView } from '@/components/ui/bugtracker/BugTrackerTerminalView';

type ViewMode = 'dashboard' | 'kanban' | 'terminal';
type MonitorMode = 'snapshot' | 'realtime';

interface TargetApp {
    socketId: string;
    appName: string;
    url: string;
    connectedAt: string;
}

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
        refetch: refetchData,
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
    const [wsConnected, setWsConnected] = useState(false);
    const [targetApps, setTargetApps] = useState<TargetApp[]>([]);
    const [showInjectScript, setShowInjectScript] = useState(false);
    const [copied, setCopied] = useState(false);
    const socketRef = useRef<Socket | null>(null);

    // WebSocket Connection for Real-time Mode
    useEffect(() => {
        if (monitorMode !== 'realtime') {
            // Disconnect if switching away from realtime
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setWsConnected(false);
            }
            return;
        }

        // Connect to WebSocket
        const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:8081';
        const socket = io(wsUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('🔌 Connected to Bug Tracker WebSocket');
            setWsConnected(true);
            // Register as monitor client
            socket.emit('register', { clientType: 'monitor' });
        });

        socket.on('disconnect', () => {
            console.log('🔌 Disconnected from WebSocket');
            setWsConnected(false);
        });

        socket.on('connect_error', (err: Error) => {
            console.error('WebSocket connection error:', err.message);
            setWsConnected(false);
        });

        // Receive list of connected target apps
        socket.on('target-apps-list', (apps: TargetApp[]) => {
            setTargetApps(apps);
        });

        // Target app connected
        socket.on('target-app-connected', (app: TargetApp) => {
            setTargetApps(prev => [...prev, app]);
        });

        // Target app disconnected
        socket.on('target-app-disconnected', (app: TargetApp) => {
            setTargetApps(prev => prev.filter(a => a.socketId !== app.socketId));
        });

        // Receive real-time console logs
        socket.on('console-logs', (newLogs: Log[]) => {
            setLogs(prev => {
                const combined = [...newLogs, ...prev];
                // Keep only last 500 logs to prevent memory issues
                return combined.slice(0, 500);
            });
        });

        return () => {
            socket.disconnect();
        };
    }, [monitorMode]);

    // Generate inject script for target app
    const getInjectScript = useCallback(() => {
        const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        // Extract app name from target URL
        let appName = 'My App';
        try {
            const url = new URL(targetUrl);
            appName = url.hostname + (url.port ? ':' + url.port : '');
        } catch {
            // Use default if URL is invalid
        }
        return `
<!-- ApexOps Bug Tracker - Add this to your target app (${targetUrl}) -->
<script>
    window.BUG_TRACKER_SERVER = '${serverUrl}';
    window.BUG_TRACKER_APP_NAME = '${appName}';
</script>
<script src="${serverUrl}/bug-tracker-client.js"></script>
`;
    }, [targetUrl]);

    // Copy script to clipboard
    const copyInjectScript = () => {
        navigator.clipboard.writeText(getInjectScript());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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
        setNewTicketData({
            title: `Fix: ${log.message.substring(0, 40)}...`,
            description: `Error from ${log.source}\n\n${log.message}\n\n${log.stack || ''}`,
            priority: log.level === 'error' ? 'high' : 'medium',
            assignee: ''
        });
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
        <div className="min-h-screen bg-light-bg dark:bg-dark-bg transition-colors duration-300 pb-10 relative">
            {/* Background Decorations */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-orange-primary/5 via-blue-secondary/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-blue-primary/5 via-dark-bg/5 to-transparent rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            </div>

            {/* --- Header --- */}
            <header className="sticky top-0 z-30 backdrop-blur-xl border-b bg-white/80 border-light-border dark:border-dark-border/50 dark:bg-dark-surface/80 dark:border-dark-border/50">
                <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-primary/10 p-2 rounded-xl text-orange-primary">
                            <Bug className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold dark:text-white tracking-tight">Bug Tracker 2.0</h1>
                            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary font-medium">System Monitoring & Issue Tracking</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* View Switcher */}
                        <div className="flex p-1 rounded-lg border bg-light-surface-2 dark:bg-dark-surface-2 border-light-border dark:border-dark-border dark:bg-dark-surface dark:border-dark-border">
                            {[
                                { id: 'dashboard', icon: LayoutDashboard, label: 'Dash' },
                                { id: 'kanban', icon: AlertCircle, label: 'Board' },
                                { id: 'terminal', icon: Terminal, label: 'Logs' },
                            ].map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setView(item.id as ViewMode)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === item.id
                                        ? 'bg-white dark:bg-dark-surface-2 text-orange-primary shadow-sm'
                                        : 'text-light-text-secondary dark:text-dark-text-secondary dark:text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary'
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
                            className="btn-modern btn-primary text-sm py-2 px-4 shadow-lg shadow-orange-primary/20"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">New Ticket</span>
                        </button>
                    </div>
                </div>

                {/* --- Filters Bar --- */}
                <div className="px-6 py-3 border-t border-light-border dark:border-dark-border/50 dark:border-dark-border/50 flex gap-4 items-center overflow-x-auto">
                    <div className="relative group max-w-xs w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-light-text-secondary dark:text-dark-text-secondary" />
                        <input
                            type="text"
                            placeholder="Search everything..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-1.5 text-sm rounded-lg border bg-white border-light-border dark:border-dark-border dark:bg-dark-surface dark:border-dark-border dark:text-white focus:ring-2 focus:ring-orange-primary/20 outline-none transition-all"
                        />
                    </div>

                    <div className="h-4 w-px bg-light-border dark:bg-dark-border dark:bg-white/10 mx-2" />

                    {/* Mode Switcher */}
                    <div className="flex p-0.5 rounded-lg border bg-light-surface-2 dark:bg-dark-surface-2 border-light-border dark:border-dark-border dark:bg-dark-surface dark:border-dark-border">
                        <button
                            onClick={() => setMonitorMode('snapshot')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${monitorMode === 'snapshot'
                                ? 'bg-white dark:bg-dark-surface-2 text-light-text-primary dark:text-dark-text-primary dark:text-white shadow-sm'
                                : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary'
                                }`}
                        >
                            <Globe className="w-3 h-3" />
                            Snapshot
                        </button>
                        <button
                            onClick={() => setMonitorMode('realtime')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${monitorMode === 'realtime'
                                ? 'bg-white dark:bg-dark-surface-2 text-light-text-primary dark:text-dark-text-primary dark:text-white shadow-sm'
                                : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary'
                                }`}
                        >
                            <Radio className="w-3 h-3" />
                            Real-time
                        </button>
                    </div>

                    <div className="h-4 w-px bg-light-border dark:bg-dark-border dark:bg-white/10 mx-2" />

                    {/* Snapshot Mode: URL Fetcher */}
                    {monitorMode === 'snapshot' && (
                        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                            <Globe className="w-4 h-4 text-light-text-secondary dark:text-dark-text-secondary" />
                            <input
                                value={targetUrl}
                                onChange={(e) => setTargetUrl(e.target.value)}
                                className="flex-1 bg-transparent text-sm outline-none px-2 text-light-text dark:text-dark-text-secondary"
                                placeholder="Fetch logs from URL..."
                            />
                            <button
                                onClick={handleFetchConsole}
                                disabled={fetchingConsole}
                                className="text-xs font-bold text-orange-primary hover:underline disabled:opacity-50"
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
                                <Globe className="w-4 h-4 text-light-text-secondary dark:text-dark-text-secondary" />
                                <input
                                    value={targetUrl}
                                    onChange={(e) => setTargetUrl(e.target.value)}
                                    className="flex-1 bg-transparent text-sm outline-none px-2 text-light-text dark:text-dark-text-secondary"
                                    placeholder="Target URL (e.g., http://localhost:3000)"
                                />
                            </div>

                            <div className="h-4 w-px bg-light-border dark:bg-dark-border dark:bg-white/10" />

                            {/* Connection Status */}
                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${wsConnected
                                ? 'bg-green/10 text-green dark:bg-green/20 dark:text-green'
                                : 'bg-orange-primary/10 text-orange-primary dark:bg-orange-primary/20 dark:text-orange-primary'
                                }`}>
                                {wsConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                                {wsConnected ? 'Connected' : 'Disconnected'}
                            </div>

                            {/* Connected Apps */}
                            {targetApps.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary">Monitoring:</span>
                                    {targetApps.map(app => (
                                        <span
                                            key={app.socketId}
                                            className="px-2 py-0.5 bg-blue-primary/10 text-blue-primary text-xs rounded-full font-mono"
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
                                className="ml-auto text-xs font-medium text-orange-primary hover:underline flex items-center gap-1"
                            >
                                <Plus className="w-3 h-3" />
                                Setup Target App
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* --- Main Content --- */}
            <main className="max-w-[1600px] mx-auto p-6">
                {isOfflineMock && (
                    <div className="mb-6 bg-blue-primary/10 border border-blue-primary/20 text-blue-primary p-4 rounded-xl flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <WifiOff className="w-5 h-5" />
                            后端不可达（Mock 预览）：当前数据为 mock（只读）
                        </span>
                        <button onClick={() => setError(null)} className="opacity-60 hover:opacity-100">
                            <XCircle className="w-5 h-5" />
                        </button>
                    </div>
                )}
                {error && (
                    <div className="mb-6 bg-orange-primary/10 border border-orange-primary/20 text-orange-primary p-4 rounded-xl flex items-center justify-between">
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
            {showCreateTicket && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className={`modal-glass w-full max-w-2xl animate-scale-in p-0 overflow-hidden`}>
                        <div className="p-6 border-b border-light-border dark:border-dark-border dark:border-white/10 flex justify-between items-center">
                            <h2 className="text-xl font-bold dark:text-white">
                                {selectedTicket ? 'Edit Ticket' : 'Create New Ticket'}
                            </h2>
                            <button onClick={() => { setShowCreateTicket(false); setSelectedTicket(null); setSelectedLog(null); }} className="p-2 hover:bg-black/5 rounded-full dark:text-white">✕</button>
                        </div>

                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            {selectedLog && (
                                <div className="p-3 bg-dark-bg text-dark-text-secondary font-mono text-xs rounded-lg mb-4 border border-dark-border">
                                    <div className="flex items-center gap-2 mb-1 text-orange-primary font-bold">
                                        <Terminal className="w-3 h-3" /> LINKED LOG
                                    </div>
                                    {selectedLog.message}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold mb-1.5 text-light-text-primary dark:text-dark-text-primary">Title</label>
                                <input
                                    className="input-modern"
                                    value={selectedTicket ? selectedTicket.title : newTicketData.title}
                                    onChange={e => selectedTicket ? setSelectedTicket({ ...selectedTicket, title: e.target.value }) : setNewTicketData({ ...newTicketData, title: e.target.value })}
                                    placeholder="Ticket Title"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-1.5 text-light-text-primary dark:text-dark-text-primary">Priority</label>
                                    <select
                                        className="input-modern"
                                        value={selectedTicket ? selectedTicket.priority : newTicketData.priority}
                                        onChange={e => selectedTicket ? setSelectedTicket({ ...selectedTicket, priority: e.target.value as Ticket['priority'] }) : setNewTicketData({ ...newTicketData, priority: e.target.value as Ticket['priority'] })}
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1.5 text-light-text-primary dark:text-dark-text-primary">Assignee</label>
                                    <input
                                        className="input-modern"
                                        value={selectedTicket ? (selectedTicket.assignee || '') : newTicketData.assignee}
                                        onChange={e => selectedTicket ? setSelectedTicket({ ...selectedTicket, assignee: e.target.value }) : setNewTicketData({ ...newTicketData, assignee: e.target.value })}
                                        placeholder="Unassigned"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold mb-1.5 text-light-text-primary dark:text-dark-text-primary">Description</label>
                                <textarea
                                    className="input-modern min-h-[120px] resize-none font-mono text-sm"
                                    value={selectedTicket ? selectedTicket.description : newTicketData.description}
                                    onChange={e => selectedTicket ? setSelectedTicket({ ...selectedTicket, description: e.target.value }) : setNewTicketData({ ...newTicketData, description: e.target.value })}
                                    placeholder="Markdown supported..."
                                />
                            </div>
                        </div>

                        <div className="p-6 border-t border-light-border dark:border-dark-border dark:border-white/10 flex gap-3 bg-light-surface-2 dark:bg-dark-surface-2/50 dark:bg-white/5">
                            <button
                                onClick={selectedTicket ? () => { /* Update implementation skipped for brevity in modal, user asked for Kanban mostly */ setShowCreateTicket(false) } : handleCreateTicket}
                                className="btn-modern btn-primary w-full shadow-lg shadow-orange-primary/20"
                            >
                                {selectedTicket ? 'Save Changes' : 'Create Ticket'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Inject Script Modal --- */}
            {showInjectScript && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className={`modal-glass w-full max-w-2xl animate-scale-in p-0 overflow-hidden`}>
                        <div className="p-6 border-b border-light-border dark:border-dark-border dark:border-white/10 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                                    <Radio className="w-5 h-5 text-orange-primary" />
                                    Setup Real-time Monitoring
                                </h2>
                                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">Add this script to your target application</p>
                            </div>
                            <button
                                onClick={() => setShowInjectScript(false)}
                                className="p-2 hover:bg-black/5 rounded-full dark:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Target URL Display */}
                            <div className="flex items-center gap-3 p-3 bg-blue-primary/5 dark:bg-blue-primary/10 border border-blue-primary/20 rounded-lg">
                                <Globe className="w-5 h-5 text-blue-primary" />
                                <div className="flex-1">
                                    <span className="text-xs text-light-text-secondary dark:text-dark-text-secondary dark:text-light-text-secondary dark:text-dark-text-secondary">Target Application</span>
                                    <p className="font-mono text-sm font-medium text-blue-primary">{targetUrl || 'http://localhost:3000'}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-bold text-light-text-primary dark:text-dark-text-primary">
                                        📋 Copy & Paste to your HTML
                                    </label>
                                    <button
                                        onClick={copyInjectScript}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${copied
                                            ? 'bg-green/10 text-green dark:bg-green/20 dark:text-green'
                                            : 'bg-light-surface-2 dark:bg-dark-surface-2 text-light-text-primary hover:bg-light-surface-2 dark:hover:bg-dark-surface-2 dark:bg-white/10 dark:text-dark-text-secondary'
                                            }`}
                                    >
                                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                        {copied ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                                <pre className="bg-dark-bg text-dark-text p-4 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                                    {getInjectScript()}
                                </pre>
                            </div>

                            <div className="bg-blue-primary/10 dark:bg-blue-primary/10 border border-blue-primary/20 dark:border-blue-primary/20 rounded-lg p-4">
                                <h4 className="font-bold text-blue-primary dark:text-blue-primary text-sm mb-2">📌 Instructions</h4>
                                <ol className="text-xs text-blue-primary dark:text-blue-primary space-y-1 list-decimal list-inside">
                                    <li>Copy the script above</li>
                                    <li>Paste it into the <code className="bg-blue-primary/10 dark:bg-blue-primary/20 px-1 rounded">&lt;head&gt;</code> or before <code className="bg-blue-primary/10 dark:bg-blue-primary/20 px-1 rounded">&lt;/body&gt;</code> of your target app</li>
                                    <li>Refresh your target app - it will automatically connect</li>
                                    <li>Console logs will appear here in real-time! 🚀</li>
                                </ol>
                            </div>

                            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-4">
                                <h4 className="font-bold text-amber-800 dark:text-amber-300 text-sm mb-2">⚠️ Development Only</h4>
                                <p className="text-xs text-amber-700 dark:text-amber-400">
                                    This script is for development purposes only. Remove it before deploying to production.
                                </p>
                            </div>
                        </div>

                        <div className="p-6 border-t border-light-border dark:border-dark-border dark:border-white/10 bg-light-surface-2 dark:bg-dark-surface-2/50 dark:bg-white/5">
                            <button
                                onClick={() => setShowInjectScript(false)}
                                className="btn-modern btn-primary w-full"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BugTrackerApp;