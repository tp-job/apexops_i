import { lookup } from 'dns/promises';
import net from 'net';

/**
 * Outbound webhook delivery.
 *
 * **The URL is user-supplied and the server is what fetches it, so this is an
 * SSRF surface, not a networking convenience.** Without the checks below, a
 * project owner could point `webhookUrl` at `http://169.254.169.254/...` and use
 * our server as a proxy to read cloud instance metadata, or sweep internal
 * services on the host network that are not reachable from outside.
 *
 * Two layers, because either alone is bypassable:
 *  1. **Scheme + shape** — https only (http allowed for localhost dev is
 *     deliberately NOT granted; see below), no credentials in the URL.
 *  2. **Resolved address** — the hostname is resolved and every returned IP is
 *     checked against private/loopback/link-local ranges. Checking the hostname
 *     string alone is defeated by a DNS name that simply points at 127.0.0.1.
 *
 * Residual risk worth naming: this is resolve-then-fetch, so a DNS entry that
 * changes between the two (DNS rebinding) is not fully closed. Closing it needs
 * a custom agent that pins the validated IP. Acceptable for now because the
 * attacker must already be a project owner — but do not treat this as airtight
 * if webhooks ever become settable by lower-privileged roles.
 */

const BLOCKED_V4 = [
    { net: '0.0.0.0', bits: 8 },
    { net: '10.0.0.0', bits: 8 },
    { net: '100.64.0.0', bits: 10 },
    { net: '127.0.0.0', bits: 8 },
    { net: '169.254.0.0', bits: 16 }, // link-local: cloud instance metadata
    { net: '172.16.0.0', bits: 12 },
    { net: '192.0.0.0', bits: 24 },
    { net: '192.168.0.0', bits: 16 },
    { net: '198.18.0.0', bits: 15 },
    { net: '224.0.0.0', bits: 4 },
    { net: '240.0.0.0', bits: 4 },
];

const toInt = (ip: string): number =>
    ip.split('.').reduce((acc, oct) => (acc << 8) + Number(oct), 0) >>> 0;

function isBlockedV4(ip: string): boolean {
    const addr = toInt(ip);
    return BLOCKED_V4.some(({ net: base, bits }) => {
        const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
        return (addr & mask) === (toInt(base) & mask);
    });
}

function isBlockedV6(ip: string): boolean {
    const v = ip.toLowerCase();
    // ::1 loopback, fc00::/7 unique-local, fe80::/10 link-local, unspecified.
    if (v === '::' || v === '::1') return true;
    if (v.startsWith('fc') || v.startsWith('fd')) return true;
    if (v.startsWith('fe8') || v.startsWith('fe9') || v.startsWith('fea') || v.startsWith('feb')) return true;
    // IPv4-mapped (::ffff:127.0.0.1) — unwrap and re-check, or it bypasses the v4 list.
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isBlockedV4(mapped[1]);
    return false;
}

export interface WebhookValidation {
    ok: boolean;
    reason?: string;
}

/** Shape-only validation. Safe to run synchronously at config-save time. */
export function validateWebhookUrl(raw: string): WebhookValidation {
    let url: URL;
    try {
        url = new URL(raw);
    } catch {
        return { ok: false, reason: 'Not a valid URL' };
    }
    if (url.protocol !== 'https:') {
        return { ok: false, reason: 'Webhook must use https' };
    }
    if (url.username || url.password) {
        return { ok: false, reason: 'Credentials in the URL are not allowed' };
    }
    return { ok: true };
}

/** Full check including DNS resolution. Run immediately before sending. */
export async function isSafeWebhookTarget(raw: string): Promise<WebhookValidation> {
    const shape = validateWebhookUrl(raw);
    if (!shape.ok) return shape;

    const host = new URL(raw).hostname;

    // A literal IP never goes to DNS, so check it directly.
    if (net.isIP(host)) {
        const blocked = net.isIPv4(host) ? isBlockedV4(host) : isBlockedV6(host);
        return blocked ? { ok: false, reason: 'Target address is not routable externally' } : { ok: true };
    }

    try {
        const records = await lookup(host, { all: true });
        if (!records.length) return { ok: false, reason: 'Hostname did not resolve' };
        for (const r of records) {
            const blocked = r.family === 4 ? isBlockedV4(r.address) : isBlockedV6(r.address);
            if (blocked) return { ok: false, reason: 'Hostname resolves to a private address' };
        }
        return { ok: true };
    } catch {
        return { ok: false, reason: 'Hostname did not resolve' };
    }
}

export interface WebhookResult {
    delivered: boolean;
    status?: number;
    reason?: string;
}

/**
 * Send one webhook. **Never throws** — alerting must not be able to break the
 * ingest request that triggered it. A failed webhook is a logged failure, not a
 * 500 on someone else's error report.
 */
export async function sendWebhook(url: string, payload: unknown): Promise<WebhookResult> {
    const safe = await isSafeWebhookTarget(url);
    if (!safe.ok) return { delivered: false, reason: safe.reason };

    // Bounded: a webhook endpoint that hangs must not hold an ingest connection.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
            redirect: 'error', // A redirect could land somewhere the DNS check never saw.
        });
        return { delivered: res.ok, status: res.status };
    } catch (err: any) {
        return { delivered: false, reason: err?.name === 'AbortError' ? 'Timed out' : 'Request failed' };
    } finally {
        clearTimeout(timer);
    }
}
