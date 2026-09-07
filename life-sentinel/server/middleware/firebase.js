// Firebase Admin SDK — initialize once and export
// Uses the service account key file when present; otherwise boots the HTTP
// server anyway and reports credentials as missing so authenticated
// endpoints can return an honest 503 instead of crashing.
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const keyPath = path.resolve(
  __dirname,
  '..',
  process.env.GOOGLE_APPLICATION_CREDENTIALS || 'serviceAccountKey.json'
);
const projectId = process.env.FIREBASE_PROJECT_ID || 'life-sentinel';

let firebaseReady = false;
let initError = null;

if (!admin.apps.length) {
  if (fs.existsSync(keyPath)) {
    try {
      const serviceAccount = require(keyPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId,
      });
      firebaseReady = true;
      console.log(`[Life Sentinel API] Firebase Admin initialized (project: ${projectId})`);
    } catch (err) {
      initError = `Invalid service account key file: ${err.message}`;
      console.error('[Life Sentinel API]', initError);
    }
  } else {
    initError = `Service account key not found at ${keyPath}.`;
    console.warn('[Life Sentinel API] WARNING:', initError);
    console.warn('[Life Sentinel API] The server will start, but authenticated endpoints');
    console.warn('[Life Sentinel API] return 503 until a valid serviceAccountKey.json is added.');
    // Initialize without file credentials so the HTTP server can still boot.
    // Auth/Firestore calls would fail — guarded via firebaseReady checks.
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    try {
      admin.initializeApp({ projectId });
    } catch { /* ignore — guarded by firebaseReady */ }
  }
}

module.exports = { admin, db: admin.firestore(), firebaseReady, initError };
