import type { Ticket, Log } from '@/types/bugTrackerApp';
import type { Note } from '@/components/ui/note/utils/noteTypes';

export const mockTickets: Ticket[] = [
    {
        id: 'T-1001',
        title: 'Authentication failing on mobile devices',
        description: 'Users report unable to login via iOS Safari.',
        status: 'open',
        priority: 'critical',
        reporter: 'Alice Smith',
        assignee: 'Bob Jones',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
        tags: ['mobile', 'auth', 'bug'],
        relatedLogs: []
    },
    {
        id: 'T-1002',
        title: 'Dashboard charts not rendering correctly',
        description: 'Charts overlap on smaller screens.',
        status: 'in-progress',
        priority: 'high',
        reporter: 'John Doe',
        assignee: 'Sarah Lee',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        tags: ['ui', 'dashboard'],
        relatedLogs: []
    },
    {
        id: 'T-1003',
        title: 'Update dependencies to latest versions',
        description: 'React and TypeScript need updating.',
        status: 'open',
        priority: 'medium',
        reporter: 'Tech Lead',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days ago
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
        tags: ['maintenance', 'deps'],
        relatedLogs: []
    },
    {
        id: 'T-1004',
        title: 'Fix typos in landing page',
        description: 'Several spelling errors in the hero section.',
        status: 'resolved',
        priority: 'low',
        reporter: 'Marketing Team',
        assignee: 'Junior Dev',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(), // 10 days ago
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
        tags: ['content', 'ui'],
        relatedLogs: []
    },
    {
        id: 'T-1005',
        title: 'Database connection timeout intermittently',
        description: 'Seeing timeouts in the logs during peak hours.',
        status: 'open',
        priority: 'high',
        reporter: 'DevOps',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
        updatedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        tags: ['backend', 'db', 'performance'],
        relatedLogs: ['L-501', 'L-502']
    },
    {
        id: 'T-1006',
        title: 'Add dark mode support for settings page',
        description: 'Settings page flashes white on load.',
        status: 'closed',
        priority: 'medium',
        reporter: 'UX Team',
        assignee: 'Alice Smith',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(), // 2 weeks ago
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
        tags: ['ui', 'feature'],
        relatedLogs: []
    }
];

export const mockLogs: Log[] = [
    {
        id: 'L-501',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
        level: 'error',
        message: 'Connection timeout: Database pool exhausted',
        source: 'DatabaseService',
        stack: 'Error: Connection timeout\n    at DatabaseService.connect (...)'
    },
    {
        id: 'L-502',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
        level: 'warning',
        message: 'High memory usage: Worker process #4',
        source: 'SystemMonitor'
    },
    {
        id: 'L-503',
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
        level: 'info',
        message: 'User authentication successful: user_123',
        source: 'AuthService'
    },
    {
        id: 'L-504',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        level: 'info',
        message: 'Scheduled backup completed successfully',
        source: 'BackupService'
    },
    {
        id: 'L-505',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
        level: 'error',
        message: 'API Rate limit exceeded for IP 192.168.1.1',
        source: 'RateLimiter'
    }
];

// =============================================================================
// Auth / Profile / Settings (for offline viewer mode)
// =============================================================================

export interface MockUser {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
    role?: string;
    phone?: string;
    company?: string;
    position?: string;
    location?: string;
    timezone?: string;
    bio?: string;
    gender?: string;
    birthDate?: string;
    language?: string;
    isActive?: boolean;
    emailVerified?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface MockUserSettings {
    emailNotifications: boolean;
    pushNotifications: boolean;
    bugAlerts: boolean;
    weeklyReports: boolean;
    teamUpdates: boolean;
    twoFactorAuth: boolean;
    sessionTimeout: number;
    loginAlerts: boolean;
    profileVisibility: boolean;
    activityStatus: boolean;
    dataCollection: boolean;
}

const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();

export const mockAccessToken = 'mock-access-token';
export const mockRefreshToken = 'mock-refresh-token';

export const mockUser: MockUser = {
    id: 1,
    firstName: 'Viewer',
    lastName: 'Demo',
    email: 'viewer.demo@example.com',
    role: 'viewer',
    avatarUrl: undefined,
    phone: '+66 81 234 5678',
    company: 'ApexOps',
    position: 'QA / Viewer',
    location: 'Bangkok',
    timezone: 'Asia/Bangkok',
    bio: 'Offline demo account (mock).',
    language: 'English (US)',
    isActive: true,
    emailVerified: true,
    createdAt: iso(1000 * 60 * 60 * 24 * 120),
    updatedAt: iso(1000 * 60 * 10),
};

export const mockUserSettings: MockUserSettings = {
    emailNotifications: true,
    pushNotifications: true,
    bugAlerts: true,
    weeklyReports: false,
    teamUpdates: true,
    twoFactorAuth: false,
    sessionTimeout: 30,
    loginAlerts: true,
    profileVisibility: true,
    activityStatus: true,
    dataCollection: false,
};

// =============================================================================
// Notes (align with server/src/api/notes.ts formatNote + stats/calendar responses)
// =============================================================================

export const mockNotes: Note[] = [
    {
        id: '101',
        title: 'Release checklist (Sprint 12)',
        content: 'Prepare release notes, run smoke tests, verify DB migrations.',
        type: 'list',
        isPinned: true,
        color: 'red',
        tags: ['release', 'checklist'],
        checklistItems: [
            { text: 'Run unit tests', checked: true },
            { text: 'Run e2e tests', checked: false },
            { text: 'Verify DB connection', checked: true },
        ],
        quote: { text: '', author: '' },
        updatedAt: iso(1000 * 60 * 25),
    },
    {
        id: '102',
        title: 'Incident: DB pool exhausted',
        content: 'Observed connection timeouts during peak hours.\nInvestigate pool size and slow queries.',
        type: 'text',
        isPinned: false,
        color: undefined,
        tags: ['incident', 'database'],
        updatedAt: iso(1000 * 60 * 60 * 6),
    },
    {
        id: '103',
        title: 'Useful link: Prisma docs',
        content: 'Quick reference for schema mapping and migrations.',
        type: 'link',
        isPinned: false,
        color: undefined,
        tags: ['docs'],
        linkUrl: 'https://www.prisma.io/docs',
        updatedAt: iso(1000 * 60 * 60 * 24 * 2),
    },
    {
        id: '104',
        title: 'UI idea: better empty states',
        content: '<p>Add helpful previews when API is offline.</p>',
        type: 'text',
        isPinned: false,
        color: undefined,
        tags: ['ui', 'idea'],
        updatedAt: iso(1000 * 60 * 60 * 24 * 4),
    },
    {
        id: '105',
        title: 'Screenshot: layout bug',
        content: '',
        type: 'image',
        isPinned: false,
        color: undefined,
        tags: ['bug', 'ui'],
        imageUrl: 'https://picsum.photos/seed/apexops-note/800/500',
        updatedAt: iso(1000 * 60 * 60 * 12),
    },
];

export interface MockNoteStatsOverview {
    total: number;
    byType: { text: number; image: number; list: number; link: number };
    pinned: { pinned: number; unpinned: number };
    daily: Array<{ date: string; day: string; count: number }>;
    monthly: Array<{ month: string; monthName: string; count: number }>;
    byColor: Array<{ color: string; count: number }>;
    recentActivity: Array<{ id: string; title: string; type: string; createdAt: string; updatedAt: string }>;
}

const weekdayShort = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short' });
const monthShort = (d: Date) => d.toLocaleDateString('en-US', { month: 'short' });
const dateKey = (d: Date) => d.toISOString().split('T')[0];

export const mockNoteStatsOverview: MockNoteStatsOverview = (() => {
    const now = new Date();
    const byType = { text: 0, image: 0, list: 0, link: 0 };
    let pinned = 0;
    let unpinned = 0;

    for (const n of mockNotes) {
        byType[n.type] = (byType[n.type] || 0) + 1;
        if (n.isPinned) pinned++;
        else unpinned++;
    }

    const daily: MockNoteStatsOverview['daily'] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        daily.push({ date: dateKey(d), day: weekdayShort(d), count: i % 2 === 0 ? 1 : 0 });
    }

    const monthly: MockNoteStatsOverview['monthly'] = Array.from({ length: 6 }).map((_, idx) => {
        const d = new Date(now);
        d.setMonth(d.getMonth() - (5 - idx));
        const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return { month, monthName: monthShort(d), count: idx % 2 === 0 ? 2 : 1 };
    });

    const byColor = [
        { color: 'red', count: mockNotes.filter((n) => n.color === 'red').length },
        { color: 'default', count: mockNotes.filter((n) => !n.color).length },
    ].filter((r) => r.count > 0);

    const recentActivity = mockNotes
        .slice()
        .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
        .slice(0, 10)
        .map((n) => ({
            id: n.id,
            title: n.title,
            type: n.type,
            createdAt: iso(1000 * 60 * 60 * 24 * 10),
            updatedAt: n.updatedAt || iso(1000 * 60 * 10),
        }));

    return {
        total: mockNotes.length,
        byType,
        pinned: { pinned, unpinned },
        daily,
        monthly,
        byColor,
        recentActivity,
    };
})();

export interface MockCalendarNote {
    id: string;
    title: string;
    type: string;
    color: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface MockCalendarNotesResponse {
    year: number;
    month: number;
    notesByDay: Record<number, MockCalendarNote[]>;
    totalNotes: number;
}

export const buildMockCalendarNotes = (year: number, month: number): MockCalendarNotesResponse => {
    const base = new Date(year, month - 1, 1);
    const notesByDay: Record<number, MockCalendarNote[]> = {};

    const seed = [
        { dayOffset: 2, noteId: '101' },
        { dayOffset: 7, noteId: '102' },
        { dayOffset: 12, noteId: '103' },
        { dayOffset: 18, noteId: '105' },
    ];

    for (const s of seed) {
        const d = new Date(base);
        d.setDate(1 + s.dayOffset);
        if (d.getMonth() !== base.getMonth()) continue;
        const day = d.getDate();
        const n = mockNotes.find((x) => x.id === s.noteId) || mockNotes[0];
        if (!notesByDay[day]) notesByDay[day] = [];
        notesByDay[day].push({
            id: n.id,
            title: n.title,
            type: n.type,
            color: (n.color as string) ?? null,
            createdAt: iso(1000 * 60 * 60 * 24 * 3),
            updatedAt: n.updatedAt || iso(1000 * 60 * 30),
        });
    }

    const totalNotes = Object.values(notesByDay).reduce((sum, arr) => sum + arr.length, 0);
    return { year, month, notesByDay, totalNotes };
};

// =============================================================================
// Chat users (for /api/chat/users fallback)
// =============================================================================

export interface MockChatUserSummary {
    id: number;
    firstName: string;
    lastName: string;
    email?: string;
    avatarUrl?: string;
}

export const mockChatUsers: MockChatUserSummary[] = [
    { id: 2, firstName: 'Sarah', lastName: 'Jenkins', email: 'sarah.jenkins@example.com' },
    { id: 3, firstName: 'DevOps', lastName: 'Team', email: 'devops@example.com' },
    { id: 4, firstName: 'Alert', lastName: 'Bot', email: 'alerts@example.com' },
];

// =============================================================================
// AIChat (for /api/ai/chat fallback)
// =============================================================================

export const mockAiReply = (prompt: string): string => {
    const p = (prompt || '').trim();
    if (!p) return '（Mock）请输入一个问题。';
    return [
        '（Mock AI）后端当前不可达，所以这里展示的是示例回答。',
        '',
        `你问的是：${p}`,
        '',
        '建议：启动后端服务并连接 PostgreSQL 后，可获得真实 AI/数据响应。',
    ].join('\n');
};
