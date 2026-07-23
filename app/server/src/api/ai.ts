import express, { Request, Response } from 'express';

const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// ── POST /chat ───────────────────────────────────────────────
router.post('/chat', async (req: Request, res: Response): Promise<void> => {
    try {
        const { prompt, history = [] } = req.body;

        if (!prompt || typeof prompt !== 'string') {
            res.status(400).json({ error: 'Prompt is required and must be a string' });
            return;
        }

        if (!GEMINI_API_KEY) {
            res.status(500).json({ error: 'AI service is not configured. Please set GEMINI_API_KEY.' });
            return;
        }

        const contents = history.map((msg: { role: string; text: string }) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }],
        }));

        contents.push({ role: 'user', parts: [{ text: prompt }] });

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents,
                generationConfig: { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 8192 },
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
            if (response.status === 400) { res.status(400).json({ error: 'Invalid request to AI service', details: errorData.error?.message }); return; }
            if (response.status === 403) { res.status(403).json({ error: 'AI service access denied. Check your API key.' }); return; }
            if (response.status === 429) { res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' }); return; }
            res.status(500).json({ error: 'AI service error', details: errorData.error?.message || `HTTP ${response.status}` });
            return;
        }

        const data: any = await response.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
            res.status(500).json({ error: 'AI returned empty response', finishReason: data.candidates?.[0]?.finishReason || 'unknown' });
            return;
        }

        res.json({ text: responseText, model: GEMINI_MODEL, finishReason: data.candidates?.[0]?.finishReason || 'STOP' });
    } catch (err: any) {
        console.error('AI Chat Error:', err);
        res.status(500).json({ error: 'Failed to process AI request', details: err.message });
    }
});

// ── GET /status ──────────────────────────────────────────────
router.get('/status', (_req: Request, res: Response) => {
    const isConfigured = !!GEMINI_API_KEY;
    res.json({
        status: isConfigured ? 'ready' : 'not_configured',
        model: GEMINI_MODEL,
        message: isConfigured ? 'AI service is ready' : 'GEMINI_API_KEY is not set',
    });
});

export default router;
