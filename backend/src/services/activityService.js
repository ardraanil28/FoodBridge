import { db } from '../config/db.js';

export const activityService = {
  log({ userId = null, action, entityType, entityId = null, details = null }) {
    try {
      const now = new Date().toISOString();
      const detailsStr = details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null;
      const stmt = db.prepare(`
        INSERT INTO activity_log (user_id, action, entity_type, entity_id, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(userId, action, entityType, entityId, detailsStr, now);
    } catch (err) {
      console.error('Error logging activity:', err);
    }
  },

  getRecent(limit = 20) {
    const stmt = db.prepare(`
      SELECT a.*, u.name as user_name
      FROM activity_log a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.id DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  }
};
