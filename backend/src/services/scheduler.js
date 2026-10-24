import cron from 'node-cron';
import { db, runInTransaction } from '../config/db.js';
import { notificationService } from './notificationService.js';

export const scheduler = {
  /**
   * Run all maintenance tasks: expiry, uncollected release, and deadline warnings.
   * Can be called periodically by node-cron or lazily on reads.
   */
  runChecks() {
    try {
      const now = new Date();
      const nowIso = now.toISOString();

      // 1. Expire donations past collection_deadline
      runInTransaction(() => {
        const expiredDonations = db.prepare(`
          SELECT id, donor_id, title, collection_deadline, reserved_quantity
          FROM donations
          WHERE status IN ('Available', 'Partially reserved')
            AND collection_deadline <= ?
        `).all(nowIso);

        for (const don of expiredDonations) {
          const newStatus = don.reserved_quantity > 0 ? 'Partially reserved' : 'Expired';
          db.prepare(`
            UPDATE donations SET
              available_quantity = 0,
              status = ?,
              updated_at = ?
            WHERE id = ?
          `).run(newStatus, nowIso, don.id);

          notificationService.create({
            userId: don.donor_id,
            type: 'system',
            message: `Your donation listing "${don.title}" has passed its collection deadline.`,
            referenceType: 'donation',
            referenceId: don.id,
            link: `/donations/${don.id}`,
            uniqueKey: `don_expired_${don.id}`
          });
        }

        // 2. Expire food requests past needed_by
        const expiredRequests = db.prepare(`
          SELECT id, requester_id, title, needed_by, reserved_quantity
          FROM food_requests
          WHERE status IN ('Open', 'Partially matched', 'Partially fulfilled')
            AND needed_by <= ?
        `).all(nowIso);

        for (const req of expiredRequests) {
          const newStatus = req.reserved_quantity > 0 ? 'Partially fulfilled' : 'Expired';
          db.prepare(`
            UPDATE food_requests SET
              outstanding_quantity = 0,
              status = ?,
              updated_at = ?
            WHERE id = ?
          `).run(newStatus, nowIso, req.id);

          notificationService.create({
            userId: req.requester_id,
            type: 'system',
            message: `Your food request "${req.title}" has passed its needed-by deadline.`,
            referenceType: 'request',
            referenceId: req.id,
            link: `/requests/${req.id}`,
            uniqueKey: `req_expired_${req.id}`
          });
        }

        // 3. Section 9 Uncollected Quantity Rule for past-deadline reservations
        const pastDeadlineReservations = db.prepare(`
          SELECT r.*, d.collection_deadline, d.available_quantity as don_avail, d.reserved_quantity as don_res
          FROM reservations r
          JOIN donations d ON r.donation_id = d.id
          WHERE r.status IN ('accepted', 'partially_collected')
            AND d.collection_deadline <= ?
        `).all(nowIso);

        for (const res of pastDeadlineReservations) {
          const uncollected = res.quantity - res.collected_quantity;
          if (uncollected > 0) {
            db.prepare(`
              UPDATE reservations SET
                uncollected_quantity = ?,
                status = 'completed',
                updated_at = ?
              WHERE id = ?
            `).run(uncollected, nowIso, res.id);

            // Clean up donation reserved quantity
            const newDonRes = Math.max(0, res.don_res - uncollected);
            db.prepare(`
              UPDATE donations SET
                reserved_quantity = ?,
                updated_at = ?
              WHERE id = ?
            `).run(newDonRes, nowIso, res.donation_id);

            notificationService.create({
              userId: res.requester_id,
              type: 'system',
              message: `Collection window closed for reservation #${res.id}. ${uncollected} uncollected portions marked expired.`,
              referenceType: 'reservation',
              referenceId: res.id,
              link: `/reservations/${res.id}`,
              uniqueKey: `res_uncollected_exp_${res.id}`
            });
          }
        }

        // 4. Deadline Approaching Notifications (60-minute window)
        const inOneHour = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
        const urgentDonations = db.prepare(`
          SELECT id, donor_id, title, collection_deadline
          FROM donations
          WHERE status IN ('Available', 'Partially reserved')
            AND collection_deadline > ?
            AND collection_deadline <= ?
        `).all(nowIso, inOneHour);

        for (const don of urgentDonations) {
          notificationService.create({
            userId: don.donor_id,
            type: 'deadline_approaching',
            message: `Reminder: Collection deadline for "${don.title}" expires in under 60 minutes!`,
            referenceType: 'donation',
            referenceId: don.id,
            link: `/donations/${don.id}`,
            uniqueKey: `deadline_warn_don_${don.id}`
          });
        }
      });
    } catch (err) {
      console.error('Error in scheduler runChecks:', err);
    }
  },

  /**
   * Start cron job (runs every minute)
   */
  start() {
    // Run once immediately on start
    this.runChecks();

    // Schedule to run every minute
    cron.schedule('* * * * *', () => {
      this.runChecks();
    });
  }
};
