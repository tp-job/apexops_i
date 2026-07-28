/**
 * Shared error handling utilities.
 * Use unknown in catch and these helpers for type-safe error handling.
 */

export function isErrorLike(e: unknown): e is { message?: string } {
    return typeof e === 'object' && e !== null && 'message' in e;
}

/**
 * `fallback` names what failed when the error carries nothing useful — "Failed to
 * load projects" beats a bare "Something went wrong" the user cannot act on.
 * Optional so existing callers are unaffected.
 *
 * `ApiError` (see `services/projects.ts`) already carries the server's message on
 * `.message`, so it is handled by the first branch and needs no special case
 * here — which is what keeps this module free of a dependency on the API layer.
 */
export function getErrorMessage(e: unknown, fallback = 'Something went wrong'): string {
    if (isErrorLike(e) && typeof e.message === 'string' && e.message) return e.message;
    if (e instanceof Error && e.message) return e.message;
    return fallback;
}
