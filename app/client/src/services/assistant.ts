import { fetchWithAuth } from '@/api/client';
import type {
    AssistantError,
    AssistantErrorCode,
    AssistantMessage,
    AssistantReply,
    StoredKeyInfo,
    WireRole,
} from '@/types/assistant';

/**
 * The only module that talks to `/api/ai/*` (spec F009).
 *
 * Everything goes through `fetchWithAuth`, so the refresh-and-retry on 401 is
 * **inherited rather than reimplemented**. `lib/authSession.ts` is the single
 * refresh coordinator in this app; a second one here would mean two callers
 * racing to spend the same refresh token.
 *
 * Components never import this directly — `hooks/useAssistant.ts` owns the
 * state and this owns the wire.
 */

const KNOWN_CODES: AssistantErrorCode[] = [
    'NO_KEY',
    'INVALID_KEY',
    'RATE_LIMITED',
    'PROVIDER_ERROR',
    'EMPTY_RESPONSE',
    'INVALID_REQUEST',
];

/**
 * Turn any failed response into exactly one `AssistantError`.
 *
 * An unrecognised `code` degrades to `UNKNOWN` rather than being passed through:
 * the UI switches on this union, and a string it has no branch for would fall
 * through every case and render nothing at all.
 */
async function toError(res: Response): Promise<AssistantError> {
    let body: any = {};
    try {
        body = await res.json();
    } catch {
        /* empty or non-JSON body — the status still tells us something */
    }

    const code: AssistantErrorCode = KNOWN_CODES.includes(body?.code) ? body.code : 'UNKNOWN';
    const retryAfterHeader = res.headers.get('ratelimit-reset') || res.headers.get('retry-after');

    return {
        code,
        message: typeof body?.error === 'string' ? body.error : `Request failed (${res.status})`,
        ...(retryAfterHeader ? { retryAfter: Number(retryAfterHeader) || undefined } : {}),
    };
}

/**
 * Thrown by every function here so callers have one `catch` shape.
 *
 * `detail` is declared and assigned explicitly rather than as a constructor
 * parameter property: this client builds with `erasableSyntaxOnly`, which bans
 * TypeScript-only syntax that has no JavaScript equivalent. `tsc --noEmit`
 * accepts the shorthand and `npm run build` rejects it — so the build, not the
 * typecheck, is the gate that matters here.
 */
export class AssistantRequestError extends Error {
    readonly detail: AssistantError;

    constructor(detail: AssistantError) {
        super(detail.message);
        this.name = 'AssistantRequestError';
        this.detail = detail;
    }
}

/** A network failure is not a server answer, and must not be reported as one. */
const networkError = (err: unknown): AssistantRequestError =>
    new AssistantRequestError({
        code: 'NETWORK',
        message: err instanceof Error && err.name === 'AbortError' ? 'Request cancelled' : 'Could not reach the server',
    });

/** UI `assistant` → wire `model`. The single place this translation happens. */
const toWireRole = (role: AssistantMessage['role']): WireRole => (role === 'assistant' ? 'model' : 'user');

/** Newest-first cap, mirroring the server's `MAX_HISTORY_MESSAGES`. */
export const MAX_HISTORY_MESSAGES = 20;
export const MAX_PROMPT_CHARS = 8_000;

/**
 * Send a prompt.
 *
 * History is trimmed to the newest 20 here, so the server's 400 is a **backstop
 * rather than the normal path** — a client that routinely relies on the server
 * to reject it is one deploy away from looking broken.
 */
export async function sendMessage(prompt: string, history: AssistantMessage[]): Promise<AssistantReply> {
    const trimmed = history.slice(-MAX_HISTORY_MESSAGES).map((m) => ({ role: toWireRole(m.role), text: m.text }));

    let res: Response;
    try {
        res = await fetchWithAuth('/api/ai/chat', {
            method: 'POST',
            json: true,
            body: JSON.stringify({ prompt, history: trimmed }),
        });
    } catch (err) {
        throw networkError(err);
    }

    if (!res.ok) throw new AssistantRequestError(await toError(res));

    const data: any = await res.json().catch(() => ({}));
    // Every field is treated as absent-able. A 200 with a body we did not expect
    // is a bug somewhere, but it must not throw inside a render.
    if (typeof data?.text !== 'string' || !data.text) {
        throw new AssistantRequestError({ code: 'EMPTY_RESPONSE', message: 'The assistant returned nothing' });
    }

    return {
        text: data.text,
        model: typeof data.model === 'string' ? data.model : 'unknown',
        finishReason: typeof data.finishReason === 'string' ? data.finishReason : 'STOP',
        keySource: data.keySource === 'user' ? 'user' : 'env',
    };
}

/** ISO string → Date, at the boundary. Never leak the string inward. */
const toDate = (v: unknown): Date | null => {
    if (typeof v !== 'string') return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
};

const toKeyInfo = (raw: any): StoredKeyInfo | null => {
    if (!raw || typeof raw.maskedKey !== 'string') return null;
    return {
        provider: 'gemini',
        maskedKey: raw.maskedKey,
        verifiedAt: toDate(raw.verifiedAt),
        updatedAt: toDate(raw.updatedAt) ?? new Date(),
    };
};

/** `null` means "no key stored", which is a normal state, not an error. */
export async function fetchStoredKey(): Promise<StoredKeyInfo | null> {
    let res: Response;
    try {
        res = await fetchWithAuth('/api/ai/key');
    } catch (err) {
        throw networkError(err);
    }
    if (!res.ok) throw new AssistantRequestError(await toError(res));
    const data: any = await res.json().catch(() => ({}));
    return toKeyInfo(data?.key);
}

export async function saveKey(apiKey: string): Promise<StoredKeyInfo> {
    let res: Response;
    try {
        res = await fetchWithAuth('/api/ai/key', {
            method: 'PUT',
            json: true,
            body: JSON.stringify({ provider: 'gemini', apiKey }),
        });
    } catch (err) {
        throw networkError(err);
    }
    if (!res.ok) throw new AssistantRequestError(await toError(res));

    const data: any = await res.json().catch(() => ({}));
    const info = toKeyInfo(data?.key);
    if (!info) throw new AssistantRequestError({ code: 'UNKNOWN', message: 'The key was saved but could not be read back' });
    return info;
}

export async function deleteKey(): Promise<void> {
    let res: Response;
    try {
        res = await fetchWithAuth('/api/ai/key', { method: 'DELETE' });
    } catch (err) {
        throw networkError(err);
    }
    if (!res.ok) throw new AssistantRequestError(await toError(res));
}
