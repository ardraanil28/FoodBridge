import express from 'express';
import { db } from '../config/db.js';
import { optionalAuth } from '../middleware/auth.js';
import { activityService } from '../services/activityService.js';
import { scheduler } from '../services/scheduler.js';

const router = express.Router();

router.get('/metrics', optionalAuth, (req, res) => {
  try {
    scheduler.runChecks();

    // Summary counts
    const activeDonations = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(available_quantity), 0) as available_qty
      FROM donations
      WHERE status IN ('Available', 'Partially reserved')
    `).get();

    const openRequests = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(outstanding_quantity), 0) as outstanding_qty
      FROM food_requests
      WHERE status IN ('Open', 'Partially fulfilled', 'Partially matched')
    `).get();

    const pendingReservations = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(quantity), 0) as pending_qty
      FROM reservations
      WHERE status = 'pending'
    `).get();

    // Verified collected impact (only confirmed collections)
    const verifiedImpact = db.prepare(`
      SELECT
        COALESCE(SUM(quantity_collected), 0) as total_collected_portions,
        COUNT(DISTINCT request_id) as requests_served,
        COUNT(DISTINCT donor_id) as active_donors_count,
        COUNT(*) as total_deliveries
      FROM collection_records
    `).get();

    // Requests completely fulfilled
    const fulfilledRequests = db.prepare(`
      SELECT COUNT(*) as count
      FROM food_requests
      WHERE status = 'Fulfilled'
    `).get();

    // Total listed food across all time
    const totalListed = db.prepare(`
      SELECT COALESCE(SUM(quantity), 0) as total_listed_qty FROM donations
    `).get();

    // Total reserved food currently committed
    const totalReserved = db.prepare(`
      SELECT COALESCE(SUM(reserved_quantity), 0) as total_reserved_qty FROM donations
    `).get();

    // Breakdown by demo vs user records
    const demoVsUser = db.prepare(`
      SELECT 
        SUM(CASE WHEN is_demo = 1 THEN 1 ELSE 0 END) as demo_donations,
        SUM(CASE WHEN is_demo = 0 THEN 1 ELSE 0 END) as user_donations
      FROM donations
    `).get();

    // Category breakdown of available donations
    const categoryStats = db.prepare(`
      SELECT category, COUNT(*) as count, SUM(available_quantity) as total_available
      FROM donations
      WHERE status IN ('Available', 'Partially reserved')
      GROUP BY category
    `).all();

    // Recent activity log
    const recentActivity = activityService.getRecent(10);

    res.json({
      activeDonationsCount: activeDonations.count,
      availableFoodQuantity: activeDonations.available_qty,
      openRequestsCount: openRequests.count,
      outstandingFoodQuantity: openRequests.outstanding_qty,
      pendingReservationsCount: pendingReservations.count,
      totalListedQuantity: totalListed.total_listed_qty,
      totalReservedQuantity: totalReserved.total_reserved_qty,
      verifiedCollectedQuantity: verifiedImpact.total_collected_portions,
      requestsFulfilledCount: fulfilledRequests.count,
      activeDonorsCount: verifiedImpact.active_donors_count,
      totalCompletedDeliveries: verifiedImpact.total_deliveries,
      demoVsUserBreakdown: {
        demoDonations: demoVsUser.demo_donations || 0,
        userDonations: demoVsUser.user_donations || 0
      },
      categoryStats,
      recentActivity
    });
  } catch (err) {
    console.error('Impact metrics error:', err);
    res.status(500).json({ error: 'Failed to retrieve impact metrics.' });
  }
});

export default router;
