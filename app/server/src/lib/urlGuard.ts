import { lookup } from 'node:dns/promises';
import net from 'node:net';

/**
 * Guard for URLs the **server** is about to fetch on a caller's behalf.
 *
 * `POST /api/console-logs` takes a URL from a request and drives a headless
 * browser to it. That is server-side request forgery by construction: without a
 * check, a caller picks any address the *server* can reach, including ones they
 * cannot — `http://localhost:5432`, an internal admin panel, or the cloud
 * metadata service at `169.254.169.254`, which on most providers hands out
 * credentials to anyone who asks from inside the instance.
 *
 * ## Why this resolves DNS instead of pattern-matching the hostname
 *
 * Blocking the string "localhost" stops nothing. `127.0.0.1.nip.io` resolves to
 * loopback. So does an attacker's own domain with an A record pointing there. The
 * only check that means anything is on the **resolved address**, which is why
 * this is async and why it returns every address rather than the first: a name
 * with one public and one private address must be refused, not sampled.
 *
 * ## What this deliberately does not solve
 *
 * DNS rebinding — the name resolving to a public address here and a private one
 * when the browser fetches it moments later. Closing that needs the fetch pinned
 * to the address checked, which is not something Puppeteer's `page.goto` exposes.
 * Named rather than implied: this raises the cost of an attack a great deal and
 * does not reduce it to zero, which is why the route is *also* admin-gated and
 * rate-limited rather than relying on this alone.
 */

export interface UrlGuardResult {
    ok: boolean;
    /** Safe to show a caller — never leaks which internal host was resolved. */
    reason?: string;
}

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Ranges that must never be reachable through a user-supplied URL.
 *
 * `net.BlockList` is used rather than hand-rolled arithmetic because getting a
 * CIDR comparison subtly wrong is how a guard passes review and fails in
 * production.
 */
function buildBlockList(): net.BlockList {
    const list = new net.BlockList();

    // IPv4
    list.addSubnet('0.0.0.0', 8, 'ipv4');          // "this network"
    list.addSubnet('10.0.0.0', 8, 'ipv4');         // private
    list.addSubnet('100.64.0.0', 10, 'ipv4');      // carrier-grade NAT
    list.addSubnet('127.0.0.0', 8, 'ipv4');        // loopback
    list.addSubnet('169.254.0.0', 16, 'ipv4');     // link-local — cloud metadata lives here
    list.addSubnet('172.16.0.0', 12, 'ipv4');      // private
    list.addSubnet('192.0.0.0', 24, 'ipv4');       // IETF protocol assignments
    list.addSubnet('192.168.0.0', 16, 'ipv4');     // private
    list.addSubnet('198.18.0.0', 15, 'ipv4');      // benchmarking
    list.addSubnet('224.0.0.0', 4, 'ipv4');        // multicast
    list.addSubnet('240.0.0.0', 4, 'ipv4');        // reserved

    // IPv6
    list.addAddress('::1', 'ipv6');                // loopback
    list.addAddress('::', 'ipv6');                 // unspecified
    list.addSubnet('fc00::', 7, 'ipv6');           // unique local
    list.addSubnet('fe80::', 10, 'ipv6');          // link-local
    list.addSubnet('ff00::', 8, 'ipv6');           // multicast

    // NOT `addSubnet('::ffff:0:0', 96, 'ipv6')`. That looks like the right way to
    // cover IPv4-mapped addresses and is a trap: Node normalises an IPv4 argument
    // into the mapped range before comparing, so that one rule makes `check(any
    // IPv4, 'ipv4')` return true — the guard blocks the entire public internet
    // while reading as correct. Caught by `urlGuard.test.ts` on its first run.
    // IPv4-mapped addresses are unwrapped explicitly in `isBlockedAddress` instead.

    return list;
}

const BLOCKED = buildBlockList();

function isBlockedAddress(address: string, family: number): boolean {
    const type = family === 6 ? 'ipv6' : 'ipv4';
    if (BLOCKED.check(address, type)) return true;
    // An IPv4-mapped IPv6 address (::ffff:127.0.0.1) has to be checked as the
    // IPv4 address it actually is, or the loopback rule never fires.
    if (type === 'ipv6' && address.startsWith('::ffff:')) {
        const v4 = address.slice(7);
        if (net.isIPv4(v4)) return BLOCKED.check(v4, 'ipv4');
    }
    return false;
}

/**
 * True when the server may fetch this URL for a caller.
 *
 * Refusal reasons are deliberately vague. "Blocked: resolves to 10.0.4.17" is a
 * working internal port scanner, one query at a time.
 */
export async function assertFetchableUrl(raw: string): Promise<UrlGuardResult> {
    let url: URL;
    try {
        url = new URL(raw);
    } catch {
        return { ok: false, reason: 'Invalid URL format' };
    }

    if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
        // file:, gopher:, ftp: — each is its own way of reading something the
        // caller should not be able to read.
        return { ok: false, reason: 'Only http and https URLs are supported' };
    }

    const host = url.hostname.replace(/^\[|\]$/g, '');

    // A literal address needs no DNS, and must not get a free pass because of it.
    if (net.isIP(host)) {
        return isBlockedAddress(host, net.isIPv6(host) ? 6 : 4)
            ? { ok: false, reason: 'That address is not reachable from here' }
            : { ok: true };
    }

    let addresses: Array<{ address: string; family: number }>;
    try {
        addresses = await lookup(host, { all: true });
    } catch {
        return { ok: false, reason: 'Could not resolve that hostname' };
    }

    if (!addresses.length) return { ok: false, reason: 'Could not resolve that hostname' };

    // EVERY resolved address must pass. A name answering with one public and one
    // private address is a deliberate attack shape, not a misconfiguration.
    for (const { address, family } of addresses) {
        if (isBlockedAddress(address, family)) {
            return { ok: false, reason: 'That address is not reachable from here' };
        }
    }

    return { ok: true };
}
