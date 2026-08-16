import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AssistantMessage } from '@/types/assistant';

/**
 * The assistant wire layer, verified with no UI mounted (spec F009).
 *
 * Proving this here rather than through the finished panel is deliberate: a data
 * layer only exercised via components has been tested twice and understood once,
 * and the failure that matters — a code the UI has no branch for — is invisible
 * from the outside.
 *
 * `fetchWithAuth` is mocked rather than reimplemented. What is asserted is that
 * this module *goes through* it, because that is what inherits the single
 * refresh-and-retry coordinator in `lib/authSession.ts`.
 */

const fetchWithAuth = vi.fn();
vi.mock('@/api/client', () => ({ fetchWithAuth: (...args: unknown[]) => fetchWithAuth(...args) }));

const { sendMessage, fetchStoredKey, saveKey, AssistantRequestError, MAX_HISTORY_MESSAGES } = await import(
    '@/services/assistant'
);

const ok = (body: unknown, headers: Record<string, string> = {}) =>
    ({ ok: true, status: 200, json: async () => body, headers: new Headers(headers) }) as unknown as Response;

const bad = (status: number, body: unknown, headers: Record<string, string> = {}) =>
    ({ ok: false, status, json: async () => body, headers: new Headers(headers) }) as unknown as Response;

const msg = (role: AssistantMessage['role'], text: string): AssistantMessage => ({
    id: text,
    role,
    text,
    at: new Date(),
});

afterEach(() => fetchWithAuth.mockReset());

describe('transport', () => {
    it('goes through fetchWithAuth, inheriting the 401 refresh', async () => {
        fetchWithAuth.mockResolvedValue(ok({ text: 'hi', model: 'm', finishReason: 'STOP', keySource: 'user' }));
        await sendMessage('hello', []);
        expect(fetchWithAuth).toHaveBeenCalledTimes(1);
        expect(fetchWithAuth.mock.calls[0][0]).toBe('/api/ai/chat');
    });
});

describe('role mapping', () => {
    it('sends assistant turns as the wire role "model"', async () => {
        fetchWithAuth.mockResolvedValue(ok({ text: 'ok', model: 'm', finishReason: 'STOP', keySource: 'env' }));
        await sendMessage('next', [msg('user', 'a'), msg('assistant', 'b')]);

        const sent = JSON.parse(fetchWithAuth.mock.calls[0][1].body);
        // Gemini's word is `model`. If this ever sends `assistant`, the provider
        // silently treats the turn as a user turn and the conversation drifts.
        expect(sent.history).toEqual([
            { role: 'user', text: 'a' },
            { role: 'model', text: 'b' },
        ]);
        expect(sent.prompt).toBe('next');
    });
});

describe('history trimming', () => {
    it('sends only the newest 20 messages, so the server 400 is a backstop', async () => {
        fetchWithAuth.mockResolvedValue(ok({ text: 'ok', model: 'm', finishReason: 'STOP', keySource: 'env' }));
        const history = Array.from({ length: 35 }, (_, i) => msg('user', `m${i}`));
        await sendMessage('p', history);

        const sent = JSON.parse(fetchWithAuth.mock.calls[0][1].body);
        expect(sent.history).toHaveLength(MAX_HISTORY_MESSAGES);
        expect(sent.history[0].text).toBe('m15'); // newest 20 of 35
        expect(sent.history[19].text).toBe('m34');
    });
});

describe('error codes (FAILURE CASES)', () => {
    const cases: Array<[number, string]> = [
        [503, 'NO_KEY'],
        [400, 'INVALID_KEY'],
        [429, 'RATE_LIMITED'],
        [502, 'PROVIDER_ERROR'],
        [502, 'EMPTY_RESPONSE'],
        [400, 'INVALID_REQUEST'],
    ];

    it.each(cases)('maps HTTP %i / %s to a distinct discriminated error', async (status, code) => {
        fetchWithAuth.mockResolvedValue(bad(status, { error: 'nope', code }));
        await expect(sendMessage('p', [])).rejects.toBeInstanceOf(AssistantRequestError);

        fetchWithAuth.mockResolvedValue(bad(status, { error: 'nope', code }));
        await expect(sendMessage('p', [])).rejects.toMatchObject({ detail: { code: code } });
    });

    it('degrades an unrecognised code to UNKNOWN rather than passing it through', async () => {
        // A code the UI has no branch for would fall through every case and
        // render nothing — worse than an explicit unknown.
        fetchWithAuth.mockResolvedValue(bad(500, { error: 'x', code: 'SOMETHING_NEW' }));
        await expect(sendMessage('p', [])).rejects.toMatchObject({ detail: { code: 'UNKNOWN' } });
    });

    it('reports a thrown fetch as NETWORK, never as a server verdict', async () => {
        fetchWithAuth.mockRejectedValue(new TypeError('fetch failed'));
        await expect(sendMessage('p', [])).rejects.toMatchObject({ detail: { code: 'NETWORK' } });
    });

    it('carries retryAfter from the RateLimit-Reset header', async () => {
        fetchWithAuth.mockResolvedValue(bad(429, { error: 'slow down', code: 'RATE_LIMITED' }, { 'ratelimit-reset': '3600' }));
        await expect(sendMessage('p', [])).rejects.toMatchObject({ detail: { retryAfter: 3600 } });
    });

    it('survives a non-JSON error body', async () => {
        fetchWithAuth.mockResolvedValue({
            ok: false, status: 502, headers: new Headers(),
            json: async () => { throw new SyntaxError('not json'); },
        } as unknown as Response);
        await expect(sendMessage('p', [])).rejects.toMatchObject({ detail: { code: 'UNKNOWN' } });
    });
});

describe('malformed success bodies do not throw raw', () => {
    it('treats a 200 with no text as EMPTY_RESPONSE', async () => {
        fetchWithAuth.mockResolvedValue(ok({ model: 'm' }));
        await expect(sendMessage('p', [])).rejects.toMatchObject({ detail: { code: 'EMPTY_RESPONSE' } });
    });

    it('fills in missing model / finishReason rather than returning undefined', async () => {
        fetchWithAuth.mockResolvedValue(ok({ text: 'hi' }));
        const reply = await sendMessage('p', []);
        expect(reply).toEqual({ text: 'hi', model: 'unknown', finishReason: 'STOP', keySource: 'env' });
    });
});

describe('key info parsing', () => {
    it('parses verifiedAt from an ISO string into a Date', async () => {
        const iso = '2026-08-15T10:00:00.000Z';
        fetchWithAuth.mockResolvedValue(ok({ key: { maskedKey: 'AIza…4f2c', verifiedAt: iso, updatedAt: iso } }));
        const info = await fetchStoredKey();
        // JSON hands over a string; typing that as Date is the mismatch that
        // survives review and fails at the first .getTime().
        expect(info!.verifiedAt).toBeInstanceOf(Date);
        expect(info!.verifiedAt!.toISOString()).toBe(iso);
        expect(info!.updatedAt).toBeInstanceOf(Date);
    });

    it('returns null for no stored key, which is a normal state', async () => {
        fetchWithAuth.mockResolvedValue(ok({ key: null }));
        expect(await fetchStoredKey()).toBeNull();
    });

    it('tolerates a null verifiedAt', async () => {
        fetchWithAuth.mockResolvedValue(ok({ key: { maskedKey: 'AIza…4f2c', verifiedAt: null, updatedAt: null } }));
        const info = await fetchStoredKey();
        expect(info!.verifiedAt).toBeNull();
        expect(info!.updatedAt).toBeInstanceOf(Date);
    });

    it('never sends the key anywhere but the PUT body, and reads back only a mask', async () => {
        fetchWithAuth.mockResolvedValue(ok({ key: { maskedKey: 'AIza…4f2c', verifiedAt: null, updatedAt: null } }));
        const info = await saveKey('AIzaSyPLAINTEXTKEY0123456789');
        const [url, opts] = fetchWithAuth.mock.calls[0];
        expect(url).toBe('/api/ai/key');
        expect(opts.method).toBe('PUT');
        expect(JSON.stringify(info)).not.toContain('AIzaSyPLAINTEXTKEY0123456789');
    });
});
