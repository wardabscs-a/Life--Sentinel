// Routes for emergency reports:
//   POST   /api/reports          — submit new emergency report (user)
//   GET    /api/reports          — list reports (admin/dispatch only)
//   GET    /api/reports/:id      — get single report (owner or admin)
//   PATCH  /api/reports/:reportId/status — update status (admin only)
const express = require('express');
const router = express.Router();
const { db } = require('../middleware/firebase');
const { authenticate, requireAdmin } = require('../middleware/firebaseAuth');
const {
  reportCreateValidators,
  reportStatusValidators,
  handleValidation,
} = require('../middleware/validation');
const admin = require('firebase-admin');

// ─── POST /api/reports ─────────────────────────────────────────────────────
// Submit a new emergency report (authenticated user)
router.post('/', authenticate, ...reportCreateValidators, async (req, res) => {
  try {
    const {
      category,
      severity,
      description,
      location,
      address,
      image,
      timestamp,
    } = req.body;

    const userId = req.user.uid;
    const reportId = 'RPT-' + Date.now();
    const ts = timestamp || new Date().toISOString();

    const report = {
      reportId,
      userId,
      userEmail: req.user.email,
      category,
      severity,
      description,
      address: address || location.address || null,
      location: {
        lat: location.lat,
        lng: location.lng,
        accuracy: location.accuracy || null,
      },
      mapLink: `https://www.google.com/maps?q=${location.lat},${location.lng}`,
      image: image || null, // base64 or URL if provided
      status: 'NEW',
      clientTimestamp: ts,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Save to Firestore reports collection
    await db.collection('reports').doc(reportId).set(report);

    res.status(201).json({
      success: true,
      id: reportId,
      status: 'submitted',
      message:
        'Emergency report recorded successfully. Your emergency details and location have been saved to Life Sentinel.',
    });
  } catch (err) {
    console.error('Report submission error:', err);
    res.status(500).json({
      error: 'REPORT_SUBMISSION_FAILED',
      message: 'Failed to submit emergency report. Please call 1122 directly.',
      retryable: true,
    });
  }
});

// ─── GET /api/reports ──────────────────────────────────────────────────────
// List all reports (admin/dispatch only) with optional filters
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { status, limit: queryLimit, userId } = req.query;
    const maxLimit = Math.min(parseInt(queryLimit) || 100, 500);

    let q = db.collection('reports').orderBy('createdAt', 'desc').limit(maxLimit);

    if (status) {
      q = db
        .collection('reports')
        .where('status', '==', status)
        .orderBy('createdAt', 'desc')
        .limit(maxLimit);
    }

    const snapshot = await q.get();
    const reports = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Filter by userId if provided (post-query since Firestore can't combine
    // where + orderBy on different fields without a composite index)
    const filtered = userId
      ? reports.filter((r) => r.userId === userId)
      : reports;

    res.json({ success: true, count: filtered.length, reports: filtered });
  } catch (err) {
    console.error('Reports fetch error:', err);
    res.status(500).json({
      error: 'REPORTS_FETCH_FAILED',
      message: 'Failed to retrieve reports.',
    });
  }
});

// ─── GET /api/reports/:reportId ────────────────────────────────────────────
// Get a single report — owner or admin
router.get('/:reportId', authenticate, async (req, res) => {
  try {
    const { reportId } = req.params;
    const doc = await db.collection('reports').doc(reportId).get();

    if (!doc.exists) {
      return res.status(404).json({
        error: 'REPORT_NOT_FOUND',
        message: 'Report not found.',
      });
    }

    const data = doc.data();

    // Allow owner or admin
    const isAdmin = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .includes((req.user.email || '').toLowerCase());

    if (data.userId !== req.user.uid && !isAdmin) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'You can only view your own reports.',
      });
    }

    res.json({ success: true, id: doc.id, ...data });
  } catch (err) {
    console.error('Report fetch error:', err);
    res.status(500).json({
      error: 'REPORT_FETCH_FAILED',
      message: 'Failed to retrieve report.',
    });
  }
});

// ─── PATCH /api/reports/:reportId/status ───────────────────────────────────
// Update report status (admin/dispatch only)
router.patch(
  '/:reportId/status',
  authenticate,
  requireAdmin,
  ...reportStatusValidators,
  async (req, res) => {
    try {
      const { reportId } = req.params;
      const { status, notes, assignedTo } = req.body;

      const docRef = db.collection('reports').doc(reportId);
      const doc = await docRef.get();

      if (!doc.exists) {
        return res.status(404).json({
          error: 'REPORT_NOT_FOUND',
          message: 'Report not found.',
        });
      }

      const updateData = {
        status,
        statusUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        statusUpdatedBy: req.user.email,
      };

      if (notes) updateData.notes = notes;
      if (assignedTo) updateData.assignedTo = assignedTo;

      await docRef.update(updateData);

      res.json({
        success: true,
        id: reportId,
        status,
        message: `Report status updated to ${status}.`,
      });
    } catch (err) {
      console.error('Report status update error:', err);
      res.status(500).json({
        error: 'STATUS_UPDATE_FAILED',
        message: 'Failed to update report status.',
        retryable: true,
      });
    }
  }
);

module.exports = router;
