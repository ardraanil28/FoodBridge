import express from 'express';
import { db } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { reservationService } from '../services/reservationService.js';
import { scheduler } from '../services/scheduler.js';

const router = express.Router();

// Get reservations for the current user (as requester OR donor)
router.get('/my', requireAuth, (req, res) => {
  try {
    scheduler.runChecks();
    const userId = req.user.id;
    const { role } = req.query; // 'donor' | 'requester' | undefined

    let query = `
      SELECT r.*,
        d.title as donation_title, d.category as donation_category, d.unit as donation_unit,
        d.collection_deadline as donation_deadline, d.district as donation_district, d.area as donation_area,
        req.title as request_title, req.needed_by as request_needed_by,
        u_req.name as requester_name, u_req.org_type as requester_org_type,
        u_don.name as donor_name, u_don.org_type as donor_org_type
      FROM reservations r
      JOIN donations d ON r.donation_id = d.id
      JOIN food_requests req ON r.request_id = req.id
      JOIN users u_req ON r.requester_id = u_req.id
      JOIN users u_don ON r.donor_id = u_don.id
      WHERE 1=1
    `;
    const params = [];

    if (role === 'donor') {
      query += ` AND r.donor_id = ?`;
      params.push(userId);
    } else if (role === 'requester') {
      query += ` AND r.requester_id = ?`;
      params.push(userId);
    } else {
      query += ` AND (r.donor_id = ? OR r.requester_id = ?)`;
      params.push(userId, userId);
    }

    query += ` ORDER BY r.id DESC`;

    const reservations = db.prepare(query).all(...params);

    // Mask contact details unless accepted
    const safeReservations = reservations.map(r => {
      const isAcceptedOrBeyond = ['accepted', 'partially_collected', 'completed'].includes(r.status);
      return {
        ...r,
        donor_phone: isAcceptedOrBeyond ? (r.donor_id === userId ? req.user.phone : db.prepare('SELECT phone FROM users WHERE id = ?').get(r.donor_id)?.phone) : null,
        requester_phone: isAcceptedOrBeyond ? (r.requester_id === userId ? req.user.phone : db.prepare('SELECT phone FROM users WHERE id = ?').get(r.requester_id)?.phone) : null
      };
    });

    res.json({ reservations: safeReservations });
  } catch (err) {
    console.error('Error fetching reservations:', err);
    res.status(500).json({ error: 'Failed to retrieve reservations.' });
  }
});

// Get single reservation details
router.get('/:id', requireAuth, (req, res) => {
  try {
    scheduler.runChecks();
    const resId = Number(req.params.id);

    const reservation = db.prepare(`
      SELECT r.*,
        d.title as donation_title, d.category as donation_category, d.unit as donation_unit,
        d.collection_deadline as donation_deadline, d.district as donation_district, d.area as donation_area,
        d.storage_info as donation_storage, d.image_url as donation_image,
        req.title as request_title, req.needed_by as request_needed_by,
        u_req.name as requester_name, u_req.org_type as requester_org_type, u_req.email as requester_email, u_req.phone as requester_phone,
        u_don.name as donor_name, u_don.org_type as donor_org_type, u_don.email as donor_email, u_don.phone as donor_phone
      FROM reservations r
      JOIN donations d ON r.donation_id = d.id
      JOIN food_requests req ON r.request_id = req.id
      JOIN users u_req ON r.requester_id = u_req.id
      JOIN users u_don ON r.donor_id = u_don.id
      WHERE r.id = ?
    `).get(resId);

    if (!reservation) {
      return res.status(404).json({ error: 'Reservation not found.' });
    }

    // Authorization: caller must be requester or donor
    if (reservation.requester_id !== req.user.id && reservation.donor_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to view this reservation.' });
    }

    // Privacy rule (Section 4): Only show contact phone/email when accepted/collected
    const isContactAuthorized = ['accepted', 'partially_collected', 'completed'].includes(reservation.status);
    if (!isContactAuthorized) {
      reservation.requester_phone = null;
      reservation.requester_email = null;
      reservation.donor_phone = null;
      reservation.donor_email = null;
    }

    // Fetch collection records for this reservation
    const collections = db.prepare(`
      SELECT * FROM collection_records WHERE reservation_id = ? ORDER BY id DESC
    `).all(resId);

    res.json({ reservation, collections, contactAuthorized: isContactAuthorized });
  } catch (err) {
    console.error('Error fetching reservation:', err);
    res.status(500).json({ error: 'Failed to retrieve reservation details.' });
  }
});

// Create reservation (supports single donation or multi-donor combination)
router.post('/', requireAuth, (req, res) => {
  try {
    const { requestId, items, requesterNotes } = req.body;

    if (!requestId) {
      return res.status(400).json({ error: 'Request ID is required.' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one donation item must be selected for reservation.' });
    }

    const result = reservationService.createReservations({
      requestId: Number(requestId),
      requesterId: req.user.id,
      items,
      requesterNotes: requesterNotes || ''
    });

    res.status(201).json({
      message: 'Reservation submitted successfully!',
      result
    });
  } catch (err) {
    console.error('Create reservation error:', err);
    res.status(400).json({ error: err.message || 'Failed to submit reservation.' });
  }
});

// Donor accepts reservation
router.post('/:id/accept', requireAuth, (req, res) => {
  try {
    const resId = Number(req.params.id);
    const { notes } = req.body;
    const result = reservationService.acceptReservation(resId, req.user.id, notes);
    res.json(result);
  } catch (err) {
    console.error('Accept reservation error:', err);
    res.status(400).json({ error: err.message || 'Failed to accept reservation.' });
  }
});

// Donor rejects reservation
router.post('/:id/reject', requireAuth, (req, res) => {
  try {
    const resId = Number(req.params.id);
    const { reason } = req.body;
    const result = reservationService.rejectReservation(resId, req.user.id, reason);
    res.json(result);
  } catch (err) {
    console.error('Reject reservation error:', err);
    res.status(400).json({ error: err.message || 'Failed to reject reservation.' });
  }
});

// Cancel reservation (pre-collection)
router.post('/:id/cancel', requireAuth, (req, res) => {
  try {
    const resId = Number(req.params.id);
    const { reason } = req.body;
    const result = reservationService.cancelReservation(resId, req.user.id, reason);
    res.json(result);
  } catch (err) {
    console.error('Cancel reservation error:', err);
    res.status(400).json({ error: err.message || 'Failed to cancel reservation.' });
  }
});

// Confirm collection (with support for partial collection)
router.post('/:id/collect', requireAuth, (req, res) => {
  try {
    const resId = Number(req.params.id);
    const { quantityCollected, isFinal = true, notes } = req.body;

    if (!quantityCollected) {
      return res.status(400).json({ error: 'Quantity collected is required.' });
    }

    const result = reservationService.confirmCollection({
      reservationId: resId,
      collectorUserId: req.user.id,
      quantityCollected,
      isFinal: Boolean(isFinal),
      notes: notes || ''
    });

    res.json(result);
  } catch (err) {
    console.error('Confirm collection error:', err);
    res.status(400).json({ error: err.message || 'Failed to record collection.' });
  }
});

export default router;
