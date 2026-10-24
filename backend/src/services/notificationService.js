import { db } from '../config/db.js';

export const notificationService = {
  /**
   * Create a notification.
   * If uniqueKey is provided, uses INSERT OR IGNORE to prevent duplicate notifications.
   */
  create({ userId, type, message, referenceType = null, referenceId = null, link = null, uniqueKey = null }) {
    const now = new Date().toISOString();
    try {
      if (uniqueKey) {
        const stmt = db.prepare(`
          INSERT OR IGNORE INTO notifications 
          (user_id, type, message, reference_type, reference_id, link, unique_key, is_read, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
        `);
        return stmt.run(userId, type, message, referenceType, referenceId, link, uniqueKey, now);
      } else {
        const stmt = db.prepare(`
          INSERT INTO notifications 
          (user_id, type, message, reference_type, reference_id, link, unique_key, is_read, created_at)
          VALUES (?, ?, ?, ?, ?, ?, NULL, 0, ?)
        `);
        return stmt.run(userId, type, message, referenceType, referenceId, link, now);
      }
    } catch (err) {
      console.error('Error creating notification:', err);
      return null;
    }
  },

  /**
   * Get notifications for a user, newest first.
   */
  getUserNotifications(userId, limit = 50) {
    const stmt = db.prepare(`
      SELECT id, type, message, reference_type, reference_id, link, is_read, created_at
      FROM notifications
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT ?
    `);
    return stmt.all(userId, limit);
  },

  /**
   * Get unread count for user
   */
  getUnreadCount(userId) {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0');
    const result = stmt.get(userId);
    return result ? result.count : 0;
  },

  /**
   * Mark single notification as read
   */
  markAsRead(notificationId, userId) {
    const stmt = db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?');
    return stmt.run(notificationId, userId);
  },

  /**
   * Mark all notifications as read for a user
   */
  markAllAsRead(userId) {
    const stmt = db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?');
    return stmt.run(userId);
  }
};
