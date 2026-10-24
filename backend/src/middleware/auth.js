import jwt from 'jsonwebtoken';
import { db } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'foodbridge-dev-secret-key-2026-safe-random-bytes';
const COOKIE_NAME = 'foodbridge_token';

export { JWT_SECRET, COOKIE_NAME };

/**
 * Generate JWT token
 */
export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      district: user.district,
      area: user.area,
      org_type: user.org_type
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Express middleware to require authentication.
 * Checks httpOnly cookie first, then Bearer Authorization header.
 */
export function requireAuth(req, res, next) {
  let token = req.cookies?.[COOKIE_NAME];

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Verify user still exists in DB
    const userStmt = db.prepare('SELECT id, name, email, phone, district, area, org_type, bio FROM users WHERE id = ?');
    const user = userStmt.get(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User account not found.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

/**
 * Optional authentication: if token is present and valid, attaches user; otherwise req.user is null.
 */
export function optionalAuth(req, res, next) {
  let token = req.cookies?.[COOKIE_NAME];
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userStmt = db.prepare('SELECT id, name, email, phone, district, area, org_type, bio FROM users WHERE id = ?');
    req.user = userStmt.get(decoded.id) || null;
  } catch {
    req.user = null;
  }
  next();
}
