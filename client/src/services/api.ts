import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Logs API
export const logsAPI = {
    getAll: async (params?: { level?: string; source?: string; limit?: number }) => {
        const response = await api.get('/api/logs', { params });
        return response.data;
    },
    getById: async (id: string) => {
        const response = await api.get(`/api/logs/${id}`);
        return response.data;
    },
    getStats: async () => {
        const response = await api.get('/api/logs/stats');
        return response.data;
    },
    create: async (log: { level: string; message: string; source?: string; stack?: string }) => {
        const response = await api.post('/api/logs', log);
        return response.data;
    },
    delete: async (id: string) => {
        const response = await api.delete(`/api/logs/${id}`);
        return response.data;
    },
};

// Tickets API
export const ticketsAPI = {
    getAll: async (params?: { status?: string; priority?: string; assignee?: string; limit?: number }) => {
        const response = await api.get('/api/tickets', { params });
        return response.data;
    },
    getById: async (id: string) => {
        const response = await api.get(`/api/tickets/${id}`);
        return response.data;
    },
    getStats: async () => {
        const response = await api.get('/api/tickets/stats');
        return response.data;
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
        const response = await api.post('/api/tickets', ticket);
        return response.data;
    },
    update: async (id: string, ticket: {
        title?: string;
        description?: string;
        status?: string;
        priority?: string;
        assignee?: string;
        tags?: string[];
    }) => {
        const response = await api.put(`/api/tickets/${id}`, ticket);
        return response.data;
    },
    delete: async (id: string) => {
        const response = await api.delete(`/api/tickets/${id}`);
        return response.data;
    },
};

// Console Logs API
export const consoleLogsAPI = {
    fetchFromUrl: async (url: string) => {
        const response = await api.post('/api/console-logs', { url });
        return response.data;
    },
};

export default api;

