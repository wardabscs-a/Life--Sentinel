// Middleware: verify Firebase ID token from Authorization header
// Attaches decoded user info to req.user on success
const { admin, firebaseReady, initError } = require('./firebase');

/**
 * Authenticate any request that carries a valid Firebase ID token.
 * Header: Authorization: Bearer <firebase-id-token>
 */
function authenticate(req, res, next) {
  // Honest failure when the server has no Firebase credentials
  if (!firebaseReady) {
    return res.status(503).json({
      error: 'BACKEND_CREDENTIALS_MISSING',
      message:
        'Backend Firebase credentials are not configured. ' +
        'Add a valid serviceAccountKey.json to the server directory and restart. ' +
        (initError || ''),
    });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'AUTH_REQUIRED',
      message: 'Authentication required. Send a Firebase ID token in the Authorization header.',
    });
  }

  const idToken = authHeader.slice(7);

  admin
    .auth()
    .verifyIdToken(idToken)
    .then((decoded) => {
      req.user = {
        uid: decoded.uid,
        email: decoded.email || null,
      };
      next();
    })
    .catch((err) => {
      console.warn('Invalid Firebase ID token:', err.code || err.message);
      return res.status(401).json({
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired authentication token.',
      });
    });
}

/**
 * Restrict access to admin/dispatch operators.
 * Checks req.user.email against ADMIN_EMAILS env var (comma-separated).
 * Must be used AFTER authenticate().
 */
function requireAdmin(req, res, next) {
  const allowedEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!req.user || !req.user.email) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Access denied. Admin privileges required.',
    });
  }

  if (!allowedEmails.includes(req.user.email.toLowerCase())) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Access denied. Your account is not authorized for dispatch operations.',
    });
  }

  next();
}

module.exports = { authenticate, requireAdmin };
