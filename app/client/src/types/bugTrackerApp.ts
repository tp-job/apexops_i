export interface Log {
    id: string;
    timestamp: string;
    level: 'error' | 'warning' | 'info';
    message: string;
    stack?: string;
    source: string;
}

export interface Ticket {
    id: string;
    title: string;
    description: string;
    status: 'open' | 'in-progress' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high' | 'critical';
    assignee?: string;
    reporter: string;
    createdAt: string;
    updatedAt: string;
    relatedLogs?: string[];
    tags: string[];
}