/**
 * AI assistant types (spec F009).
 *
 * Note the two vocabularies deliberately kept apart: **`AssistantRole`** is what
 * the UI speaks (`assistant`), and **the wire** speaks Gemini's dialect
 * (`model`). They are mapped in `services/assistant.ts` and nowhere else, so no
 * component ever has to know the provider's word for it.
 */

/** What the UI renders. `assistant`, never `model`. */
export type AssistantRole = 'user' | 'assistant';

/** What the API expects in `history[]`. Gemini's word is `model`. */
export type WireRole = 'user' | 'model';

export interface AssistantMessage {
    /** Client-generated; the server stores nothing (D5). */
    id: string;
    role: AssistantRole;
    text: string;
    at: Date;
}

/**
 * The server's typed failure codes, mirrored.
 *
 * Kept as a union rather than free strings so a `switch` over it is exhaustive
 * and adding a server code produces a compile error at every branch that has to
 * handle it. `UNKNOWN` and `NETWORK` are client-only: the first covers a server
 * that answered something new, the second covers never having reached it.
 */
export type AssistantErrorCode =
    | 'NO_KEY'
    | 'INVALID_KEY'
    | 'RATE_LIMITED'
    | 'PROVIDER_ERROR'
    | 'EMPTY_RESPONSE'
    | 'INVALID_REQUEST'
    | 'NETWORK'
    | 'UNKNOWN';

export interface AssistantError {
    code: AssistantErrorCode;
    /** Safe to show. The server never puts provider text or key material here. */
    message: string;
    /** Seconds until the limit resets, when the server told us (RATE_LIMITED). */
    retryAfter?: number;
}

export interface AssistantReply {
    text: string;
    model: string;
    finishReason: string;
    /** Whose key paid for it. Never the key. */
    keySource: 'user' | 'env';
}

export type AiProvider = 'gemini';

/** The only shape of a stored key the client ever sees. */
export interface StoredKeyInfo {
    provider: AiProvider;
    /** e.g. `AIza…4f2c`. Never the key. */
    maskedKey: string;
    /**
     * Parsed to a `Date` at the service boundary. JSON hands over an ISO
     * *string*, and typing that as `Date` is the mismatch that survives review
     * and fails at the first `.getTime()`.
     */
    verifiedAt: Date | null;
    updatedAt: Date;
}
