import axios from 'axios';
import { createReadOnlyOfflineError, isMockEnabled, isNetworkFailure } from '@/utils/offlineMock';
import { mockLogs, mockTickets } from '@/utils/mockData';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

const filterLogs = (params?: { level?: string; source?: string; limit?: number }) => {
    const level = params?.level;
    const source = params?.source?.toLowerCase();
    const limit = typeof params?.limit === 'number' ? params?.limit : undefined;
    let rows = mockLogs.slice();
    if (level) rows = rows.filter((l) => l.level === level);
    if (source) rows = rows.filter((l) => (l.source || '').toLowerCase().includes(source));
    if (limit !== undefined) rows = rows.slice(0, limit);
    (rows as any).__isMock = true;
    return rows;
};

const filterTickets = (params?: { status?: string; priority?: string; assignee?: string; limit?: number }) => {
    const status = params?.status;
    const priority = params?.priority;
    const assignee = params?.assignee?.toLowerCase();
    const limit = typeof params?.limit === 'number' ? params?.limit : undefined;
    let rows = mockTickets.slice();
    if (status) rows = rows.filter((t) => t.status === status);
    if (priority) rows = rows.filter((t) => t.priority === priority);
    if (assignee) rows = rows.filter((t) => (t.assignee || '').toLowerCase().includes(assignee));
    if (limit !== undefined) rows = rows.slice(0, limit);
    (rows as any).__isMock = true;
    return rows;
};

// Logs API
export const logsAPI = {
    getAll: async (params?: { level?: string; source?: string; limit?: number }) => {
        try {
            const response = await api.get('/api/logs', { params });
            return response.data;
        } catch (err) {
            if (isMockEnabled() && isNetworkFailure(err)) return filterLogs(params);
            throw err;
        }
    },
    getById: async (id: string) => {
        try {
            const response = await api.get(`/api/logs/${id}`);
            return response.data;
        } catch (err) {
            if (isMockEnabled() && isNetworkFailure(err)) {
                return mockLogs.find((l) => l.id === id) ?? null;
            }
            throw err;
        }
    },
    getStats: async () => {
        try {
            const response = await api.get('/api/logs/stats');
            return response.data;
        } catch (err) {
            if (isMockEnabled() && isNetworkFailure(err)) {
                const errors = mockLogs.filter((l) => l.level === 'error').length;
                const warnings = mockLogs.filter((l) => l.level === 'warning').length;
                const info = mockLogs.filter((l) => l.level === 'info').length;
                return { total: mockLogs.length, byLevel: { errors, warnings, info }, last24Hours: mockLogs.length, last7Days: mockLogs.length };
            }
            throw err;
        }
    },
    create: async (log: { level: string; message: string; source?: string; stack?: string }) => {
        try {
            const response = await api.post('/api/logs', log);
            return response.data;
        } catch (err) {
            if (isMockEnabled() && isNetworkFailure(err)) throw createReadOnlyOfflineError();
            throw err;
        }
    },
    delete: async (id: string) => {
        try {
            const response = await api.delete(`/api/logs/${id}`);
            return response.data;
        } catch (err) {
            if (isMockEnabled() && isNetworkFailure(err)) throw createReadOnlyOfflineError();
            throw err;
        }
    },
};

// Tickets API
export const ticketsAPI = {
    getAll: async (params?: { status?: string; priority?: string; assignee?: string; limit?: number }) => {
        try {
            const response = await api.get('/api/tickets', { params });
            return response.data;
        } catch (err) {
            if (isMockEnabled() && isNetworkFailure(err)) return filterTickets(params);
            throw err;
        }
    },
    getById: async (id: string) => {
        try {
            const response = await api.get(`/api/tickets/${id}`);
            return response.data;
        } catch (err) {
            if (isMockEnabled() && isNetworkFailure(err)) {
                return mockTickets.find((t) => t.id === id) ?? null;
            }
            throw err;
        }
    },
    getStats: async () => {
        try {
            const response = await api.get('/api/tickets/stats');
            return response.data;
        } catch (err) {
            if (isMockEnabled() && isNetworkFailure(err)) {
                const byStatus = {
                    open: mockTickets.filter((t) => t.status === 'open').length,
                    inProgress: mockTickets.filter((t) => t.status === 'in-progress').length,
                    resolved: mockTickets.filter((t) => t.status === 'resolved').length,
                    closed: mockTickets.filter((t) => t.status === 'closed').length,
                };
                const byPriority = {
                    critical: mockTickets.filter((t) => t.priority === 'critical').length,
                    high: mockTickets.filter((t) => t.priority === 'high').length,
                    medium: mockTickets.filter((t) => t.priority === 'medium').length,
                    low: mockTickets.filter((t) => t.priority === 'low').length,
                };
                return { total: mockTickets.length, byStatus, byPriority };
            }
            throw err;
        }
    },
    create: async (ticket: {
        title: string;
        description?: string;
        status?: string;
        priority?: string;
        assignee?: string;
        reporter?: string;
        tags?: string[];
        relatedLogs?: string[];
    }) => {
        try {
            const response = await api.post('/api/tickets', ticket);
            return response.data;
        } catch (err) {
            if (isMockEnabled() && isNetworkFailure(err)) throw createReadOnlyOfflineError();
            throw err;
        }
    },
    update: async (id: string, ticket: {
        title?: string;
        description?: string;
        status?: string;
        priority?: string;
        assignee?: string;
        tags?: string[];
    }) => {
        try {
            const response = await api.put(`/api/tickets/${id}`, ticket);
            return response.data;
        } catch (err) {
            if (isMockEnabled() && isNetworkFailure(err)) throw createReadOnlyOfflineError();
            throw err;
        }
    },
    delete: async (id: string) => {
        try {
            const response = await api.delete(`/api/tickets/${id}`);
            return response.data;
        } catch (err) {
            if (isMockEnabled() && isNetworkFailure(err)) throw createReadOnlyOfflineError();
            throw err;
        }
    },
};

// Console Logs API
export const consoleLogsAPI = {
    fetchFromUrl: async (url: string) => {
        try {
            const response = await api.post('/api/console-logs', { url });
            return response.data;
        } catch (err) {
            if (isMockEnabled() && isNetworkFailure(err)) throw createReadOnlyOfflineError();
            throw err;
        }
    },
};

export default api;

