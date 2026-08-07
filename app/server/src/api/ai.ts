import express, { Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { aiChatLimiter } from '../middleware/rateLimit';

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
        const parsed = validateChatBody(req.body);
        if ('error' in parsed) {
            res.status(400).json({ error: parsed.error });
            return;
        }

        const key = apiKey();
        if (!key) {
            // 503, not 500: the service is unavailable by configuration, and the
            // caller did nothing wrong. A 500 here sends people to look for a bug.
            res.status(503).json({ error: 'AI service is not configured. Please set GEMINI_API_KEY.' });
            return;
        }

        const contents = parsed.history.map((msg) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }],
        }));
        contents.push({ role: 'user', parts: [{ text: parsed.prompt }] });

        const response = await fetch(`${GEMINI_API_URL}?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
            // The provider's message is logged but NOT echoed for auth failures:
            // "API key not valid" told an anonymous caller that a key existed and
            // that they had reached the provider. Say nothing useful to them.
            if (response.status === 400) { res.status(400).json({ error: 'Invalid request to AI service' }); return; }
            if (response.status === 401 || response.status === 403) {
                console.error('AI provider rejected our credentials:', errorData.error?.message);
                res.status(503).json({ error: 'AI service is unavailable' });
                return;
            }
            if (response.status === 429) { res.status(429).json({ error: 'AI service is busy. Please try again later.' }); return; }
            console.error('AI provider error:', response.status, errorData.error?.message);
            res.status(502).json({ error: 'AI service error' });
            return;
        }

        const data: any = await response.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
            res.status(502).json({
                error: 'AI returned an empty response',
                finishReason: data.candidates?.[0]?.finishReason || 'unknown',
            });
            return;
        }

        res.json({ text: responseText, model: GEMINI_MODEL, finishReason: data.candidates?.[0]?.finishReason || 'STOP' });
    } catch (err: any) {
        // `err.message` from a fetch failure can carry the request URL, and the
        // request URL carries the API key as a query parameter. Log it, never
        // return it.
        console.error('AI Chat Error:', err);
        res.status(502).json({ error: 'Failed to process AI request' });
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
