export type OfflineMode = 'online' | 'offline-mock';

export function isMockEnabled(): boolean {
    const flag = (import.meta.env.VITE_ENABLE_OFFLINE_MOCK as string | undefined)?.toLowerCase();
    if (flag === 'true') return true;
    if (flag === 'false') return false;
    return !!import.meta.env.DEV;
}

export function readOnlyOfflineMessage(): string {
    return 'Offline mock mode is read-only.';
}

export function createReadOnlyOfflineError(): Error {
    return new Error(readOnlyOfflineMessage());
}

function looksLikeAxiosNetworkError(err: unknown): boolean {
    if (typeof err !== 'object' || err === null) return false;
    const o = err as { code?: string; message?: string; response?: unknown };
    const code = typeof o.code === 'string' ? o.code : '';
    const msg = typeof o.message === 'string' ? o.message : '';
    const hasResponse = !!o.response;
    if (hasResponse) return false;
    if (code === 'ERR_NETWORK') return true;
    if (msg.toLowerCase() === 'network error') return true;
    return false;
}

export function isNetworkFailure(err: unknown): boolean {
    // fetch() network failures are usually TypeError: Failed to fetch
    if (err instanceof TypeError) return true;

    // best-effort axios detection without importing axios (avoid bundle duplication)
    if (looksLikeAxiosNetworkError(err)) return true;

    const msg = err instanceof Error ? err.message : (typeof (err as { message?: string })?.message === 'string' ? (err as { message: string }).message : '');
    if (msg.includes('Failed to fetch')) return true;
    if (msg.includes('NetworkError')) return true;
    if (msg.includes('ECONNREFUSED')) return true;

    return false;
}

