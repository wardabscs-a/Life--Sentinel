// Routes: POST /api/notifications/send — send a notification to a single contact
// Used for retry, non-SOS status updates, and sharing
const express = require('express');
const router = express.Router();
const { db } = require('../middleware/firebase');
const { authenticate } = require('../middleware/firebaseAuth');
const { notifyContactValidators } = require('../middleware/validation');
const notificationService = require('../services/NotificationService');
const admin = require('firebase-admin');

// ─── POST /api/notifications/send ──────────────────────────────────────────
router.post('/send', authenticate, ...notifyContactValidators, async (req, res) => {
  try {
    const { contact, message, location, type, sosId } = req.body;
    const userId = req.user.uid;

    // Append location link if available
    let fullMessage = message;
    if (location && location.lat && location.lng) {
      fullMessage += `\nMap: https://www.google.com/maps?q=${location.lat},${location.lng}`;
    }

    const result = await notificationService.send({
      to: contact.phone,
      message: fullMessage,
    });

    // Store notification in Firestore
    await db.collection('notifications').add({
      userId,
      sosId: sosId || null,
      type,
      contactName: contact.name,
      contactPhone: contact.phone,
      message: fullMessage,
      status: result.status,
      method: result.method,
      error: result.error || null,
      messageId: result.messageId || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Map to frontend-expected format
    let frontendStatus;
    switch (result.status) {
      case 'SENT':
        frontendStatus = 'sent';
        break;
      case 'NOT_CONFIGURED':
        frontendStatus = 'ready_to_send';
        break;
      case 'FAILED':
        frontendStatus = 'failed';
        break;
      default:
        frontendStatus = 'failed';
    }

    const response = {
      success: frontendStatus === 'sent',
      contact: { name: contact.name, phone: contact.phone },
      status: frontendStatus,
      method: result.method,
      message: fullMessage,
      timestamp: new Date().toISOString(),
    };

    if (result.smsLink) {
      response.smsLink = result.smsLink;
    }

    res.json(response);
  } catch (err) {
    console.error('Notification send error:', err);
    res.status(500).json({
      error: 'NOTIFICATION_FAILED',
      message: `Failed to send notification: ${err.message}`,
      retryable: true,
    });
  }
});

module.exports = router;
