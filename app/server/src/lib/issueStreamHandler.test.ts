import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import { attachIssueStream } from './issueStreamHandler';
import { STREAM_ERR_REFUSED } from './issueStream';

/**
 * A real Socket.IO server, real clients, real rooms.
 *
 * The criterion this file exists for is *"a signed-in non-member receives ZERO
 * `project:P` frames, asserted on the wire, not by checking the UI is empty"* —
 * which a mocked emit cannot answer. Membership is the only thing stubbed, so
 * there is no database in the loop.
 *
 * Project 1 belongs to user 1. User 2 is signed in and is not a member.
 */

const PROJECT_ID = 1;
const SLUG = 'apexops';

let server: http.Server;
let io: SocketIOServer;
let port: number;

const connect = (auth: Record<string, unknown>): Promise<ClientSocket> =>
    new Promise((resolve, reject) => {
        const s = ioClient(`http://127.0.0.1:${port}`, {
            transports: ['websocket'],
            auth,
            forceNew: true,
        });
        s.on('connect', () => resolve(s));
        s.on('connect_error', reject);
    });

/** Resolves with the first frame of either name, or `null` after `ms`. */
function raceFrames(socket: ClientSocket, names: string[], ms: number): Promise<{ name: string; payload: unknown } | null> {
    return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(null), ms);
        names.forEach((name) =>
            socket.once(name, (payload: unknown) => {
                clearTimeout(timer);
                resolve({ name, payload });
            })
        );
    });
}

beforeAll(async () => {
    server = http.createServer();
    io = new SocketIOServer(server);

    io.on('connection', (socket) => {
        // Stands in for `socketUsers` — populated by the handshake auth middleware
        // in production, by the test's `auth.userId` here.
        const claimed = (socket.handshake.auth as { userId?: number }).userId;
        attachIssueStream(socket, {
            getUser: () => (typeof claimed === 'number' ? { id: claimed } : undefined),
            resolveMembership: async (slug, userId) =>
                slug === SLUG && userId === 1 ? { project: { id: PROJECT_ID } } : null,
        });
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = (server.address() as { port: number }).port;
});

afterAll(async () => {
    io.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('issues-join over a real socket', () => {
    it('admits a member and streams the project room to them', async () => {
        const member = await connect({ userId: 1 });
        member.emit('issues-join', { slug: SLUG });
        expect(await raceFrames(member, ['issues-joined', 'issues-error'], 1000)).toEqual({
            name: 'issues-joined',
            payload: { slug: SLUG },
        });

        const frame = raceFrames(member, ['issue-activity'], 1000);
        io.to(`project:${PROJECT_ID}`).emit('issue-activity', { issueId: 42 });
        expect(await frame).toEqual({ name: 'issue-activity', payload: { issueId: 42 } });

        member.disconnect();
    });

    // FAILURE CASE — the reason this file uses a real socket. Criterion 6.
    it('gives a signed-in NON-member zero frames for that project', async () => {
        const outsider = await connect({ userId: 2 });
        outsider.emit('issues-join', { slug: SLUG });
        expect(await raceFrames(outsider, ['issues-joined', 'issues-error'], 1000)).toEqual({
            name: 'issues-error',
            payload: { error: STREAM_ERR_REFUSED },
        });

        const leaked: unknown[] = [];
        outsider.on('issue-activity', (p: unknown) => leaked.push(p));
        for (let i = 0; i < 5; i += 1) io.to(`project:${PROJECT_ID}`).emit('issue-activity', { issueId: i });
        await new Promise((r) => setTimeout(r, 300));

        expect(leaked).toEqual([]);
        outsider.disconnect();
    });

    // Criterion 7 — the SDK connects without a token and must never subscribe.
    it("refuses the SDK's anonymous socket and leaks nothing to it", async () => {
        const anon = await connect({});
        anon.emit('issues-join', { slug: SLUG });
        expect(await raceFrames(anon, ['issues-joined', 'issues-error'], 1000)).toEqual({
            name: 'issues-error',
            payload: { error: STREAM_ERR_REFUSED },
        });

        const leaked: unknown[] = [];
        anon.on('issue-activity', (p: unknown) => leaked.push(p));
        io.to(`project:${PROJECT_ID}`).emit('issue-activity', { issueId: 1 });
        await new Promise((r) => setTimeout(r, 300));

        expect(leaked).toEqual([]);
        anon.disconnect();
    });

    it('fails closed when the membership lookup throws', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const thrower = http.createServer();
        const tio = new SocketIOServer(thrower);
        tio.on('connection', (socket) =>
            attachIssueStream(socket, {
                getUser: () => ({ id: 1 }),
                resolveMembership: async () => {
                    throw new Error('database is down');
                },
            })
        );
        await new Promise<void>((resolve) => thrower.listen(0, '127.0.0.1', resolve));
        const tport = (thrower.address() as { port: number }).port;

        const client = ioClient(`http://127.0.0.1:${tport}`, { transports: ['websocket'], forceNew: true });
        await new Promise((r) => client.on('connect', r));
        client.emit('issues-join', { slug: SLUG });
        expect(await raceFrames(client, ['issues-joined', 'issues-error'], 1000)).toEqual({
            name: 'issues-error',
            payload: { error: STREAM_ERR_REFUSED },
        });

        client.disconnect();
        tio.close();
        await new Promise<void>((resolve) => thrower.close(() => resolve()));
        vi.restoreAllMocks();
    });

    it('leaves the previous project room when switching projects', async () => {
        const io2Project = 2;
        const member = await connect({ userId: 1 });
        member.emit('issues-join', { slug: SLUG });
        await raceFrames(member, ['issues-joined'], 1000);

        // Same server, different project: the stub only knows project 1, so switch
        // by joining the room directly through the server and asserting the socket
        // left the old one.
        const sockets = await io.in(`project:${PROJECT_ID}`).fetchSockets();
        expect(sockets).toHaveLength(1);
        sockets[0].join(`project:${io2Project}`);

        member.emit('issues-join', { slug: SLUG });
        await raceFrames(member, ['issues-joined'], 1000);

        const stale = await io.in(`project:${io2Project}`).fetchSockets();
        expect(stale).toHaveLength(0);
        member.disconnect();
    });
});
