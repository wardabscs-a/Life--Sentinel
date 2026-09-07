// Routes: /api/admin/* — dispatch dashboard endpoints (admin only)
// Provides endpoints for the emergency dispatch operator dashboard
const express = require('express');
const router = express.Router();
const { db } = require('../middleware/firebase');
const { authenticate, requireAdmin } = require('../middleware/firebaseAuth');
const admin = require('firebase-admin');

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// ─── GET /api/admin/stats ──────────────────────────────────────────────────
// Quick stats for the dashboard header
router.get('/stats', async (req, res) => {
  try {
    const reportsSnap = await db.collection('reports').get();
    const sosSnap = await db.collection('sosEvents').get();

    const reports = reportsSnap.docs.map((d) => d.data());
    const sosEvents = sosSnap.docs.map((d) => d.data());

    const statusCounts = { NEW: 0, ACKNOWLEDGED: 0, ASSIGNED: 0, RESOLVED: 0 };
    reports.forEach((r) => {
      if (statusCounts[r.status] !== undefined) statusCounts[r.status]++;
    });

    const activeSOS = sosEvents.filter((s) => s.status === 'ACTIVE');

    res.json({
      success: true,
      stats: {
        totalReports: reports.length,
        newReports: statusCounts.NEW,
        acknowledgedReports: statusCounts.ACKNOWLEDGED,
        assignedReports: statusCounts.ASSIGNED,
        resolvedReports: statusCounts.RESOLVED,
        activeSOS: activeSOS.length,
        totalSOSEvents: sosEvents.length,
      },
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'STATS_FAILED', message: 'Failed to load stats.' });
  }
});

// ─── GET /api/admin/sos-events ─────────────────────────────────────────────
// List SOS events (active first)
router.get('/sos-events', async (req, res) => {
  try {
    const { status, limit: queryLimit } = req.query;
    const maxLimit = Math.min(parseInt(queryLimit) || 50, 200);

    let q = db.collection('sosEvents').orderBy('activatedAt', 'desc').limit(maxLimit);

    if (status) {
      q = db
        .collection('sosEvents')
        .where('status', '==', status)
        .orderBy('activatedAt', 'desc')
        .limit(maxLimit);
    }

    const snapshot = await q.get();
    const events = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    res.json({ success: true, count: events.length, events });
  } catch (err) {
    console.error('SOS events fetch error:', err);
    res.status(500).json({ error: 'SOS_EVENTS_FAILED', message: 'Failed to load SOS events.' });
  }
});

// ─── PATCH /api/admin/sos-events/:sosId/resolve ────────────────────────────
// Mark an SOS event as resolved
router.patch('/sos-events/:sosId/resolve', async (req, res) => {
  try {
    const { sosId } = req.params;
    const { notes } = req.body;

    const docRef = db.collection('sosEvents').doc(sosId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'SOS_NOT_FOUND', message: 'SOS event not found.' });
    }

    const updateData = {
      status: 'RESOLVED',
      resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
      resolvedBy: req.user.email,
    };
    if (notes) updateData.resolutionNotes = notes;

    await docRef.update(updateData);

    res.json({ success: true, sosId, status: 'RESOLVED' });
  } catch (err) {
    console.error('SOS resolve error:', err);
    res.status(500).json({ error: 'SOS_RESOLVE_FAILED', message: 'Failed to resolve SOS event.' });
  }
});

module.exports = router;
