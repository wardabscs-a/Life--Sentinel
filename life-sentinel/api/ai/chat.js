// Vercel serverless function — AI chat proxy
// Mirrors server/routes/ai.js for production deployment on Vercel.
// Keeps AI_API_KEY server-side only; requires Firebase authentication.
//
// Required env vars (set in Vercel dashboard, no VITE_ prefix):
//   AI_API_URL, AI_API_KEY, AI_MODEL, FIREBASE_PROJECT_ID,
//   FIREBASE_SERVICE_ACCOUNT  (JSON string of the service account key)

const VALID_CATEGORIES = ['accident', 'fire', 'flood', 'earthquake', 'medical', 'crime', 'other'];
const VALID_LANGUAGES = ['en', 'ur'];

// ─── Firebase Admin (lazy, cached across warm invocations) ──────────────────
let _admin = null;
let _firebaseReady = false;

async function getFirebaseAdmin() {
  if (_admin) return { admin: _admin, ready: _firebaseReady };

  const admin = (await import('firebase-admin')).default;

  if (!admin.apps.length) {
    try {
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
      const projectId = process.env.FIREBASE_PROJECT_ID || 'life-sentinel';

      if (serviceAccountJson) {
        const serviceAccount = JSON.parse(serviceAccountJson);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId,
        });
        _firebaseReady = true;
      } else {
        // No service account — boot in degraded mode (auth returns 503)
        admin.initializeApp({ projectId });
      }
    } catch (err) {
      console.error('Firebase Admin init error:', err.message);
    }
  } else {
    _firebaseReady = true;
  }

  _admin = admin;
  return { admin, ready: _firebaseReady };
}

// ─── Validation helpers ─────────────────────────────────────────────────────
function validateBody(body) {
  const errors = [];
  const { category, message, history, language } = body || {};

  if (typeof category !== 'string' || !VALID_CATEGORIES.includes(category)) {
    errors.push({ field: 'category', message: `category must be one of: ${VALID_CATEGORIES.join(', ')}` });
  }
  if (typeof message !== 'string' || message.trim().length === 0) {
    errors.push({ field: 'message', message: 'message is required' });
  } else if (message.length > 2000) {
    errors.push({ field: 'message', message: 'message must be 2000 characters or fewer' });
  }
  if (history != null) {
    if (!Array.isArray(history)) {
      errors.push({ field: 'history', message: 'history must be an array' });
    } else {
      for (let i = 0; i < history.length; i++) {
        const h = history[i];
        if (h.role && !['user', 'assistant', 'system'].includes(h.role)) {
          errors.push({ field: `history[${i}].role`, message: 'history role must be user, assistant, or system' });
        }
        if (h.content != null && typeof h.content !== 'string') {
          errors.push({ field: `history[${i}].content`, message: 'history content must be a string' });
        }
      }
    }
  }
  if (language != null && !VALID_LANGUAGES.includes(language)) {
    errors.push({ field: 'language', message: `language must be one of: ${VALID_LANGUAGES.join(', ')}` });
  }

  return errors;
}

// ─── Handler ────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Only POST is accepted
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  // --- Firebase authentication ---
  const { admin, ready: firebaseReady } = await getFirebaseAdmin();

  if (!firebaseReady) {
    return res.status(503).json({
      error: 'BACKEND_CREDENTIALS_MISSING',
      message:
        'Backend Firebase credentials are not configured. ' +
        'Set FIREBASE_SERVICE_ACCOUNT and FIREBASE_PROJECT_ID in Vercel env vars.',
    });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'AUTH_REQUIRED',
      message: 'Authentication required. Send a Firebase ID token in the Authorization header.',
    });
  }

  try {
    await admin.auth().verifyIdToken(authHeader.slice(7));
  } catch (err) {
    console.warn('Invalid Firebase ID token:', err.code || err.message);
    return res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Invalid or expired authentication token.',
    });
  }

  // --- Validate request body ---
  const validationErrors = validateBody(req.body);
  if (validationErrors.length > 0) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid request data.',
      details: validationErrors,
    });
  }

  try {
    const { category, message, history = [], language = 'en' } = req.body;

    // --- Check whether AI is configured ---
    const aiUrl = process.env.AI_API_URL;
    const aiKey = process.env.AI_API_KEY;
    const aiModel = process.env.AI_MODEL || 'gpt-3.5-turbo';

    if (!aiUrl || !aiKey) {
      return res.status(200).json({
        success: false,
        error: 'AI_NOT_CONFIGURED',
        message:
          'AI provider is not configured on the server. ' +
          'Set AI_API_URL and AI_API_KEY to enable AI responses.',
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

    return res.status(200).json({ success: true, content });
  } catch (err) {
    console.error('AI chat error:', err.message);
    return res.status(500).json({
      error: 'AI_CHAT_FAILED',
      message: 'An unexpected error occurred while processing your AI request.',
      retryable: true,
    });
  }
}
