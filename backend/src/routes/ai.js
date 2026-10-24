import express from 'express';
import { geminiService } from '../services/geminiService.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { db } from '../config/db.js';

const router = express.Router();

router.get('/status', (req, res) => {
  res.json({
    configured: geminiService.isConfigured(),
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    fallbackAvailable: true
  });
});

/**
 * AI Feature D — Food Waste Insights (Section 15 Feature D)
 */
router.get('/waste-insights', optionalAuth, async (req, res) => {
  try {
    const totalDonations = db.prepare('SELECT COUNT(*) as count FROM donations').get().count;
    const totalRequests = db.prepare('SELECT COUNT(*) as count FROM food_requests').get().count;
    const totalCollected = db.prepare('SELECT COALESCE(SUM(quantity_collected), 0) as total FROM collection_records').get().total;

    const categoryStats = db.prepare(`
      SELECT category, COUNT(*) as count, SUM(available_quantity) as total_available
      FROM donations
      GROUP BY category
    `).all();

    const localityStats = db.prepare(`
      SELECT district, area, COUNT(*) as count
      FROM donations
      GROUP BY district, area
      ORDER BY count DESC
      LIMIT 5
    `).all();

    const insights = await geminiService.analyzeWasteInsights({
      totalDonations,
      totalRequests,
      totalCollected,
      categoryStats,
      localityStats
    });

    res.json(insights);
  } catch (err) {
    console.error('AI waste insights error:', err);
    res.status(500).json({ error: 'Failed to generate waste insights.' });
  }
});

router.post('/parse-description', rateLimiter({ max: 20 }), optionalAuth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text or speech transcript is required.' });
    }

    const result = await geminiService.parseFoodDescription(text.trim());
    res.json(result);
  } catch (err) {
    console.error('AI parse description error:', err);
    res.status(500).json({ error: 'Failed to parse food description.' });
  }
});

router.post('/explain-match', rateLimiter({ max: 30 }), optionalAuth, async (req, res) => {
  try {
    const { matchInfo } = req.body;
    if (!matchInfo || !matchInfo.reasons) {
      return res.status(400).json({ error: 'Match data is required.' });
    }

    const explanation = await geminiService.explainMatch(matchInfo);
    res.json({ explanation });
  } catch (err) {
    console.error('AI explain match error:', err);
    res.status(500).json({ error: 'Failed to generate match explanation.' });
  }
});

export default router;
