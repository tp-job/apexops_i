import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import {
    getAccessToken,
    refreshOnce,
    endSession,
    SessionExpiredError,
} from '@/lib/authSession';
import {
    advanceConnection,
    initialConnection,
    isIssueActivityFrame,
    type IssueActivityFrame,
    type StreamConnection,
} from '@/lib/issueStream';

interface UseIssueStreamOptions {
    /** Project slug to subscribe to. Nothing connects while this is undefined. */
    slug: string | undefined;
    /** One frame off `project:<id>`. Already shape-checked. */
    onFrame: (frame: IssueActivityFrame) => void;
    /**
     * Called on a reconnect that follows an earlier successful connect.
     *
     * Pushes that arrived while the socket was down are gone — there is no buffer
     * and there will not be one (R-D5). A list that can be re-derived from the
     * database with one query does not justify durable delivery machinery.
     */
    onResync: () => void;
}

/**
 * The socket half of the live issue list.
 *
 * Two things here are load-bearing and easy to lose in a refactor:
 *
 * 1. **The badge is driven by transport events only** — `live` is never set
 *    optimistically, so the page cannot claim to be current over a dead feed.
 * 2. **An expired token refreshes through `lib/authSession.ts`** (R-D6), the one
 *    coordinator, rather than a second implementation. Its `/refresh` route is
 *    single-use, so a private refresh here would race the HTTP transports and
 *    log people out at random — the exact bug that module exists to prevent.
 *    Sockets were explicitly *not* covered there until this sprint; this is the
 *    first caller driving it from outside an HTTP transport.
 */
export function useIssueStream({ slug, onFrame, onResync }: UseIssueStreamOptions) {
    const [connection, setConnection] = useState<StreamConnection>(initialConnection);

    // Read through refs so a changing callback identity does not tear the socket
    // down and rebuild it on every render of the list.
    const onFrameRef = useRef(onFrame);
    onFrameRef.current = onFrame;
    const onResyncRef = useRef(onResync);
    onResyncRef.current = onResync;

    const advance = useCallback(
        (event: Parameters<typeof advanceConnection>[1]) => setConnection((c) => advanceConnection(c, event)),
        []
    );

    useEffect(() => {
        if (!slug) return;
        const token = getAccessToken();
        if (!token) return;

        const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:8081';
        const socket: Socket = io(wsUrl, {
            transports: ['websocket', 'polling'],
            auth: { token },
        });

        let disposed = false;
        /** Has this socket been up before? Tells a first connect from a resync. */
        let hasConnectedBefore = false;
        /** Consecutive auth failures. The second one is a real sign-out, not a retry. */
        let authFailures = 0;

        socket.on('connect', () => {
            authFailures = 0;
            advance({ type: 'connected' });
            socket.emit('issues-join', { slug });
            // Deliberately after the join: a resync that lands before the room is
            // rejoined would refetch and then miss everything until the next push.
            if (hasConnectedBefore) onResyncRef.current();
            hasConnectedBefore = true;
        });

        socket.on('disconnect', () => advance({ type: 'disconnected' }));

        socket.on('connect_error', (err: Error) => {
            advance({ type: 'attempt-failed' });

            // The server rejects a bad or expired token with exactly this message
            // (`io.use` in `server/src/server.ts`). Anything else — server down,
            // DNS, offline — is a transport problem and socket.io's own backoff
            // handles it.
            if (err?.message !== 'Unauthorized' || disposed) return;

            authFailures += 1;
            if (authFailures > 1) {
                // A second consecutive auth refusal after a fresh token means the
                // session is genuinely over. Retrying would loop forever against a
                // door that is not going to open.
                socket.disconnect();
                endSession();
                return;
            }

            // Stop socket.io retrying with the token that was just refused; the
            // reconnect below is the deliberate single retry (R-D6).
            socket.disconnect();
            void refreshOnce()
                .then((fresh) => {
                    if (disposed) return;
                    socket.auth = { token: fresh };
                    socket.connect();
                })
                .catch((refreshErr) => {
                    // `SessionExpiredError` has already ended the session inside
                    // `authSession`. A network failure has not, and must not: a
                    // wifi blip is not proof that a session is invalid.
                    if (!(refreshErr instanceof SessionExpiredError)) {
                        if (!disposed) socket.connect();
                    }
                });
        });

        socket.on('issue-activity', (payload: unknown) => {
            if (isIssueActivityFrame(payload)) onFrameRef.current(payload);
        });

        return () => {
            disposed = true;
            socket.removeAllListeners();
            socket.disconnect();
        };
    }, [slug, advance]);

    return { status: connection.status };
}
