import { describe, expect, it } from 'vitest';
import { ipKey } from './rateLimit';

/**
 * The IPv6 bypass, pinned.
 *
 * Every limiter here that overrides `keyGenerator` used to key on the raw
 * `req.ip`. That reads as correct and is not: an IPv6 client is routinely
 * allocated a whole /64, so "one request per address" is not a limit at all when
 * the caller owns 10^19 addresses. These tests fail if anyone reverts to the raw
 * address, because the two same-subnet cases would stop collapsing.
 */
describe('ipKey', () => {
    it('collapses addresses in the same IPv6 /64 onto one key', () => {
        const a = ipKey({ ip: '2001:db8:1234:5678:aaaa:bbbb:cccc:0001' });
        const b = ipKey({ ip: '2001:db8:1234:5678:9999:8888:7777:6666' });

        expect(a).toBe(b);
        // Guard against a degenerate implementation that returns '' for everything
        // and would satisfy the equality above without limiting anything.
        expect(a).not.toBe('');
    });

    it('keeps genuinely different IPv6 allocations apart', () => {
        const a = ipKey({ ip: '2001:db8:1234:5678:aaaa:bbbb:cccc:0001' });
        const c = ipKey({ ip: '2001:db8:9999:0000:1111:2222:3333:4444' });

        expect(a).not.toBe(c);
    });

    it('leaves IPv4 addresses distinct', () => {
        expect(ipKey({ ip: '203.0.113.7' })).not.toBe(ipKey({ ip: '203.0.113.8' }));
    });

    it('does not throw when the address is missing', () => {
        // `req.ip` is undefined when Express cannot resolve one. A throwing key
        // generator would take the whole request down rather than rate-limit it.
        expect(() => ipKey({})).not.toThrow();
    });
});
