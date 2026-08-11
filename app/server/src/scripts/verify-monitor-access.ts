import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { io, type Socket } from 'socket.io-client';
import prisma from '../lib/prisma';

/**
 * Wire-level verification for the `monitors` room gate (F007, decision S9-D5).
 *
 * **Why this is a script and not a test.** `vitest.config.ts` states the server
 * suite's constraint out loud: no database, no server, every test a pure function.
 * That constraint is worth keeping — it holds CI under a minute and means a red run
 * points at logic rather than at infrastructure. But build-spec criterion 15 asks
 * for something a pure function cannot give:
 *
 *   > A signed-in **non-admin** socket emitting `register {clientType:'monitor'}`
 *   > is refused and receives **zero** `console-logs` frames. Asserted on the wire,
 *   > not by checking the UI is empty.
 *
 * An empty UI proves nothing — it is equally consistent with "correctly denied"
 * and with "the panel failed to render". The only honest assertion is on the
 * socket itself, with a real server, a real database and a real token. So the
 * policy is unit-tested exhaustively in `lib/monitorAccess.test.ts`, and its
 * *wiring* is verified here, against a live process.
 *
 * Run it:
 *   PORT=3199 WS_PORT=8199 npx ts-node -T src/server.ts      # in one shell
 *   WS_URL=http://localhost:8199 npm run verify:monitor      # in another
 *
 * Requires at least one active admin and one active non-admin in the database.
 * Exits non-zero on any failure, so CI can adopt it the day a service container
 * earns its place.
 */

const WS_URL = process.env.WS_URL || 'http://localhost:8199';
const SENTINEL = `WIRE_CHECK_${Date.now()}`;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const results: { name: string; pass: boolean; detail: string }[] = [];
const check = (name: string, pass: boolean, detail: string) => results.push({ name, pass, detail });

interface RelayedLog {
    message?: string;
}

async function main() {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not set');

    const admin = await prisma.user.findFirst({ where: { role: 'admin', isActive: true } });
    const plain = await prisma.user.findFirst({ where: { NOT: { role: 'admin' }, isActive: true } });
    if (!admin || !plain) {
        throw new Error(`needs an active admin AND an active non-admin; admin=${!!admin} non-admin=${!!plain}`);
    }

    const sign = (u: { id: number; email: string }) =>
        jwt.sign({ id: u.id, email: u.email }, secret, { algorithm: 'HS256', expiresIn: '10m' });

    console.log(`admin=#${admin.id} (${admin.role})   non-admin=#${plain.id} (${plain.role})`);
    console.log(`ws=${WS_URL}\n`);

    const adminSock: Socket = io(WS_URL, { transports: ['websocket'], auth: { token: sign(admin) } });
    const plainSock: Socket = io(WS_URL, { transports: ['websocket'], auth: { token: sign(plain) } });
    // Deliberately no token at all — this is the SDK's path and it must survive.
    const sdkSock: Socket = io(WS_URL, { transports: ['websocket'] });

    const adminLogs: RelayedLog[] = [];
    const plainLogs: RelayedLog[] = [];
    const adminErrs: string[] = [];
    const plainErrs: string[] = [];
    let adminAdmitted = false;
    let plainAdmitted = false;

    adminSock.on('console-logs', (l: RelayedLog[]) => adminLogs.push(...l));
    plainSock.on('console-logs', (l: RelayedLog[]) => plainLogs.push(...l));
    adminSock.on('monitor-error', (e: { error: string }) => adminErrs.push(e.error));
    plainSock.on('monitor-error', (e: { error: string }) => plainErrs.push(e.error));
    // `target-apps-list` is only ever sent to a socket that was admitted, so it is
    // the admission signal — there is no separate "you are in" event.
    adminSock.on('target-apps-list', () => { adminAdmitted = true; });
    plainSock.on('target-apps-list', () => { plainAdmitted = true; });

    await Promise.all([
        new Promise<void>((r) => adminSock.on('connect', () => r())),
        new Promise<void>((r) => plainSock.on('connect', () => r())),
        new Promise<void>((r) => sdkSock.on('connect', () => r())),
    ]);

    adminSock.emit('register', { clientType: 'monitor' });
    plainSock.emit('register', { clientType: 'monitor' });
    await wait(1500);

    check(
        'an active admin is admitted to monitors',
        adminAdmitted && adminErrs.length === 0,
        `admitted=${adminAdmitted} errors=${JSON.stringify(adminErrs)}`,
    );
    check(
        'a signed-in NON-ADMIN is refused',
        !plainAdmitted && plainErrs.length === 1,
        `admitted=${plainAdmitted} errors=${JSON.stringify(plainErrs)}`,
    );

    sdkSock.emit('register', {
        clientType: 'target-app',
        appName: 'verify-monitor-access',
        url: 'http://example.test',
    });
    await wait(800);

    sdkSock.emit('console-logs', {
        logs: [{
            id: 'wire-1',
            timestamp: new Date().toISOString(),
            level: 'error',
            message: SENTINEL,
            source: 'verify-monitor-access',
        }],
    });
    await wait(1500);

    check(
        'the anonymous target-app path still registers and RELAYS (criterion 16)',
        adminLogs.some((l) => l.message === SENTINEL),
        `admin received ${adminLogs.length} log(s)`,
    );
    check(
        'the NON-ADMIN received ZERO console-logs frames (criterion 15)',
        plainLogs.length === 0,
        `non-admin received ${plainLogs.length} log(s)`,
    );

    const persisted = await prisma.log.count({ where: { message: SENTINEL } });
    check(
        'the relayed log was NOT persisted (criterion 18, S9-D6)',
        persisted === 0,
        `rows in logs matching sentinel = ${persisted}`,
    );

    console.log('');
    for (const r of results) console.log(`  ${r.pass ? 'PASS' : 'FAIL'}  ${r.name}\n        ${r.detail}`);
    const failed = results.filter((r) => !r.pass).length;
    console.log(`\n${results.length - failed}/${results.length} passed`);

    [adminSock, plainSock, sdkSock].forEach((s) => s.close());
    await prisma.$disconnect();
    process.exit(failed ? 1 : 0);
}

main().catch(async (e: Error) => {
    console.error('ERROR:', e.message);
    await prisma.$disconnect();
    process.exit(1);
});
