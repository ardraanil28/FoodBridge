import express from 'express';
import { db } from '../config/db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { isValidLocality } from '../config/localities.js';
import { upload } from '../middleware/upload.js';
import { activityService } from '../services/activityService.js';

const router = express.Router();

const VALID_UNITS = ['portions', 'meals', 'kg', 'packets'];
const VALID_CATEGORIES = ['cooked_meals', 'bakery', 'raw_produce', 'packaged_groceries', 'beverages', 'other'];
const VALID_DIETARY = ['vegetarian', 'vegan', 'non-vegetarian', 'unknown'];

// Upload image
router.post('/upload-image', requireAuth, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Image upload failed' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  });
});

// List donations (Public / Filtered)
router.get('/', optionalAuth, (req, res) => {
  try {
    const { district, area, category, dietary_class, status, unit, search, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT d.*, u.name as donor_name, u.org_type as donor_org_type
      FROM donations d
      JOIN users u ON d.donor_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by status (default to Available & Partially reserved if not specified)
    if (status) {
      query += ` AND d.status = ?`;
      params.push(status);
    } else {
      query += ` AND d.status IN ('Available', 'Partially reserved')`;
    }

    if (district) {
      query += ` AND d.district = ?`;
      params.push(district);
    }
    if (area) {
      query += ` AND d.area = ?`;
      params.push(area);
    }
    if (category) {
      query += ` AND d.category = ?`;
      params.push(category);
    }
    if (dietary_class) {
      query += ` AND d.dietary_class = ?`;
      params.push(dietary_class);
    }
    if (unit) {
      query += ` AND d.unit = ?`;
      params.push(unit);
    }
    if (search) {
      query += ` AND (d.title LIKE ? OR d.description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY d.collection_deadline ASC, d.id DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const stmt = db.prepare(query);
    const rows = stmt.all(...params);

    const donations = rows.map(row => ({
      ...row,
      declared_allergens: JSON.parse(row.declared_allergens || '[]')
    }));

    res.json({ donations });
  } catch (err) {
    console.error('List donations error:', err);
    res.status(500).json({ error: 'Failed to retrieve donations.' });
  }
});

// Get user's own donations
router.get('/my', requireAuth, (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT d.*, 
        (SELECT COUNT(*) FROM reservations r WHERE r.donation_id = d.id AND r.status = 'pending') as pending_reservations_count
      FROM donations d
      WHERE d.donor_id = ?
      ORDER BY d.id DESC
    `);
    const rows = stmt.all(req.user.id);
    const donations = rows.map(row => ({
      ...row,
      declared_allergens: JSON.parse(row.declared_allergens || '[]')
    }));

    res.json({ donations });
  } catch (err) {
    console.error('My donations error:', err);
    res.status(500).json({ error: 'Failed to retrieve your donations.' });
  }
});

// Get single donation
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT d.*, u.name as donor_name, u.org_type as donor_org_type, u.district as donor_district, u.area as donor_area
      FROM donations d
      JOIN users u ON d.donor_id = u.id
      WHERE d.id = ?
    `);
    const donation = stmt.get(req.params.id);

    if (!donation) {
      return res.status(404).json({ error: 'Donation listing not found.' });
    }

    donation.declared_allergens = JSON.parse(donation.declared_allergens || '[]');

    // Fetch related reservations if caller is donor
    let reservations = [];
    if (req.user && req.user.id === donation.donor_id) {
      const resStmt = db.prepare(`
        SELECT r.*, u.name as requester_name, u.phone as requester_phone, u.district as requester_district, u.area as requester_area
        FROM reservations r
        JOIN users u ON r.requester_id = u.id
        WHERE r.donation_id = ?
        ORDER BY r.id DESC
      `);
      reservations = resStmt.all(donation.id);
    }

    // Fetch activity history
    const historyStmt = db.prepare(`
      SELECT * FROM activity_log
      WHERE entity_type = 'donation' AND entity_id = ?
      ORDER BY id DESC LIMIT 10
    `);
    const history = historyStmt.all(donation.id);

    res.json({ donation, reservations, history });
  } catch (err) {
    console.error('Get donation error:', err);
    res.status(500).json({ error: 'Failed to retrieve donation details.' });
  }
});

// Create donation
router.post('/', requireAuth, (req, res) => {
  try {
    const {
      title,
      description,
      category,
      quantity,
      unit,
      dietary_class,
      declared_allergens,
      has_unknown_allergens,
      preparation_time,
      storage_info,
      district,
      area,
      available_from,
      collection_deadline,
      image_url,
      donor_reference,
      food_safety_acknowledged
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Listing title is required.' });
    }
    const numQty = parseFloat(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive number.' });
    }
    if (!VALID_UNITS.includes(unit)) {
      return res.status(400).json({ error: `Unit must be one of: ${VALID_UNITS.join(', ')}` });
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `Category must be one of: ${VALID_CATEGORIES.join(', ')}` });
    }
    if (!VALID_DIETARY.includes(dietary_class)) {
      return res.status(400).json({ error: `Dietary class must be one of: ${VALID_DIETARY.join(', ')}` });
    }
    if (!district || !area || !isValidLocality(district, area)) {
      return res.status(400).json({ error: 'Please choose a valid Kerala district and area.' });
    }
    if (!collection_deadline) {
      return res.status(400).json({ error: 'Collection deadline is required.' });
    }

    const availFrom = available_from || new Date().toISOString();
    if (new Date(collection_deadline) <= new Date(availFrom)) {
      return res.status(400).json({ error: 'Collection deadline must be after available-from time.' });
    }

    if (!food_safety_acknowledged) {
      return res.status(400).json({
        error: 'You must acknowledge the food safety disclaimer. FoodBridge AI does not certify food safety.'
      });
    }

    const allergensList = Array.isArray(declared_allergens) ? declared_allergens : [];
    const allergensJson = JSON.stringify(allergensList);
    const unknownAllergens = has_unknown_allergens ? 1 : (allergensList.includes('unknown') ? 1 : 0);

    const now = new Date().toISOString();
    const insert = db.prepare(`
      INSERT INTO donations (
        donor_id, title, description, category, quantity, unit,
        dietary_class, declared_allergens, has_unknown_allergens,
        preparation_time, storage_info, district, area,
        available_from, collection_deadline, image_url, donor_reference,
        available_quantity, reserved_quantity, collected_quantity,
        status, is_demo, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, 0, 0,
        'Available', 0, ?, ?
      )
    `);

    const result = insert.run(
      req.user.id,
      title.trim(),
      description ? description.trim() : null,
      category,
      numQty,
      unit,
      dietary_class,
      allergensJson,
      unknownAllergens,
      preparation_time || null,
      storage_info || null,
      district,
      area,
      availFrom,
      collection_deadline,
      image_url || null,
      donor_reference ? donor_reference.trim() : null,
      numQty,
      now,
      now
    );

    const newId = Number(result.lastInsertRowid);

    activityService.log({
      userId: req.user.id,
      action: 'donation_created',
      entityType: 'donation',
      entityId: newId,
      details: { title, quantity: numQty, unit, district, area }
    });

    const created = db.prepare('SELECT * FROM donations WHERE id = ?').get(newId);
    created.declared_allergens = JSON.parse(created.declared_allergens);

    res.status(201).json({ message: 'Donation listed successfully', donation: created });
  } catch (err) {
    console.error('Create donation error:', err);
    res.status(500).json({ error: 'Failed to create donation listing.' });
  }
});

// Edit donation (Safeguarded against invalidating active reservations)
router.put('/:id', requireAuth, (req, res) => {
  try {
    const donation = db.prepare('SELECT * FROM donations WHERE id = ?').get(req.params.id);
    if (!donation) {
      return res.status(404).json({ error: 'Donation not found.' });
    }
    if (donation.donor_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized. You can only edit your own donations.' });
    }
    if (donation.status === 'Cancelled' || donation.status === 'Expired' || donation.status === 'Collected') {
      return res.status(400).json({ error: `Cannot edit donation with status '${donation.status}'.` });
    }

    const {
      title,
      description,
      category,
      quantity,
      unit,
      dietary_class,
      declared_allergens,
      has_unknown_allergens,
      preparation_time,
      storage_info,
      district,
      area,
      available_from,
      collection_deadline
    } = req.body;

    const numQty = quantity !== undefined ? parseFloat(quantity) : donation.quantity;
    if (isNaN(numQty) || numQty <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive number.' });
    }

    // Safeguard: Cannot reduce total quantity below currently reserved + collected amount
    const committedQuantity = donation.reserved_quantity + donation.collected_quantity;
    if (numQty < committedQuantity) {
      return res.status(400).json({
        error: `Cannot reduce total quantity to ${numQty} because ${committedQuantity} ${donation.unit} is already reserved or collected.`
      });
    }

    // Safeguard: Cannot change unit if active reservations exist
    if (unit && unit !== donation.unit && donation.reserved_quantity > 0) {
      return res.status(400).json({
        error: 'Cannot change unit when active reservations exist.'
      });
    }

    if (district && area && !isValidLocality(district, area)) {
      return res.status(400).json({ error: 'Invalid Kerala district and area.' });
    }

    const updatedAvailQty = numQty - committedQuantity;
    let newStatus = donation.status;
    if (donation.status === 'Available' || donation.status === 'Partially reserved' || donation.status === 'Fully reserved') {
      if (updatedAvailQty === 0 && donation.reserved_quantity > 0) {
        newStatus = 'Fully reserved';
      } else if (donation.reserved_quantity > 0) {
        newStatus = 'Partially reserved';
      } else {
        newStatus = 'Available';
      }
    }

    const allergensList = declared_allergens !== undefined ? (Array.isArray(declared_allergens) ? declared_allergens : []) : JSON.parse(donation.declared_allergens);
    const allergensJson = JSON.stringify(allergensList);
    const unknownAllergens = has_unknown_allergens !== undefined ? (has_unknown_allergens ? 1 : 0) : donation.has_unknown_allergens;

    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE donations SET
        title = ?, description = ?, category = ?, quantity = ?, unit = ?,
        dietary_class = ?, declared_allergens = ?, has_unknown_allergens = ?,
        preparation_time = ?, storage_info = ?, district = ?, area = ?,
        available_from = ?, collection_deadline = ?,
        available_quantity = ?, status = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      title ? title.trim() : donation.title,
      description !== undefined ? (description ? description.trim() : null) : donation.description,
      category || donation.category,
      numQty,
      unit || donation.unit,
      dietary_class || donation.dietary_class,
      allergensJson,
      unknownAllergens,
      preparation_time !== undefined ? preparation_time : donation.preparation_time,
      storage_info !== undefined ? storage_info : donation.storage_info,
      district || donation.district,
      area || donation.area,
      available_from || donation.available_from,
      collection_deadline || donation.collection_deadline,
      updatedAvailQty,
      newStatus,
      now,
      donation.id
    );

    activityService.log({
      userId: req.user.id,
      action: 'donation_updated',
      entityType: 'donation',
      entityId: donation.id,
      details: { quantity: numQty, status: newStatus }
    });

    const updated = db.prepare('SELECT * FROM donations WHERE id = ?').get(donation.id);
    updated.declared_allergens = JSON.parse(updated.declared_allergens);

    res.json({ message: 'Donation updated successfully', donation: updated });
  } catch (err) {
    console.error('Update donation error:', err);
    res.status(500).json({ error: 'Failed to update donation.' });
  }
});

// Cancel donation (safeguard: check active reservations)
router.post('/:id/cancel', requireAuth, (req, res) => {
  try {
    const donation = db.prepare('SELECT * FROM donations WHERE id = ?').get(req.params.id);
    if (!donation) {
      return res.status(404).json({ error: 'Donation not found.' });
    }
    if (donation.donor_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized. You can only cancel your own donations.' });
    }
    if (donation.status === 'Cancelled') {
      return res.status(400).json({ error: 'Donation is already cancelled.' });
    }

    // Check if there are active (pending or accepted) reservations
    const activeRes = db.prepare(`
      SELECT COUNT(*) as count FROM reservations
      WHERE donation_id = ? AND status IN ('pending', 'accepted')
    `).get(donation.id);

    if (activeRes.count > 0) {
      return res.status(400).json({
        error: `Cannot cancel this donation: it has ${activeRes.count} active reservation(s). Please reject or resolve active reservations first.`
      });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE donations SET
        status = 'Cancelled',
        available_quantity = 0,
        updated_at = ?
      WHERE id = ?
    `).run(now, donation.id);

    activityService.log({
      userId: req.user.id,
      action: 'donation_cancelled',
      entityType: 'donation',
      entityId: donation.id
    });

    res.json({ message: 'Donation cancelled successfully.' });
  } catch (err) {
    console.error('Cancel donation error:', err);
    res.status(500).json({ error: 'Failed to cancel donation.' });
  }
});

export default router;
