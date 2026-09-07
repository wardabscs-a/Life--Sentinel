// Routes: POST /api/sos/activate  — trigger SOS + notify trusted contacts
//         POST /api/sos/deactivate — end SOS event
//
// SECURITY MODEL:
//   - User identity comes ONLY from the verified Firebase ID token (req.user.uid).
//   - Trusted contacts are fetched server-side from Firestore (users/{uid}.trustedContacts).
//     Contacts sent by the client are ignored.
//   - Location is optional (SOS must still fire without GPS) but validated when present.
const express = require('express');
const router = express.Router();
const { db } = require('../middleware/firebase');
const { authenticate } = require('../middleware/firebaseAuth');
const {
  sosActivateValidators,
  sosDeactivateValidators,
} = require('../middleware/validation');
const notificationService = require('../services/NotificationService');
const admin = require('firebase-admin');

/** Basic phone validation: 7–15 digits, optional leading +, spaces/dashes allowed. */
function isValidPhone(phone) {
  if (typeof phone !== 'string') return false;
  const normalized = phone.replace(/[\s\-()]/g, '');
  return /^\+?\d{7,15}$/.test(normalized);
}

// ─── POST /api/sos/activate ────────────────────────────────────────────────
router.post('/activate', authenticate, ...sosActivateValidators, async (req, res) => {
  try {
    const { location, timestamp, message, emergencyType } = req.body;
    const userId = req.user.uid;

    // 1. Load the user's profile — trusted contacts come from Firestore, not the client
    const userSnap = await db.collection('users').doc(userId).get();
    const profile = userSnap.exists ? userSnap.data() : null;
    const userName = (profile && profile.fullName) || 'A Life Sentinel user';
    const contacts = (profile && Array.isArray(profile.trustedContacts))
      ? profile.trustedContacts
      : [];

    const sosId = 'SOS-' + Date.now();
    const ts = timestamp || new Date().toISOString();

    const hasLocation = location && Number.isFinite(location.lat) && Number.isFinite(location.lng);
    const mapLink = hasLocation
      ? `https://www.google.com/maps?q=${location.lat},${location.lng}`
      : '';

    // 2. Build the SMS body — localized message from the client if provided,
    //    otherwise an English default built from server-validated data.
    const defaultLocationStr = hasLocation
      ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}${location.accuracy ? ` (±${Math.round(location.accuracy)}m)` : ''}`
      : 'Location unavailable';
    const defaultMessage =
      `🚨 LIFE SENTINEL SOS ALERT 🚨\n` +
      `${userName} activated an emergency SOS and needs help.\n` +
      `Time: ${new Date(ts).toLocaleString()}\n` +
      `Location: ${defaultLocationStr}\n` +
      (mapLink ? `Map: ${mapLink}\n` : '') +
      `Please check on ${userName} immediately. If they are in danger, contact emergency services (Rescue 1122) or go to their location.`;

    const alertMessage = (typeof message === 'string' && message.trim())
      ? message.trim()
      : defaultMessage;

    // 3. Persist the SOS event first (auditable record even if notifications fail)
    const sosDoc = {
      sosId,
      userId,
      userEmail: req.user.email,
      userName,
      emergencyType: emergencyType || 'general',
      location: hasLocation
        ? {
            lat: location.lat,
            lng: location.lng,
            accuracy: Number.isFinite(location.accuracy) ? location.accuracy : null,
            address: typeof location.address === 'string' ? location.address : null,
          }
        : null,
      mapLink: mapLink || null,
      contacted: contacts.map((c) => ({ name: c.name || '', phone: c.phone || '' })),
      status: 'ACTIVE',
      alertMessage,
      notificationResults: [], // filled in below after delivery attempts
      activatedAt: admin.firestore.FieldValue.serverTimestamp(),
      clientTimestamp: ts,
    };
    await db.collection('sosEvents').doc(sosId).set(sosDoc);

    // 4. No trusted contacts — honest failure, nothing sent
    if (contacts.length === 0) {
      await db.collection('sosEvents').doc(sosId).update({ status: 'NO_CONTACTS' });
      return res.json({
        success: false,
        sosId,
        notifications: [],
        errors: [
          {
            type: 'no_contacts',
            message:
              'No trusted contacts configured. Add contacts in Settings > Trusted Contacts.',
          },
        ],
        alertMessage,
        providersConfigured: notificationService.getConfiguredProviders(),
      });
    }

    // 5. Attempt delivery to every contact — invalid phones fail individually
    const notifications = [];
    const errors = [];

    for (const contact of contacts) {
      const name = contact && typeof contact.name === 'string' ? contact.name : 'Unknown';
      const phone = contact && typeof contact.phone === 'string' ? contact.phone.trim() : '';

      if (!isValidPhone(phone)) {
        notifications.push({
          contact: { name, phone },
          status: 'failed',
          method: 'invalid_phone',
          error: 'Invalid phone number — update this contact in Trusted Contacts.',
          message: alertMessage,
          timestamp: new Date().toISOString(),
        });
        errors.push({
          type: 'invalid_contact',
          contact: name,
          message: `Invalid phone number for ${name}. Update this contact in Trusted Contacts.`,
          retryable: false,
        });
        continue;
      }

      try {
        const result = await notificationService.send({
          to: phone,
          message: alertMessage,
        });

        // Map provider status to frontend display status
        let frontendStatus;
        switch (result.status) {
          case 'SENT':
            frontendStatus = 'sent';
            break;
          case 'NOT_CONFIGURED':
            frontendStatus = 'ready_to_send'; // manual SMS deep-link fallback
            break;
          case 'FAILED':
          default:
            frontendStatus = 'failed';
        }

        const notification = {
          contact: { name, phone },
          status: frontendStatus,
          method: result.method,
          message: alertMessage,
          timestamp: new Date().toISOString(),
        };
        if (result.smsLink) notification.smsLink = result.smsLink;
        if (result.error) notification.error = result.error;
        notifications.push(notification);
      } catch (err) {
        console.error(`Failed to notify ${name}:`, err.message);
        notifications.push({
          contact: { name, phone },
          status: 'failed',
          method: 'error',
          error: err.message,
          message: alertMessage,
          timestamp: new Date().toISOString(),
        });
        errors.push({
          type: 'contact_failed',
          contact: name,
          message: `Failed to notify ${name}: ${err.message}`,
          retryable: true,
        });
      }
    }

    // 6. Record delivery outcomes on the SOS event + notification audit records
    const notificationResults = notifications.map((n) => ({
      contactName: n.contact.name,
      contactPhone: n.contact.phone,
      status: n.status,
      method: n.method,
      error: n.error || null,
    }));

    await db.collection('sosEvents').doc(sosId).update({ notificationResults });

    const writeBatch = db.batch();
    notifications.forEach((n) => {
      writeBatch.create(db.collection('notifications').doc(), {
        sosId,
        userId,
        contactName: n.contact.name,
        contactPhone: n.contact.phone,
        status: n.status,
        method: n.method,
        message: alertMessage,
        error: n.error || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    await writeBatch.commit();

    // 7. Response — honest per-contact statuses
    const anySent = notifications.some((n) => n.status === 'sent');
    const allSent = notifications.every((n) => n.status === 'sent');
    const anyReady = notifications.some((n) => n.status === 'ready_to_send');

    res.json({
      success: allSent,
      partial: anySent && !allSent,
      sosId,
      notifications,
      errors: errors.length > 0 ? errors : undefined,
      alertMessage,
      backendNotConfigured: anyReady && !anySent,
      providersConfigured: notificationService.getConfiguredProviders(),
    });
  } catch (err) {
    console.error('SOS activation error:', err);
    res.status(500).json({
      error: 'SOS_ACTIVATION_FAILED',
      message: 'Failed to activate SOS. Please call emergency services directly (1122).',
      retryable: true,
    });
  }
});

// ─── POST /api/sos/deactivate ──────────────────────────────────────────────
router.post('/deactivate', authenticate, ...sosDeactivateValidators, async (req, res) => {
  try {
    const { sosId } = req.body;
    const userId = req.user.uid;

    // Verify the SOS event belongs to this user
    const sosRef = db.collection('sosEvents').doc(sosId);
    const sosDoc = await sosRef.get();

    if (!sosDoc.exists) {
      return res.status(404).json({
        error: 'SOS_NOT_FOUND',
        message: 'SOS event not found.',
      });
    }

    if (sosDoc.data().userId !== userId) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'You can only deactivate your own SOS events.',
      });
    }

    await sosRef.update({
      status: 'DEACTIVATED',
      deactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true, sosId, status: 'DEACTIVATED' });
  } catch (err) {
    console.error('SOS deactivation error:', err);
    res.status(500).json({
      error: 'SOS_DEACTIVATION_FAILED',
      message: 'Failed to deactivate SOS event.',
      retryable: true,
    });
  }
});

module.exports = router;
