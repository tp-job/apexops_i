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

function looksLikeAxiosNetworkError(err: any): boolean {
    // Axios network errors typically have no response and may carry these fields.
    const code = typeof err?.code === 'string' ? err.code : '';
    const msg = typeof err?.message === 'string' ? err.message : '';
    const hasResponse = !!err?.response;
    if (hasResponse) return false;
    if (code === 'ERR_NETWORK') return true;
    if (msg.toLowerCase() === 'network error') return true;
    return false;
}

export function isNetworkFailure(err: unknown): boolean {
    // fetch() network failures are usually TypeError: Failed to fetch
    if (err instanceof TypeError) return true;

    // best-effort axios detection without importing axios (avoid bundle duplication)
    if (looksLikeAxiosNetworkError(err as any)) return true;

    const msg = typeof (err as any)?.message === 'string' ? (err as any).message : '';
    if (msg.includes('Failed to fetch')) return true;
    if (msg.includes('NetworkError')) return true;
    if (msg.includes('ECONNREFUSED')) return true;

    return false;
}

