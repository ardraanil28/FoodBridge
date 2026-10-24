import express from 'express';
import { matchingEngine } from '../services/matchingEngine.js';
import { requireAuth } from '../middleware/auth.js';
import { scheduler } from '../services/scheduler.js';
import { notificationService } from '../services/notificationService.js';
import { db } from '../config/db.js';

const router = express.Router();

// Get real matches and multi-donor proposed combinations for a request
router.get('/request/:requestId', requireAuth, (req, res) => {
  try {
    // Run lazy expiry checks first
    scheduler.runChecks();

    const requestId = Number(req.params.requestId);
    const result = matchingEngine.findMatchesForRequest(requestId);

    if (!result.request) {
      return res.status(404).json({ error: 'Food request not found.' });
    }

    // If top match found and has high score, send idempotent notification to requester
    if (result.matches.length > 0 && result.request.requester_id === req.user.id) {
      const topMatch = result.matches[0];
      if (topMatch.score >= 50) {
        notificationService.create({
          userId: req.user.id,
          type: 'match_found',
          message: `Found matching surplus food: "${topMatch.donation.title}" in ${topMatch.donation.area} (${topMatch.contributable_quantity} ${result.request.unit})!`,
          referenceType: 'request',
          referenceId: requestId,
          link: `/matches/request/${requestId}`,
          uniqueKey: `match_notif_${req.user.id}_${topMatch.donation.id}_${requestId}`
        });
      }
    }

    res.json(result);
  } catch (err) {
    console.error('Error finding matches:', err);
    res.status(500).json({ error: 'Failed to compute matches.' });
  }
});

// For donors: find requests that match their donation
router.get('/donation/:donationId', requireAuth, (req, res) => {
  try {
    scheduler.runChecks();

    const donationId = Number(req.params.donationId);
    const donation = db.prepare('SELECT * FROM donations WHERE id = ?').get(donationId);

    if (!donation) {
      return res.status(404).json({ error: 'Donation not found.' });
    }

    // Find open requests in same district and matching unit
    const requests = db.prepare(`
      SELECT r.*, u.name as requester_name, u.org_type as requester_org_type
      FROM food_requests r
      JOIN users u ON r.requester_id = u.id
      WHERE r.district = ?
        AND r.unit = ?
        AND r.status IN ('Open', 'Partially fulfilled', 'Partially matched')
        AND r.outstanding_quantity > 0
      ORDER BY r.needed_by ASC
    `).all(donation.district, donation.unit);

    const matches = [];
    for (const reqRecord of requests) {
      const eligibility = matchingEngine.checkEligibility(donation, reqRecord);
      if (eligibility.eligible) {
        const requesterUser = { org_type: reqRecord.requester_org_type };
        const scoring = matchingEngine.calculateScore(donation, reqRecord, eligibility, requesterUser);
        matches.push({
          request: {
            id: reqRecord.id,
            title: reqRecord.title,
            food_type: reqRecord.food_type,
            quantity: reqRecord.quantity,
            outstanding_quantity: reqRecord.outstanding_quantity,
            unit: reqRecord.unit,
            dietary_requirements: reqRecord.dietary_requirements,
            district: reqRecord.district,
            area: reqRecord.area,
            needed_by: reqRecord.needed_by,
            priority: reqRecord.priority,
            requester_name: reqRecord.requester_name,
            requester_org_type: reqRecord.requester_org_type
          },
          contributable_quantity: scoring.contributableQuantity,
          score: scoring.score,
          breakdown: scoring.breakdown,
          reasons: scoring.reasons,
          warnings: eligibility.warnings
        });
      }
    }

    matches.sort((a, b) => b.score - a.score);

    res.json({ donation, matches });
  } catch (err) {
    console.error('Error finding donation matches:', err);
    res.status(500).json({ error: 'Failed to compute matches for donation.' });
  }
});

export default router;
