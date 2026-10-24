import express from 'express';
import { db } from '../config/db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { isValidLocality } from '../config/localities.js';
import { activityService } from '../services/activityService.js';

const router = express.Router();

const VALID_UNITS = ['portions', 'meals', 'kg', 'packets'];
const VALID_CATEGORIES = ['cooked_meals', 'bakery', 'raw_produce', 'packaged_groceries', 'beverages', 'other'];
const VALID_DIETARY = ['vegetarian', 'vegan', 'non-vegetarian', 'any'];
const VALID_PRIORITIES = ['low', 'normal', 'urgent'];

// List requests (Public / Filtered)
router.get('/', optionalAuth, (req, res) => {
  try {
    const { district, area, food_type, dietary_requirements, status, unit, priority, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT r.*, u.name as requester_name, u.org_type as requester_org_type
      FROM food_requests r
      JOIN users u ON r.requester_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND r.status = ?`;
      params.push(status);
    } else {
      query += ` AND r.status IN ('Open', 'Partially matched', 'Partially fulfilled', 'Fully reserved', 'Partially collected')`;
    }

    if (district) {
      query += ` AND r.district = ?`;
      params.push(district);
    }
    if (area) {
      query += ` AND r.area = ?`;
      params.push(area);
    }
    if (food_type) {
      query += ` AND r.food_type = ?`;
      params.push(food_type);
    }
    if (dietary_requirements) {
      query += ` AND r.dietary_requirements = ?`;
      params.push(dietary_requirements);
    }
    if (unit) {
      query += ` AND r.unit = ?`;
      params.push(unit);
    }
    if (priority) {
      query += ` AND r.priority = ?`;
      params.push(priority);
    }

    query += ` ORDER BY r.needed_by ASC, r.id DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const stmt = db.prepare(query);
    const rows = stmt.all(...params);

    const requests = rows.map(row => ({
      ...row,
      allergies_to_avoid: JSON.parse(row.allergies_to_avoid || '[]')
    }));

    res.json({ requests });
  } catch (err) {
    console.error('List requests error:', err);
    res.status(500).json({ error: 'Failed to retrieve food requests.' });
  }
});

// Get user's own requests
router.get('/my', requireAuth, (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT r.*,
        (SELECT COUNT(*) FROM reservations res WHERE res.request_id = r.id AND res.status IN ('pending', 'accepted')) as active_reservations_count
      FROM food_requests r
      WHERE r.requester_id = ?
      ORDER BY r.id DESC
    `);
    const rows = stmt.all(req.user.id);
    const requests = rows.map(row => ({
      ...row,
      allergies_to_avoid: JSON.parse(row.allergies_to_avoid || '[]')
    }));

    res.json({ requests });
  } catch (err) {
    console.error('My requests error:', err);
    res.status(500).json({ error: 'Failed to retrieve your food requests.' });
  }
});

// Get single request with allocations and reservations
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT r.*, u.name as requester_name, u.org_type as requester_org_type, u.district as requester_district, u.area as requester_area
      FROM food_requests r
      JOIN users u ON r.requester_id = u.id
      WHERE r.id = ?
    `);
    const request = stmt.get(req.params.id);

    if (!request) {
      return res.status(404).json({ error: 'Food request not found.' });
    }

    request.allergies_to_avoid = JSON.parse(request.allergies_to_avoid || '[]');

    // Get reservations associated with this request
    const resStmt = db.prepare(`
      SELECT res.*, d.title as donation_title, d.category as donation_category, d.unit as donation_unit,
             u.name as donor_name, u.district as donor_district, u.area as donor_area,
             u.phone as donor_phone
      FROM reservations res
      JOIN donations d ON res.donation_id = d.id
      JOIN users u ON res.donor_id = u.id
      WHERE res.request_id = ?
      ORDER BY res.id DESC
    `);
    const reservations = resStmt.all(request.id);

    // Get allocations
    const allocStmt = db.prepare(`
      SELECT a.*, d.title as donation_title, d.unit as donation_unit, u.name as donor_name
      FROM allocations a
      JOIN donations d ON a.donation_id = d.id
      JOIN users u ON d.donor_id = u.id
      WHERE a.request_id = ?
    `);
    const allocations = allocStmt.all(request.id);

    // Get activity history
    const historyStmt = db.prepare(`
      SELECT * FROM activity_log
      WHERE entity_type = 'request' AND entity_id = ?
      ORDER BY id DESC LIMIT 10
    `);
    const history = historyStmt.all(request.id);

    res.json({ request, reservations, allocations, history });
  } catch (err) {
    console.error('Get request error:', err);
    res.status(500).json({ error: 'Failed to retrieve food request.' });
  }
});

// Create food request
router.post('/', requireAuth, (req, res) => {
  try {
    const {
      title,
      food_type,
      quantity,
      unit,
      dietary_requirements,
      allergies_to_avoid,
      district,
      area,
      needed_by,
      description,
      priority
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Request title is required.' });
    }
    const numQty = parseFloat(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive number.' });
    }
    if (!VALID_UNITS.includes(unit)) {
      return res.status(400).json({ error: `Unit must be one of: ${VALID_UNITS.join(', ')}` });
    }
    if (!VALID_CATEGORIES.includes(food_type)) {
      return res.status(400).json({ error: `Food type must be one of: ${VALID_CATEGORIES.join(', ')}` });
    }
    if (!VALID_DIETARY.includes(dietary_requirements)) {
      return res.status(400).json({ error: `Dietary requirement must be one of: ${VALID_DIETARY.join(', ')}` });
    }
    if (!district || !area || !isValidLocality(district, area)) {
      return res.status(400).json({ error: 'Please choose a valid Kerala district and area.' });
    }
    if (!needed_by) {
      return res.status(400).json({ error: 'Needed-by date and time is required.' });
    }

    const priorityVal = VALID_PRIORITIES.includes(priority) ? priority : 'normal';
    const allergiesList = Array.isArray(allergies_to_avoid) ? allergies_to_avoid : [];
    const allergiesJson = JSON.stringify(allergiesList);
    const now = new Date().toISOString();

    const insert = db.prepare(`
      INSERT INTO food_requests (
        requester_id, title, food_type, quantity, unit,
        dietary_requirements, allergies_to_avoid, district, area,
        needed_by, description, priority,
        reserved_quantity, collected_quantity, outstanding_quantity,
        status, is_demo, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        0, 0, ?,
        'Open', 0, ?, ?
      )
    `);

    const result = insert.run(
      req.user.id,
      title.trim(),
      food_type,
      numQty,
      unit,
      dietary_requirements,
      allergiesJson,
      district,
      area,
      needed_by,
      description ? description.trim() : null,
      priorityVal,
      numQty, // outstanding_quantity starts as full quantity
      now,
      now
    );

    const newId = Number(result.lastInsertRowid);

    activityService.log({
      userId: req.user.id,
      action: 'request_created',
      entityType: 'request',
      entityId: newId,
      details: { title, quantity: numQty, unit, district, area }
    });

    const created = db.prepare('SELECT * FROM food_requests WHERE id = ?').get(newId);
    created.allergies_to_avoid = JSON.parse(created.allergies_to_avoid);

    res.status(201).json({ message: 'Food request created successfully', request: created });
  } catch (err) {
    console.error('Create request error:', err);
    res.status(500).json({ error: 'Failed to create food request.' });
  }
});

// Edit food request
router.put('/:id', requireAuth, (req, res) => {
  try {
    const request = db.prepare('SELECT * FROM food_requests WHERE id = ?').get(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Food request not found.' });
    }
    if (request.requester_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized. You can only edit your own requests.' });
    }
    if (request.status === 'Cancelled' || request.status === 'Fulfilled' || request.status === 'Expired') {
      return res.status(400).json({ error: `Cannot edit request with status '${request.status}'.` });
    }

    const {
      title,
      food_type,
      quantity,
      unit,
      dietary_requirements,
      allergies_to_avoid,
      district,
      area,
      needed_by,
      description,
      priority
    } = req.body;

    const numQty = quantity !== undefined ? parseFloat(quantity) : request.quantity;
    if (isNaN(numQty) || numQty <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive number.' });
    }

    // Safeguard: Cannot decrease requested quantity below already reserved + collected quantity
    const fulfilledSoFar = request.reserved_quantity + request.collected_quantity;
    if (numQty < fulfilledSoFar) {
      return res.status(400).json({
        error: `Cannot reduce quantity to ${numQty} because ${fulfilledSoFar} ${request.unit} is already reserved or collected.`
      });
    }

    if (unit && unit !== request.unit && request.reserved_quantity > 0) {
      return res.status(400).json({
        error: 'Cannot change unit when active reservations exist.'
      });
    }

    if (district && area && !isValidLocality(district, area)) {
      return res.status(400).json({ error: 'Invalid Kerala district and area.' });
    }

    const newOutstanding = numQty - fulfilledSoFar;
    const allergiesList = allergies_to_avoid !== undefined ? (Array.isArray(allergies_to_avoid) ? allergies_to_avoid : []) : JSON.parse(request.allergies_to_avoid);
    const allergiesJson = JSON.stringify(allergiesList);
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE food_requests SET
        title = ?, food_type = ?, quantity = ?, unit = ?,
        dietary_requirements = ?, allergies_to_avoid = ?, district = ?, area = ?,
        needed_by = ?, description = ?, priority = ?,
        outstanding_quantity = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      title ? title.trim() : request.title,
      food_type || request.food_type,
      numQty,
      unit || request.unit,
      dietary_requirements || request.dietary_requirements,
      allergiesJson,
      district || request.district,
      area || request.area,
      needed_by || request.needed_by,
      description !== undefined ? (description ? description.trim() : null) : request.description,
      priority || request.priority,
      newOutstanding,
      now,
      request.id
    );

    activityService.log({
      userId: req.user.id,
      action: 'request_updated',
      entityType: 'request',
      entityId: request.id,
      details: { quantity: numQty, outstanding: newOutstanding }
    });

    const updated = db.prepare('SELECT * FROM food_requests WHERE id = ?').get(request.id);
    updated.allergies_to_avoid = JSON.parse(updated.allergies_to_avoid);

    res.json({ message: 'Request updated successfully', request: updated });
  } catch (err) {
    console.error('Update request error:', err);
    res.status(500).json({ error: 'Failed to update food request.' });
  }
});

// Cancel food request
router.post('/:id/cancel', requireAuth, (req, res) => {
  try {
    const request = db.prepare('SELECT * FROM food_requests WHERE id = ?').get(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Food request not found.' });
    }
    if (request.requester_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized. You can only cancel your own requests.' });
    }
    if (request.status === 'Cancelled') {
      return res.status(400).json({ error: 'Request is already cancelled.' });
    }

    const activeRes = db.prepare(`
      SELECT COUNT(*) as count FROM reservations
      WHERE request_id = ? AND status IN ('pending', 'accepted')
    `).get(request.id);

    if (activeRes.count > 0) {
      return res.status(400).json({
        error: `Cannot cancel this request: it has ${activeRes.count} active reservation(s). Please cancel active reservations first.`
      });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE food_requests SET
        status = 'Cancelled',
        outstanding_quantity = 0,
        updated_at = ?
      WHERE id = ?
    `).run(now, request.id);

    activityService.log({
      userId: req.user.id,
      action: 'request_cancelled',
      entityType: 'request',
      entityId: request.id
    });

    res.json({ message: 'Request cancelled successfully.' });
  } catch (err) {
    console.error('Cancel request error:', err);
    res.status(500).json({ error: 'Failed to cancel food request.' });
  }
});

export default router;
