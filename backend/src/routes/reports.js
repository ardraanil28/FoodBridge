import express from 'express';
import { db } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { activityService } from '../services/activityService.js';

const router = express.Router();

router.post('/', requireAuth, (req, res) => {
  try {
    const { listing_type, listing_id, reason } = req.body;

    if (!listing_type || !['donation', 'request'].includes(listing_type)) {
      return res.status(400).json({ error: 'Valid listing type (donation or request) is required.' });
    }
    if (!listing_id) {
      return res.status(400).json({ error: 'Listing ID is required.' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Please provide a reason for the report.' });
    }

    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO reports (reporter_id, listing_type, listing_id, reason, status, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `);
    const result = stmt.run(req.user.id, listing_type, Number(listing_id), reason.trim(), now);

    activityService.log({
      userId: req.user.id,
      action: 'listing_reported',
      entityType: listing_type,
      entityId: Number(listing_id),
      details: { reason: reason.trim() }
    });

    res.status(201).json({
      message: 'Report received. Thank you for keeping FoodBridge AI safe and trustworthy.',
      reportId: Number(result.lastInsertRowid)
    });
  } catch (err) {
    console.error('Report listing error:', err);
    res.status(500).json({ error: 'Failed to submit report.' });
  }
});

export default router;
