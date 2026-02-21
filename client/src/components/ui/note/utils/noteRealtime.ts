import { io, type Socket } from 'socket.io-client';
import type { Note } from './noteTypes';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:8081';

let notesSocket: Socket | null = null;

export const getNotesSocket = (): Socket => {
    if (!notesSocket) {
        notesSocket = io(WS_URL, {
            transports: ['websocket'],
        });
        notesSocket.emit('register', { clientType: 'notes' });
    }
    return notesSocket;
};

export const emitNoteUpdated = (noteId: string, payload: Partial<Note>): void => {
    try {
        const socket = getNotesSocket();
        socket.emit('note:updated', {
            noteId,
            payload,
            ts: Date.now(),
        });
    } catch (err) {
        console.error('Failed to emit note:updated event', err);
    }
};

