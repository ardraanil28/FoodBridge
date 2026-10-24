import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { rescueFlowService } from '../services/rescueFlowService.js';
import { scheduler } from '../services/scheduler.js';

const router = express.Router();

/**
 * Propose backup recipients for unallocated surplus food
 */
router.get('/propose/:donationId', requireAuth, async (req, res) => {
  try {
    scheduler.runChecks();
    const donationId = Number(req.params.donationId);
    const result = await rescueFlowService.proposeBackupRecipients(donationId);
    res.json(result);
  } catch (err) {
    console.error('RescueFlow propose error:', err);
    res.status(400).json({ error: err.message || 'Failed to calculate RescueFlow allocations.' });
  }
});

/**
 * Confirm RescueFlow allocations across backup recipients
 */
router.post('/confirm', requireAuth, (req, res) => {
  try {
    const { donationId, allocations, notes } = req.body;
    if (!donationId) {
      return res.status(400).json({ error: 'Donation ID is required.' });
    }
    if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
      return res.status(400).json({ error: 'At least one backup allocation must be selected.' });
    }

    const result = rescueFlowService.confirmRescueAllocations({
      donationId: Number(donationId),
      allocations,
      donorUserId: req.user.id,
      notes: notes || ''
    });

    res.status(201).json({
      message: 'RescueFlow reservations successfully confirmed!',
      result
    });
  } catch (err) {
    console.error('RescueFlow confirm error:', err);
    res.status(400).json({ error: err.message || 'Failed to confirm RescueFlow allocations.' });
  }
});

export default router;
