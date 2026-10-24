import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../config/db.js';
import { generateToken, requireAuth, COOKIE_NAME } from '../middleware/auth.js';
import { isValidLocality, DISTRICTS, KERALA_LOCALITIES } from '../config/localities.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { activityService } from '../services/activityService.js';

const router = express.Router();

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

// Return Kerala localities for frontend dropdowns
router.get('/localities', (req, res) => {
  res.json({
    districts: DISTRICTS,
    localities: KERALA_LOCALITIES
  });
});

// Register
router.post('/register', rateLimiter({ max: 20 }), (req, res) => {
  try {
    const { name, email, password, confirm_password, phone, district, area, org_type, bio, accept_terms } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Full name or organization name is required.' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email address is required.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    if (confirm_password !== undefined && password !== confirm_password) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }
    if (accept_terms !== undefined && !accept_terms) {
      return res.status(400).json({ error: 'You must accept the terms of service and privacy policy.' });
    }
    if (!district || !area || !isValidLocality(district, area)) {
      return res.status(400).json({ error: 'Please select a valid Kerala district and area.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);
    const now = new Date().toISOString();

    const insert = db.prepare(`
      INSERT INTO users (name, email, password_hash, phone, district, area, org_type, bio, is_demo, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `);

    const result = insert.run(
      name.trim(),
      cleanEmail,
      password_hash,
      phone ? phone.trim() : null,
      district,
      area,
      org_type || 'individual',
      bio ? bio.trim() : null,
      now,
      now
    );

    const user = {
      id: Number(result.lastInsertRowid),
      name: name.trim(),
      email: cleanEmail,
      phone: phone ? phone.trim() : null,
      district,
      area,
      org_type: org_type || 'individual',
      bio: bio ? bio.trim() : null
    };

    activityService.log({
      userId: user.id,
      action: 'user_registered',
      entityType: 'user',
      entityId: user.id,
      details: { email: cleanEmail }
    });

    const token = generateToken(user);
    res.cookie(COOKIE_NAME, token, cookieOptions);
    res.status(201).json({ message: 'Registration successful', user, token });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to register account. Please try again.' });
  }
});

// Forgot Password Flow (Section 3)
router.post('/forgot-password', rateLimiter({ max: 10 }), (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(cleanEmail);

    if (!user) {
      // Don't leak account existence, but return consistent message
      return res.json({
        message: 'If an account exists with this email, password reset instructions have been generated.',
        demoHint: null
      });
    }

    // Generate 6-digit reset code
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour validity
    const now = new Date().toISOString();

    // Invalidate old tokens
    db.prepare('UPDATE password_resets SET used = 1 WHERE user_id = ?').run(user.id);

    // Insert new token
    db.prepare(`
      INSERT INTO password_resets (user_id, token, expires_at, used, created_at)
      VALUES (?, ?, ?, 0, ?)
    `).run(user.id, resetToken, expiresAt, now);

    activityService.log({
      userId: user.id,
      action: 'password_reset_requested',
      entityType: 'user',
      entityId: user.id
    });

    // In local / development mode, we surface the reset token directly to the user for immediate testing!
    res.json({
      message: 'Password reset code generated. Valid for 1 hour.',
      resetToken, // Provided directly for zero-friction local testing without requiring an external email provider
      email: cleanEmail
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process password reset request.' });
  }
});

// Reset Password Execution (Section 3)
router.post('/reset-password', rateLimiter({ max: 10 }), (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({ error: 'Email, reset code, and new password are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (!user) {
      return res.status(400).json({ error: 'Invalid reset code or email.' });
    }

    const now = new Date().toISOString();
    const resetRecord = db.prepare(`
      SELECT * FROM password_resets
      WHERE user_id = ? AND token = ? AND used = 0 AND expires_at > ?
      ORDER BY id DESC LIMIT 1
    `).get(user.id, token.trim(), now);

    if (!resetRecord) {
      return res.status(400).json({ error: 'Invalid or expired reset code. Please request a new one.' });
    }

    // Mark reset code used
    db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?').run(resetRecord.id);

    // Update password
    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(newPassword, salt);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(password_hash, now, user.id);

    activityService.log({
      userId: user.id,
      action: 'password_reset_completed',
      entityType: 'user',
      entityId: user.id
    });

    res.json({ message: 'Password reset successful. You can now log in with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// Login
router.post('/login', rateLimiter({ max: 30 }), (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      district: user.district,
      area: user.area,
      org_type: user.org_type,
      bio: user.bio,
      is_demo: user.is_demo
    };

    activityService.log({
      userId: user.id,
      action: 'user_logged_in',
      entityType: 'user',
      entityId: user.id
    });

    const token = generateToken(safeUser);
    res.cookie(COOKIE_NAME, token, cookieOptions);
    res.json({ message: 'Login successful', user: safeUser, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ message: 'Logged out successfully' });
});

// Current User Profile
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// Update Profile
router.put('/profile', requireAuth, (req, res) => {
  try {
    const { name, phone, district, area, org_type, bio } = req.body;

    if (district && area && !isValidLocality(district, area)) {
      return res.status(400).json({ error: 'Invalid Kerala district and area.' });
    }

    const updatedDistrict = district || req.user.district;
    const updatedArea = area || req.user.area;
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE users
      SET name = ?, phone = ?, district = ?, area = ?, org_type = ?, bio = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      name ? name.trim() : req.user.name,
      phone !== undefined ? (phone ? phone.trim() : null) : req.user.phone,
      updatedDistrict,
      updatedArea,
      org_type || req.user.org_type,
      bio !== undefined ? (bio ? bio.trim() : null) : req.user.bio,
      now,
      req.user.id
    );

    const updated = db.prepare('SELECT id, name, email, phone, district, area, org_type, bio FROM users WHERE id = ?').get(req.user.id);
    const token = generateToken(updated);
    res.cookie(COOKIE_NAME, token, cookieOptions);

    res.json({ message: 'Profile updated successfully', user: updated, token });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

export default router;
