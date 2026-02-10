// api/ai.js - Gemini AI Chat API
const express = require('express');
const router = express.Router();

// Gemini API Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * POST /api/ai/chat
 * Send a message to Gemini AI and get a response
 * 
 * Body: {
 *   prompt: string,           // Current user message
 *   history: Array<{          // Optional conversation history
 *     role: 'user' | 'model',
 *     text: string
 *   }>
 * }
 */
router.post('/chat', async (req, res) => {
    try {
        const { prompt, history = [] } = req.body;

        if (!prompt || typeof prompt !== 'string') {
            return res.status(400).json({ 
                error: 'Prompt is required and must be a string' 
            });
        }

        if (!GEMINI_API_KEY) {
            console.error('❌ GEMINI_API_KEY is not set in environment variables');
            return res.status(500).json({ 
                error: 'AI service is not configured. Please set GEMINI_API_KEY.' 
            });
        }

        // Format conversation history for Gemini API
        const contents = history.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

        // Add current prompt
        contents.push({
            role: 'user',
            parts: [{ text: prompt }]
        });

        // Call Gemini API
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: contents,
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 8192,
                },
                safetySettings: [
                    {
                        category: 'HARM_CATEGORY_HARASSMENT',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                    },
                    {
                        category: 'HARM_CATEGORY_HATE_SPEECH',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                    },
                    {
                        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                    },
                    {
                        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ Gemini API Error:', response.status, errorData);
            
            if (response.status === 400) {
                return res.status(400).json({ 
                    error: 'Invalid request to AI service',
                    details: errorData.error?.message || 'Bad request'
                });
            }
            
            if (response.status === 403) {
                return res.status(403).json({ 
                    error: 'AI service access denied. Check your API key.'
                });
            }

            if (response.status === 429) {
                return res.status(429).json({ 
                    error: 'Rate limit exceeded. Please try again later.'
                });
            }

            return res.status(500).json({ 
                error: 'AI service error',
                details: errorData.error?.message || `HTTP ${response.status}`
            });
        }

        const data = await response.json();
        
        // Extract response text
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!responseText) {
            console.warn('⚠️ No response text from Gemini:', data);
            return res.status(500).json({ 
                error: 'AI returned empty response',
                finishReason: data.candidates?.[0]?.finishReason || 'unknown'
            });
        }

        // Return successful response
        res.json({
            text: responseText,
            model: GEMINI_MODEL,
            finishReason: data.candidates?.[0]?.finishReason || 'STOP'
        });

    } catch (err) {
        console.error('❌ AI Chat Error:', err);
        res.status(500).json({ 
            error: 'Failed to process AI request',
            details: err.message
        });
    }
});

/**
 * GET /api/ai/status
 * Check if AI service is configured and available
 */
router.get('/status', (req, res) => {
    const isConfigured = !!GEMINI_API_KEY;
    
    res.json({
        status: isConfigured ? 'ready' : 'not_configured',
        model: GEMINI_MODEL,
        message: isConfigured 
            ? 'AI service is ready' 
            : 'GEMINI_API_KEY is not set'
    });
});

module.exports = router;
