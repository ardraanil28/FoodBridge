import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { notificationService } from '../services/notificationService.js';

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const notifications = notificationService.getUserNotifications(req.user.id, limit);
    res.json({ notifications });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
});

router.get('/unread-count', requireAuth, (req, res) => {
  try {
    const count = notificationService.getUnreadCount(req.user.id);
    res.json({ count });
  } catch (err) {
    console.error('Error fetching unread count:', err);
    res.status(500).json({ error: 'Failed to retrieve unread count.' });
  }
});

router.post('/:id/read', requireAuth, (req, res) => {
  try {
    notificationService.markAsRead(Number(req.params.id), req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking notification read:', err);
    res.status(500).json({ error: 'Failed to mark notification as read.' });
  }
});

router.post('/read-all', requireAuth, (req, res) => {
  try {
    notificationService.markAllAsRead(req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking all notifications read:', err);
    res.status(500).json({ error: 'Failed to mark all as read.' });
  }
});

export default router;
