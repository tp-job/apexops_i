import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getAuthToken } from '@/api/config';
import {
    appendLogs,
    clearLogs as clearBuffer,
    emptyBuffer,
    normaliseLevel,
    setPaused as setBufferPaused,
    type ConsoleBufferState,
    type MonitorLog,
} from '@/lib/consoleBuffer';

/**
 * Live console feed for `/admin/console`.
 *
 * Replaces `useBugTrackerSocket`, which consumed the same four events but had no
 * call sites — an orphan left by the 2026-07-24 UI reset. The buffer rules moved
 * out to `lib/consoleBuffer.ts` so they can be tested; what is left here is the
 * socket lifecycle, which cannot be.
 *
 * **The connection state is four-valued, not a boolean** (criterion 17). "Nothing
 * is happening" and "the page stopped listening" render identically in a log
 * panel, and that is the worst failure a monitoring view can have. `refused` is
 * separate from `offline` because the fix is different: one is a dead server, the
 * other is an account that is not an admin, and telling a user to check their
 * network when the answer is "you lack permission" wastes everybody's time.
 */

export type MonitorStatus = 'connecting' | 'live' | 'offline' | 'refused';

/** Shape the server relay actually puts on the wire (`server.ts` enriches each log). */
interface RelayedLog {
    id?: string;
    timestamp?: string;
    level?: unknown;
    message?: string;
    source?: string;
    stack?: string;
    appName?: string;
    receivedAt?: string;
}

export interface TargetApp {
    socketId: string;
    appName: string;
    url: string;
    connectedAt: string;
}

/**
 * The relay does not guarantee an id, and React keys must be stable and unique —
 * two logs in the same millisecond from the same app is normal during a burst.
 */
let fallbackSeq = 0;
const toMonitorLog = (raw: RelayedLog): MonitorLog => ({
    id: raw.id || `log_${Date.now()}_${(fallbackSeq += 1)}`,
    timestamp: raw.timestamp || raw.receivedAt || new Date().toISOString(),
    level: normaliseLevel(raw.level),
    message: typeof raw.message === 'string' ? raw.message : String(raw.message ?? ''),
    source: raw.source || 'unknown',
    stack: raw.stack,
    appName: raw.appName,
    receivedAt: raw.receivedAt,
});

export function useConsoleMonitor() {
    const [status, setStatus] = useState<MonitorStatus>('connecting');
    const [refusedReason, setRefusedReason] = useState<string | null>(null);
    const [targetApps, setTargetApps] = useState<TargetApp[]>([]);
    const [buffer, setBuffer] = useState<ConsoleBufferState>(emptyBuffer);
    const socketRef = useRef<Socket | null>(null);

    // `paused` is read inside the socket handler, which closes over its first
    // render. The buffer state itself carries the flag, so the functional
    // updater below always sees the current value without re-subscribing —
    // re-subscribing on pause would tear down the socket and drop the burst.
    useEffect(() => {
        const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:8081';
        const socket = io(wsUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            auth: { token: getAuthToken() ?? undefined },
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            // NOT live yet. The room admits admins only, so the connection being
            // open says nothing about whether this account may watch it. `live`
            // waits for `target-apps-list`, which the server sends only on a
            // successful join.
            setStatus('connecting');
            setRefusedReason(null);
            socket.emit('register', { clientType: 'monitor' });
        });

        socket.on('target-apps-list', (apps: TargetApp[]) => {
            setTargetApps(apps);
            setStatus('live');
        });

        socket.on('monitor-error', (payload: { error?: string }) => {
            setRefusedReason(payload?.error || 'Monitoring refused');
            setStatus('refused');
        });

        socket.on('target-app-connected', (app: TargetApp) => {
            setTargetApps((prev) =>
                prev.some((a) => a.socketId === app.socketId) ? prev : [...prev, app],
            );
        });

        socket.on('target-app-disconnected', (app: TargetApp) => {
            setTargetApps((prev) => prev.filter((a) => a.socketId !== app.socketId));
        });

        socket.on('console-logs', (incoming: RelayedLog[]) => {
            const logs = (Array.isArray(incoming) ? incoming : []).map(toMonitorLog);
            setBuffer((prev) => appendLogs(prev, logs));
        });

        const goOffline = () => {
            // Refused is a decision the server already made; a dropped transport
            // must not overwrite it with a misleading "offline".
            setStatus((s) => (s === 'refused' ? s : 'offline'));
            // The apps list is a server-held fact. Holding a stale one over a dead
            // feed would show apps as connected that may well have gone.
            setTargetApps([]);
        };
        socket.on('disconnect', goOffline);
        socket.on('connect_error', goOffline);

        return () => {
            socket.off();
            socket.disconnect();
            socketRef.current = null;
        };
    }, []);

    const setPaused = useCallback((paused: boolean) => {
        setBuffer((prev) => setBufferPaused(prev, paused));
    }, []);

    const clear = useCallback(() => setBuffer(clearBuffer), []);

    const counts = useMemo(() => {
        let error = 0;
        let warning = 0;
        for (const l of buffer.visible) {
            if (l.level === 'error') error += 1;
            else if (l.level === 'warning') warning += 1;
        }
        return { total: buffer.visible.length, error, warning };
    }, [buffer.visible]);

    return {
        status,
        refusedReason,
        targetApps,
        logs: buffer.visible,
        paused: buffer.paused,
        pendingCount: buffer.pending.length,
        counts,
        setPaused,
        clear,
    };
}
