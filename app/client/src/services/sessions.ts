import { apiRequest, apiPost } from '@/api/request';

/**
 * Active sessions (spec S-D3).
 *
 * Every login writes a refresh-token row, so that table *is* the session list —
 * this is the one real security control in account settings that needed no new
 * infrastructure, unlike 2FA.
 */

export interface ActiveSession {
    id: number;
    /** Last 8 chars of the token. The token itself is never sent to the client. */
    fingerprint: string;
    current: boolean;
    userAgent: string | null;
    ipAddress: string | null;
    createdAt: string;
    expiresAt: string;
}

export const sessionsAPI = {
    list: (): Promise<{ sessions: ActiveSession[] }> => apiRequest('/api/auth/sessions'),

    revoke: (id: number): Promise<{ revoked: boolean }> =>
        apiRequest(`/api/auth/sessions/${id}`, { method: 'DELETE' }),

    /** "Sign out everywhere" — including this device. */
    revokeAll: (): Promise<{ revoked: number }> => apiPost('/api/auth/sessions/revoke-all'),
};

/**
 * Turns a user-agent string into something recognisable.
 *
 * Same deliberately-crude approach as the server's issue breakdown: the goal is
 * "is that my laptop?", not forensic accuracy. Order matters — Edge and Opera
 * both contain "Chrome", and Chrome contains "Safari".
 */
export function describeUserAgent(ua: string | null): string {
    if (!ua) return 'Unknown device';

    let browser = 'Unknown browser';
    if (/Edg[e/]/i.test(ua)) browser = 'Edge';
    else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
    else if (/Firefox\/|FxiOS/i.test(ua)) browser = 'Firefox';
    else if (/Chrome\/|CriOS/i.test(ua)) browser = 'Chrome';
    else if (/Safari\//i.test(ua)) browser = 'Safari';
    else if (/curl|wget|node|python/i.test(ua)) browser = 'Script';

    let os = '';
    if (/iPad/i.test(ua)) os = 'iPadOS';
    else if (/iPhone|iPod/i.test(ua)) os = 'iOS';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/Windows NT/i.test(ua)) os = 'Windows';
    else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS';
    else if (/CrOS/i.test(ua)) os = 'ChromeOS';
    else if (/Linux/i.test(ua)) os = 'Linux';

    return os ? `${browser} on ${os}` : browser;
}
