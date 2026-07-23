/**
 * Shared error handling utilities.
 * Use unknown in catch and these helpers for type-safe error handling.
 */

export function isErrorLike(e: unknown): e is { message?: string } {
    return typeof e === 'object' && e !== null && 'message' in e;
}

export function getErrorMessage(e: unknown): string {
    if (isErrorLike(e) && typeof e.message === 'string') return e.message;
    if (e instanceof Error) return e.message;
    return 'Something went wrong';
}
