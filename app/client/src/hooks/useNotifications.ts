import { useCallback, useEffect, useRef, useState } from 'react';
import { notificationsAPI } from '@/services/notifications';
import type { AppNotification } from '@/types/projects';
import { getErrorMessage } from '@/utils/error';

/** How often the bell re-checks. */
const POLL_MS = 60_000;

export interface UseNotificationsResult {
    notifications: AppNotification[];
    unreadCount: number;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    markRead: (id: number) => Promise<void>;
    markAllRead: () => Promise<void>;
}

/**
 * The bell's data.
 *
 * Polls on an interval because there is no socket channel for notifications yet
 * — and polling that works beats a realtime path that does not exist. One
 * request a minute for a badge count is cheap; when the issue stream lands
 * (Sprint 3), this should switch to it and the interval should go.
 *
 * **Pauses while the tab is hidden.** A background tab polling forever is the
 * kind of thing that shows up as mystery load, and nobody reads a badge they
 * cannot see. It refetches immediately on becoming visible, so the count is
 * fresh the moment you look at it.
 */
export function useNotifications(enabled = true): UseNotificationsResult {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Read inside the interval without making it a dependency, or the timer
    // tears down and rebuilds on every tick.
    const enabledRef = useRef(enabled);
    enabledRef.current = enabled;

    const load = useCallback(async (showSpinner: boolean) => {
        if (!enabledRef.current) return;
        if (showSpinner) setLoading(true);
        try {
            const res = await notificationsAPI.list({ limit: 20 });
            setNotifications(res.notifications);
            setUnreadCount(res.unreadCount);
            setError(null);
        } catch (err) {
            setError(getErrorMessage(err, 'Could not load notifications'));
        } finally {
            if (showSpinner) setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!enabled) return;
        void load(true);

        const id = setInterval(() => {
            if (document.visibilityState === 'visible') void load(false);
        }, POLL_MS);

        const onVisible = () => {
            if (document.visibilityState === 'visible') void load(false);
        };
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            clearInterval(id);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [enabled, load]);

    return {
        notifications,
        unreadCount,
        loading,
        error,
        refetch: () => load(true),

        markRead: async (id) => {
            // Optimistic: the badge should drop the instant you click, and a
            // failed mark-read is not worth a rollback animation.
            setNotifications((prev) =>
                prev.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n))
            );
            setUnreadCount((c) => Math.max(0, c - 1));
            try {
                await notificationsAPI.markRead(id);
            } catch {
                void load(false); // Re-sync from the server rather than guessing.
            }
        },

        markAllRead: async () => {
            const now = new Date().toISOString();
            setNotifications((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: now })));
            setUnreadCount(0);
            try {
                await notificationsAPI.markAllRead();
            } catch {
                void load(false);
            }
        },
    };
}
