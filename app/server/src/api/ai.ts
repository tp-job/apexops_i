import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { aiChatLimiter } from '../middleware/rateLimit';
import { decrypt } from '../lib/crypto';

/**
 * AI chat proxy.
 *
 * ## What this route was, until 2026-08-04
 *
 * `POST /api/ai/chat` had **no authentication, no rate limit and no input cap**.
 * An anonymous request from anywhere on the internet reached Google and spent the
 * account's Gemini quota, 8192 output tokens at a time, attributed to nobody.
 * Verified live during Sprint 7 scoping: an unauthenticated POST came back with
 * *"API key not valid"* — an error **from Google**, meaning the request had
 * already left the building. The only thing standing between that and a bill was
 * a placeholder key on one developer's machine.
 *
 * ## Four controls, because each closes a different door (spec E-D1)
 *
 * | Control | Closes |
 * |---|---|
 * | `authenticate` | the internet |
 * | per-user quota | the signed-in loop, accidental or not |
 * | prompt + history caps | the single enormous request |
 * | `MAX_OUTPUT_TOKENS` | the cost of every call |
 *
 * Authentication alone would have looked like a fix and left the cost ceiling at
 * infinity. Ordering matters as much as presence: **every refusal here happens
 * before the outbound call**, because a cap that runs after the spend is not a
 * cost control, it is a log message.
 */
const router = express.Router();

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/** Read per request, not captured at import — see `apiKey()` below. */
const apiKey = (): string | undefined => process.env.GEMINI_API_KEY;

/**
 * Typed failure codes (spec F008).
 *
 * **Additive.** Every response below still carries the original `error` string it
 * always carried; `code` is new alongside it. Anything already reading `error`
 * keeps working, and the client gets something stable to branch on — an English
 * sentence is not an API contract, and matching on one breaks the first time
 * someone improves the wording.
 */
export type AiErrorCode =
    | 'NO_KEY'
    | 'INVALID_KEY'
    | 'RATE_LIMITED'
    | 'PROVIDER_ERROR'
    | 'EMPTY_RESPONSE'
    | 'INVALID_REQUEST';

const fail = (res: Response, status: number, code: AiErrorCode, error: string, extra?: Record<string, unknown>) =>
    res.status(status).json({ error, code, ...extra });

/**
 * Which key pays for this request (spec F007).
 *
 * Order: the caller's own stored key, then the org-wide environment key, then
 * nothing. BYOK is a *resolution order in front of* the existing behaviour, not
 * a replacement — an install with `GEMINI_API_KEY` set and no user keys behaves
 * exactly as it did before this sprint.
 *
 * **A decrypt failure is not an error here.** A row encrypted under a rotated
 * `AI_KEY_SECRET`, or a corrupted one, means "this user has no usable key" — so
 * it falls through to the environment key rather than 500-ing. The user lands on
 * "add your API key", which is both true and actionable. Only the user id is
 * logged; the failure itself says nothing worth printing.
 *
 * The decrypted value is returned, never cached. It lives for the duration of
 * one request and is never held in a module variable — a cache would keep a
 * revoked key working and would survive the row being deleted.
 */
async function resolveKey(userId: number): Promise<{ key: string; source: 'user' | 'env' } | null> {
    try {
        const row = await prisma.userAiKey.findUnique({
            where: { userId },
            select: { ciphertext: true, iv: true, authTag: true },
        });
        if (row) return { key: decrypt(row), source: 'user' };
    } catch (err) {
        console.warn(`[ai] stored key unusable for user ${userId} (${(err as Error).name}); falling back to env key`);
    }

    const env = apiKey();
    return env ? { key: env, source: 'env' } : null;
}

// Caps chosen to be generous for a chat box and ruinous for a scraper. Gemini
// 2.5 Flash accepts far more; the limit here is about spend, not capability.
const MAX_PROMPT_CHARS = 8_000;
const MAX_HISTORY_MESSAGES = 20;
const MAX_HISTORY_CHARS = 24_000;
const MAX_OUTPUT_TOKENS = 2_048;

interface HistoryMessage { role: string; text: string }

/** Narrow, cheap, and done before anything is sent anywhere. */
function validateChatBody(body: unknown): { prompt: string; history: HistoryMessage[] } | { error: string } {
    const { prompt, history = [] } = (body ?? {}) as { prompt?: unknown; history?: unknown };

    if (typeof prompt !== 'string' || !prompt.trim()) {
        return { error: 'Prompt is required and must be a non-empty string' };
    }
    if (prompt.length > MAX_PROMPT_CHARS) {
        return { error: `Prompt is too long (max ${MAX_PROMPT_CHARS} characters)` };
    }
    if (!Array.isArray(history)) {
        return { error: 'History must be an array' };
    }
    if (history.length > MAX_HISTORY_MESSAGES) {
        return { error: `History is too long (max ${MAX_HISTORY_MESSAGES} messages)` };
    }

    const clean: HistoryMessage[] = [];
    let total = 0;
    for (const entry of history) {
        const msg = entry as { role?: unknown; text?: unknown };
        // Junk in the history is refused rather than forwarded: this array is
        // copied straight into the provider payload, so "whatever was in there"
        // is an injection surface as well as a cost one.
        if (typeof msg?.text !== 'string' || typeof msg?.role !== 'string') {
            return { error: 'Each history entry needs a string role and a string text' };
        }
        total += msg.text.length;
        if (total > MAX_HISTORY_CHARS) {
            return { error: `History is too large (max ${MAX_HISTORY_CHARS} characters)` };
        }
        clean.push({ role: msg.role, text: msg.text });
    }

    return { prompt, history: clean };
}

// ── POST /chat ───────────────────────────────────────────────
router.post('/chat', authenticate, aiChatLimiter, async (req: Request, res: Response): Promise<void> => {
    try {
        // ── Every refusal below happens before the outbound call. ────────────
        // `validateChatBody` runs FIRST and `resolveKey` second, and that order
        // is load-bearing rather than stylistic: resolving a key is a database
        // read, so doing it ahead of the caps would spend work on a request we
        // are about to refuse — and, worse, would decrypt a credential for a
        // request that never had any business reaching the provider.
        const parsed = validateChatBody(req.body);
        if ('error' in parsed) {
            fail(res, 400, 'INVALID_REQUEST', parsed.error);
            return;
        }

        const resolved = await resolveKey(req.user!.id);
        if (!resolved) {
            // 503, not 500: the service is unavailable by configuration, and the
            // caller did nothing wrong. A 500 here sends people to look for a bug.
            //
            // `NO_KEY` is distinct from the other 503s on purpose — the client
            // turns this one into "Add your API key", which is a call to action,
            // not an error.
            fail(res, 503, 'NO_KEY', 'No AI key available. Add your own API key to start chatting.');
            return;
        }
        const key = resolved.key;

        const contents = parsed.history.map((msg) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }],
        }));
        contents.push({ role: 'user', parts: [{ text: parsed.prompt }] });

        // The key goes in a HEADER, not `?key=` in the URL.
        //
        // Google documents the query-parameter form, and this file used it. The
        // catch block below already warns that a fetch failure's `err.message`
        // can carry the request URL — which, in that form, carries the API key.
        // A header cannot leak into an error string, a redirect target, or a
        // proxy access log that records paths only. Same request, one fewer way
        // to lose the credential. (spec F007)
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
            body: JSON.stringify({
                contents,
                generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: MAX_OUTPUT_TOKENS },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                ],
            }),
        });

        if (!response.ok) {
            const errorData: any = await response.json().catch(() => ({}));

            // Gemini answers **400** for a rejected key, not 401/403 — measured,
            // not assumed. And a bad key and a malformed payload are otherwise
            // identical: both are HTTP 400 with `error.status:
            // 'INVALID_ARGUMENT'`. The only thing that separates them is
            // `error.details[].reason === 'API_KEY_INVALID'`.
            //
            // This mattered: routing on the status code alone reported a bad
            // stored key as "Invalid request to AI service", which is both wrong
            // and unactionable — the user cannot tell that the fix is to re-enter
            // their key.
            const keyRejected =
                response.status === 401 ||
                response.status === 403 ||
                (Array.isArray(errorData?.error?.details) &&
                    errorData.error.details.some((d: any) => d?.reason === 'API_KEY_INVALID'));

            if (keyRejected) {
                // The provider's message is logged but NOT echoed: "API key not
                // valid" once told an anonymous caller that a key existed and
                // that they had reached the provider.
                console.error('AI provider rejected credentials:', errorData.error?.message);
                // Who owns the bad credential decides what the user can do about
                // it. Their own key -> INVALID_KEY, and the panel can offer to
                // re-enter it. The org's env key -> they can do nothing, so it
                // stays a generic unavailability. Reporting the org's misconfig
                // as "your key is invalid" would send them to delete a key that
                // was never the problem.
                if (resolved.source === 'user') {
                    fail(res, 400, 'INVALID_KEY', 'Your API key was rejected by the provider. Please re-enter it.');
                } else {
                    fail(res, 503, 'PROVIDER_ERROR', 'AI service is unavailable');
                }
                return;
            }

            if (response.status === 400) {
                fail(res, 400, 'INVALID_REQUEST', 'Invalid request to AI service');
                return;
            }
            if (response.status === 429) {
                fail(res, 429, 'RATE_LIMITED', 'AI service is busy. Please try again later.');
                return;
            }
            console.error('AI provider error:', response.status, errorData.error?.message);
            fail(res, 502, 'PROVIDER_ERROR', 'AI service error');
            return;
        }

        const data: any = await response.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
            fail(res, 502, 'EMPTY_RESPONSE', 'AI returned an empty response', {
                finishReason: data.candidates?.[0]?.finishReason || 'unknown',
            });
            return;
        }

        res.json({
            text: responseText,
            model: GEMINI_MODEL,
            finishReason: data.candidates?.[0]?.finishReason || 'STOP',
            /** Which key paid for this. Never the key itself. */
            keySource: resolved.source,
        });
    } catch (err: any) {
        // `err.message` from a fetch failure can carry the request URL. That used
        // to carry the API key as a query parameter; the key now travels in a
        // header, so this is defence in depth rather than the only defence.
        // Still logged and never returned — the rule is cheaper than the audit.
        console.error('AI Chat Error:', err);
        fail(res, 502, 'PROVIDER_ERROR', 'Failed to process AI request');
    }
});

// ── GET /status ──────────────────────────────────────────────
/**
 * Authenticated on purpose. It is a small disclosure — whether a key is set — but
 * it is a disclosure about someone else's infrastructure, and there is no caller
 * for it who is not already signed in.
 *
 * The key is read here rather than at import so this cannot report "ready" for a
 * key the process no longer has. A status endpoint that can be confidently wrong
 * is worse than not having one.
 */
router.get('/status', authenticate, (_req: Request, res: Response) => {
    const isConfigured = !!apiKey();
    res.json({
        status: isConfigured ? 'ready' : 'not_configured',
        model: GEMINI_MODEL,
        limits: {
            maxPromptChars: MAX_PROMPT_CHARS,
            maxHistoryMessages: MAX_HISTORY_MESSAGES,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
        },
        message: isConfigured ? 'AI service is ready' : 'GEMINI_API_KEY is not set',
    });
});

export default router;
