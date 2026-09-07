// Life Sentinel — Backend API Server
// Entry point: configures Express, middleware, and mounts all route modules
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

// --- CORS ---
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);

// --- Body parsing ---
app.use(express.json({ limit: '1mb' }));

// --- Health check ---
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'life-sentinel-api',
    timestamp: new Date().toISOString(),
    notificationProviders: getProviderStatus(),
  });
});

// --- Import and mount route modules ---
const sosRoutes = require('./routes/sos');
const reportsRoutes = require('./routes/reports');
const notificationsRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');

app.use('/api/sos', sosRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

// --- 404 ---
app.use((req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: 'Endpoint not found.' });
});

// --- Global error handler ---
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err.message);

  // CORS error
  if (err.message && err.message.includes('not allowed by CORS')) {
    return res.status(403).json({ error: 'CORS_BLOCKED', message: err.message });
  }

  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'An internal server error occurred. Please try again later.',
    ...(process.env.NODE_ENV === 'development' && { detail: err.message }),
  });
});

// --- Start server ---
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`[Life Sentinel API] Server running on port ${PORT}`);
  console.log(`[Life Sentinel API] CORS origins: ${allowedOrigins.join(', ')}`);
  console.log(`[Life Sentinel API] Notification providers: ${getProviderStatus().join(', ') || 'none configured'}`);
});

// --- Helper ---
function getProviderStatus() {
  const providers = [];
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    providers.push('twilio-sms');
  }
  if (process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
    providers.push('whatsapp');
  }
  return providers;
}
