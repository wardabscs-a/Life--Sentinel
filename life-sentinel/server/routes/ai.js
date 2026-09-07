// Routes: POST /api/ai/chat — proxy AI chat requests to the configured provider
//
// SECURITY MODEL:
//   - The AI API key lives ONLY in server-side env (AI_API_KEY). It is never
//     sent to the frontend.
//   - Requests must carry a valid Firebase ID token (authenticate middleware).
//   - The endpoint validates category, message, history, and language before
//     forwarding to the AI provider.
//
// ERROR BEHAVIOUR:
//   - AI_NOT_CONFIGURED (200): server has no AI_API_KEY. Frontend may fall
//     back to local mock guidance.
//   - AI_PROVIDER_ERROR (502): AI is configured but the upstream call failed.
//     Frontend must NOT silently substitute mock guidance.
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/firebaseAuth');
const { body } = require('express-validator');
const { handleValidation } = require('../middleware/validation');

// Valid emergency categories (must match frontend CATEGORY_KEYWORDS keys)
const VALID_CATEGORIES = ['accident', 'fire', 'flood', 'earthquake', 'medical', 'crime', 'other'];
const VALID_LANGUAGES = ['en', 'ur'];

// ─── Validation chain ──────────────────────────────────────────────────────
const aiChatValidators = [
  body('category')
    .isString()
    .isIn(VALID_CATEGORIES)
    .withMessage(`category must be one of: ${VALID_CATEGORIES.join(', ')}`),
  body('message')
    .isString()
    .notEmpty()
    .withMessage('message is required')
    .isLength({ max: 2000 })
    .withMessage('message must be 2000 characters or fewer'),
  body('history')
    .optional({ nullable: true })
    .isArray()
    .withMessage('history must be an array'),
  body('history.*.role')
    .optional()
    .isIn(['user', 'assistant', 'system'])
    .withMessage('history role must be user, assistant, or system'),
  body('history.*.content')
    .optional()
    .isString()
    .withMessage('history content must be a string'),
  body('language')
    .optional({ nullable: true })
    .isString()
    .isIn(VALID_LANGUAGES)
    .withMessage(`language must be one of: ${VALID_LANGUAGES.join(', ')}`),
  handleValidation,
];

// ─── POST /api/ai/chat ─────────────────────────────────────────────────────
router.post('/chat', authenticate, ...aiChatValidators, async (req, res) => {
  try {
    const { category, message, history = [], language = 'en' } = req.body;

    // --- Check whether AI is configured on the server ---
    const aiUrl = process.env.AI_API_URL;
    const aiKey = process.env.AI_API_KEY;
    const aiModel = process.env.AI_MODEL || 'gpt-3.5-turbo';

    if (!aiUrl || !aiKey) {
      // Honest "not configured" — frontend is expected to use local fallback
      return res.json({
        success: false,
        error: 'AI_NOT_CONFIGURED',
        message:
          'AI provider is not configured on the server. ' +
          'Set AI_API_URL and AI_API_KEY in server/.env to enable AI responses.',
      });
    }

    // --- Build the AI provider request ---
    const languageInstruction =
      language === 'ur'
        ? 'Respond in Urdu (natural, clear Pakistani Urdu).'
        : 'Respond in English.';

    const aiMessages = [
      {
        role: 'system',
        content:
          `You are Life Sentinel's AI emergency assistant. ${languageInstruction} ` +
          `The current emergency category is: ${category}. ` +
          'Provide SHORT, CLEAR, ACTIONABLE instructions. Prioritize immediate safety. ' +
          'Ask only necessary follow-up questions. Never claim to be a replacement for ' +
          'emergency services. Support English and Urdu. Response must be under 150 words.',
      },
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    // --- Call the AI provider ---
    let providerResponse;
    try {
      providerResponse = await fetch(aiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiKey}`,
        },
        body: JSON.stringify({
          model: aiModel,
          messages: aiMessages,
          temperature: 0.3,
          max_tokens: 300,
        }),
      });
    } catch (networkErr) {
      console.error('AI provider network error:', networkErr.message);
      return res.status(502).json({
        error: 'AI_PROVIDER_ERROR',
        message: 'Failed to reach the AI provider. Please try again later.',
        retryable: true,
      });
    }

    if (!providerResponse.ok) {
      // Log status but never leak the API key or full error body to the client
      console.error(
        `AI provider returned ${providerResponse.status} ${providerResponse.statusText}`
      );
      return res.status(502).json({
        error: 'AI_PROVIDER_ERROR',
        message: `AI provider returned an error (status ${providerResponse.status}).`,
        retryable: providerResponse.status >= 500,
      });
    }

    const data = await providerResponse.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      console.error('AI provider returned empty response body');
      return res.status(502).json({
        error: 'AI_PROVIDER_ERROR',
        message: 'AI provider returned an empty response.',
        retryable: true,
      });
    }

    res.json({ success: true, content });
  } catch (err) {
    console.error('AI chat error:', err.message);
    res.status(500).json({
      error: 'AI_CHAT_FAILED',
      message: 'An unexpected error occurred while processing your AI request.',
      retryable: true,
    });
  }
});

module.exports = router;
