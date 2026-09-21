import { describe, expect, it } from 'vitest';
import { checkApiUrl, discover, DiscoveryProblem } from './discovery';
import { parseProjectUrl, ProjectUrlProblem } from './projectUrl';

const code = (fn: () => unknown): string | undefined => {
    try {
        fn();
    } catch (e) {
        return (e as { code?: string }).code;
    }
    return undefined;
};
const codeAsync = async (p: Promise<unknown>): Promise<string | undefined> => {
    try {
        await p;
    } catch (e) {
        return (e as { code?: string }).code;
    }
    return undefined;
};

describe('parseProjectUrl', () => {
    it('takes the origin and slug from any project page and drops the rest', () => {
        for (const path of ['/p/checkout-web', '/p/checkout-web/', '/p/checkout-web/issues', '/p/checkout-web/issues/42?x=1#y']) {
            expect(parseProjectUrl(`http://localhost:5173${path}`)).toEqual({
                appOrigin: 'http://localhost:5173',
                slug: 'checkout-web',
            });
        }
        expect(parseProjectUrl('  https://ops.example.test/p/a1  ').slug).toBe('a1');
    });

    it('says what is wrong instead of guessing', () => {
        expect(code(() => parseProjectUrl(''))).toBe('empty');
        expect(code(() => parseProjectUrl('checkout-web'))).toBe('malformed');
        expect(code(() => parseProjectUrl('ftp://ops.test/p/x'))).toBe('scheme');
        expect(code(() => parseProjectUrl('javascript:alert(1)'))).toBe('scheme');
        expect(code(() => parseProjectUrl('http://localhost:5173/dashboard'))).toBe('no-project');
        expect(code(() => parseProjectUrl('http://localhost:5173/p/'))).toBe('no-project');
        expect(code(() => parseProjectUrl('http://localhost:5173/projects/x'))).toBe('no-project');
    });

    it('refuses a slug the server could never have made', () => {
        for (const bad of ['UPPER', 'has space', 'a_b', '-lead', 'trail-', 'a--b', '..', '%2e%2e', 'x%20y']) {
            expect(code(() => parseProjectUrl(`http://localhost:5173/p/${bad}`)), bad).toBe('no-project');
        }
    });

    it('refuses credentials in the URL: the host a person reads is not the host it connects to', () => {
        expect(code(() => parseProjectUrl('https://apexops.example.test@evil.test/p/x'))).toBe('credentials');
        expect(code(() => parseProjectUrl('https://user:pw@ops.test/p/x'))).toBe('credentials');
    });
});

describe('checkApiUrl (spec R19)', () => {
    it('accepts https, and http only on loopback', () => {
        expect(checkApiUrl('https://api.ops.example.test/').apiUrl).toBe('https://api.ops.example.test');
        expect(checkApiUrl('https://ops.example.test/api/').apiUrl).toBe('https://ops.example.test/api');
        expect(checkApiUrl('http://localhost:3013').apiOrigin).toBe('http://localhost:3013');
        expect(checkApiUrl('http://127.0.0.1:3000').apiOrigin).toBe('http://127.0.0.1:3000');
        expect(checkApiUrl('http://[::1]:3000').apiOrigin).toBe('http://[::1]:3000');
    });

    it('refuses plain http anywhere else, including hosts that merely look local', () => {
        for (const bad of ['http://ops.example.test', 'http://192.168.1.10:3000', 'http://localhost.evil.test', 'http://127.0.0.1.evil.test']) {
            expect(code(() => checkApiUrl(bad)), bad).toBe('insecure-api-url');
        }
    });

    it('refuses anything that is not a plain base URL', () => {
        for (const bad of ['', undefined, null, 42, 'not a url', 'https://u:p@ops.test', 'https://ops.test/?x=1', 'https://ops.test/#f', 'file:///etc/passwd', 'javascript:1']) {
            expect(['bad-api-url', 'insecure-api-url'], String(bad)).toContain(code(() => checkApiUrl(bad)));
        }
    });
});

describe('discover', () => {
    const respond = (body: unknown, ok = true): typeof fetch =>
        (async () => ({ ok, status: ok ? 200 : 404, json: async () => body })) as unknown as typeof fetch;

    it('returns the API for a valid app and project URL', async () => {
        const seen: { url: string; init?: RequestInit }[] = [];
        const f = (async (url: string, init?: RequestInit) => {
            seen.push({ url, init });
            return { ok: true, status: 200, json: async () => ({ app: 'apexops', v: 1, apiUrl: 'http://localhost:3013' }) };
        }) as unknown as typeof fetch;

        const d = await discover('http://localhost:5199/p/sprint2-demo/issues', f);
        expect(d).toEqual({
            appOrigin: 'http://localhost:5199',
            slug: 'sprint2-demo',
            apiUrl: 'http://localhost:3013',
            apiOrigin: 'http://localhost:3013',
        });
        // Read from the pasted origin only, with nothing ambient attached.
        expect(seen).toHaveLength(1);
        expect(seen[0]?.url).toBe('http://localhost:5199/apexops.json');
        expect(seen[0]?.init?.credentials).toBe('omit');
        expect(seen[0]?.init?.redirect).toBe('error');
    });

    it('distinguishes unreachable, not-ApexOps and unsafe', async () => {
        const url = 'http://localhost:5199/p/x';
        expect(await codeAsync(discover(url, respond({}, false)))).toBe('unreachable');
        expect(await codeAsync(discover(url, (async () => { throw new TypeError('Failed to fetch'); }) as typeof fetch))).toBe('unreachable');
        expect(await codeAsync(discover(url, respond({ app: 'other', v: 1, apiUrl: 'http://localhost:1' })))).toBe('not-apexops');
        expect(await codeAsync(discover(url, respond({ app: 'apexops', v: 2, apiUrl: 'http://localhost:1' })))).toBe('not-apexops');
        expect(await codeAsync(discover(url, respond(null)))).toBe('not-apexops');
        expect(await codeAsync(discover(url, respond({ app: 'apexops', v: 1, apiUrl: 'http://evil.test' })))).toBe('insecure-api-url');
        expect(await codeAsync(discover(url, respond({ app: 'apexops', v: 1 })))).toBe('bad-api-url');
    });

    it('a malformed pasted URL never reaches the network', async () => {
        let called = false;
        const f = (async () => { called = true; return { ok: true, json: async () => ({}) }; }) as unknown as typeof fetch;
        await expect(discover('nope', f)).rejects.toBeInstanceOf(ProjectUrlProblem);
        expect(called).toBe(false);
        await expect(discover('http://localhost:5199/p/x', respond({}, false))).rejects.toBeInstanceOf(DiscoveryProblem);
    });
});
