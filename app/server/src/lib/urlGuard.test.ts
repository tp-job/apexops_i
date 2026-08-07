import { describe, expect, it } from 'vitest';
import { assertFetchableUrl } from './urlGuard';

/**
 * SSRF guard for `POST /api/console-logs`.
 *
 * This is the control standing between a URL a caller supplies and a headless
 * browser the *server* runs. The cases below are not hypothetical shapes — each
 * is a specific thing an attacker reaches for, and the metadata address is the
 * one that hands out cloud credentials.
 *
 * Only literal-address cases are asserted here; the DNS paths need real
 * resolution and belong in an integration test rather than a unit suite that
 * must not touch the network.
 */

describe('assertFetchableUrl', () => {
    it('rejects loopback in every spelling', async () => {
        expect((await assertFetchableUrl('http://127.0.0.1:5432')).ok).toBe(false);
        expect((await assertFetchableUrl('http://127.1.2.3/')).ok).toBe(false);
        expect((await assertFetchableUrl('http://[::1]:8080/')).ok).toBe(false);
        // IPv4-mapped IPv6 — the spelling that slips past a check which only
        // knows about IPv6 shapes.
        expect((await assertFetchableUrl('http://[::ffff:127.0.0.1]/')).ok).toBe(false);
    });

    it('rejects the cloud metadata address', async () => {
        // On most providers this returns instance credentials to anything asking
        // from inside the instance. It is the single highest-value SSRF target.
        expect((await assertFetchableUrl('http://169.254.169.254/latest/meta-data/')).ok).toBe(false);
    });

    it('rejects private ranges', async () => {
        expect((await assertFetchableUrl('http://10.0.0.5/')).ok).toBe(false);
        expect((await assertFetchableUrl('http://172.16.0.1/')).ok).toBe(false);
        expect((await assertFetchableUrl('http://192.168.1.1/admin')).ok).toBe(false);
        expect((await assertFetchableUrl('http://[fd00::1]/')).ok).toBe(false);
    });

    it('rejects non-http protocols', async () => {
        // Each of these is its own way of reading something the caller should not.
        expect((await assertFetchableUrl('file:///etc/passwd')).ok).toBe(false);
        expect((await assertFetchableUrl('ftp://a.test/x')).ok).toBe(false);
        expect((await assertFetchableUrl('gopher://a.test/x')).ok).toBe(false);
    });

    it('rejects malformed input rather than passing it through', async () => {
        expect((await assertFetchableUrl('not a url')).ok).toBe(false);
        expect((await assertFetchableUrl('')).ok).toBe(false);
    });

    it('allows an ordinary public address', async () => {
        expect((await assertFetchableUrl('http://93.184.216.34/')).ok).toBe(true);
        expect((await assertFetchableUrl('https://8.8.8.8/')).ok).toBe(true);
    });

    it('never names the internal address it refused', async () => {
        // "Blocked: resolves to 10.0.4.17" is a working internal port scanner,
        // one request at a time.
        const result = await assertFetchableUrl('http://10.0.4.17/');
        expect(result.reason).not.toContain('10.0.4.17');
    });
});
