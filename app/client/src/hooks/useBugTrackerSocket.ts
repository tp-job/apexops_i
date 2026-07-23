import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Log } from '@/types/bugTrackerApp';

export interface TargetApp {
    socketId: string;
    appName: string;
    url: string;
    connectedAt: string;
}

export const useBugTrackerSocket = (
    monitorMode: 'snapshot' | 'realtime', 
    setLogs: React.Dispatch<React.SetStateAction<Log[]>>
) => {
    const [wsConnected, setWsConnected] = useState(false);
    const [targetApps, setTargetApps] = useState<TargetApp[]>([]);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (monitorMode !== 'realtime') {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setWsConnected(false);
            }
            return;
        }

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

        socket.on('target-apps-list', (apps: TargetApp[]) => {
            setTargetApps(apps);
        });

        socket.on('target-app-connected', (app: TargetApp) => {
            setTargetApps(prev => [...prev, app]);
        });

        socket.on('target-app-disconnected', (app: TargetApp) => {
            setTargetApps(prev => prev.filter(a => a.socketId !== app.socketId));
        });

        socket.on('console-logs', (newLogs: Log[]) => {
            setLogs(prev => {
                const combined = [...newLogs, ...prev];
                return combined.slice(0, 500);
            });
        });

        return () => {
            socket.disconnect();
        };
    }, [monitorMode, setLogs]);

    return { wsConnected, targetApps };
};
