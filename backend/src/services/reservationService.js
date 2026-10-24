import { db, runInTransaction } from '../config/db.js';
import { notificationService } from './notificationService.js';
import { activityService } from './activityService.js';
import crypto from 'node:crypto';

export const reservationService = {
  /**
   * Create reservations (single donation or multi-donor combination batch)
   * All executed within a single atomic SQLite transaction.
   */
  createReservations({ requestId, requesterId, items, requesterNotes = '' }) {
    return runInTransaction(() => {
      const now = new Date().toISOString();
      const groupId = `grp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      // Check request
      const request = db.prepare('SELECT * FROM food_requests WHERE id = ?').get(requestId);
      if (!request) {
        throw new Error('Food request not found.');
      }
      if (request.requester_id !== requesterId) {
        throw new Error('Unauthorized: You can only create reservations for your own requests.');
      }
      if (['Fulfilled', 'Cancelled', 'Expired'].includes(request.status)) {
        throw new Error(`Cannot reserve for request with status '${request.status}'.`);
      }

      let totalRequestedBatch = 0;
      const createdReservations = [];

      for (const item of items) {
        const donationId = Number(item.donationId || item.donation_id);
        const quantity = parseFloat(item.quantity);

        if (isNaN(quantity) || quantity <= 0) {
          throw new Error('Reservation quantity must be greater than zero.');
        }

        // Fetch donation with lock check
        const donation = db.prepare('SELECT * FROM donations WHERE id = ?').get(donationId);
        if (!donation) {
          throw new Error(`Donation listing #${donationId} not found.`);
        }
        if (donation.donor_id === requesterId) {
          throw new Error(`Cannot reserve your own donation '${donation.title}'.`);
        }
        if (!['Available', 'Partially reserved'].includes(donation.status)) {
          throw new Error(`Donation '${donation.title}' is no longer available.`);
        }
        if (new Date(donation.collection_deadline) <= new Date()) {
          throw new Error(`Donation '${donation.title}' collection deadline has already passed.`);
        }
        if (donation.available_quantity < quantity) {
          throw new Error(`Insufficient quantity for '${donation.title}'. Requested: ${quantity}, Available: ${donation.available_quantity}.`);
        }

        // Deduct available quantity and increase reserved quantity
        const newDonAvail = donation.available_quantity - quantity;
        const newDonReserved = donation.reserved_quantity + quantity;
        const newDonStatus = newDonAvail === 0 ? 'Fully reserved' : 'Partially reserved';

        db.prepare(`
          UPDATE donations SET
            available_quantity = ?,
            reserved_quantity = ?,
            status = ?,
            updated_at = ?
          WHERE id = ?
        `).run(newDonAvail, newDonReserved, newDonStatus, now, donationId);

        // Record allocation
        const allocInsert = db.prepare(`
          INSERT INTO allocations (request_id, donation_id, allocated_quantity, collected_quantity, status, created_at, updated_at)
          VALUES (?, ?, ?, 0, 'reserved', ?, ?)
        `);
        const allocResult = allocInsert.run(requestId, donationId, quantity, now, now);
        const allocationId = Number(allocResult.lastInsertRowid);

        // Create reservation entry
        const resInsert = db.prepare(`
          INSERT INTO reservations (
            reservation_group_id, request_id, donation_id, requester_id, donor_id,
            allocation_id, quantity, collected_quantity, uncollected_quantity,
            status, requester_notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 'pending', ?, ?, ?)
        `);
        const resResult = resInsert.run(
          groupId,
          requestId,
          donationId,
          requesterId,
          donation.donor_id,
          allocationId,
          quantity,
          requesterNotes,
          now,
          now
        );
        const reservationId = Number(resResult.lastInsertRowid);

        createdReservations.push({
          id: reservationId,
          groupId,
          donationId,
          donationTitle: donation.title,
          donorId: donation.donor_id,
          quantity,
          unit: donation.unit
        });

        totalRequestedBatch += quantity;

        // Notify donor
        notificationService.create({
          userId: donation.donor_id,
          type: 'reservation_received',
          message: `New reservation request for ${quantity} ${donation.unit} of "${donation.title}".`,
          referenceType: 'reservation',
          referenceId: reservationId,
          link: `/reservations/${reservationId}`
        });

        // Log activity
        activityService.log({
          userId: requesterId,
          action: 'reservation_requested',
          entityType: 'reservation',
          entityId: reservationId,
          details: { donationId, quantity, unit: donation.unit }
        });
      }

      // Update request reserved and outstanding quantities
      const newReqReserved = request.reserved_quantity + totalRequestedBatch;
      const newReqOutstanding = Math.max(0, request.outstanding_quantity - totalRequestedBatch);
      const newReqStatus = newReqOutstanding === 0 ? 'Fully reserved' : 'Partially fulfilled';

      db.prepare(`
        UPDATE food_requests SET
          reserved_quantity = ?,
          outstanding_quantity = ?,
          status = ?,
          updated_at = ?
        WHERE id = ?
      `).run(newReqReserved, newReqOutstanding, newReqStatus, now, requestId);

      return {
        groupId,
        reservations: createdReservations,
        totalReserved: totalRequestedBatch,
        requestStatus: newReqStatus
      };
    });
  },

  /**
   * Donor accepts a reservation
   */
  acceptReservation(reservationId, donorId, notes = '') {
    return runInTransaction(() => {
      const now = new Date().toISOString();
      const res = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId);
      if (!res) throw new Error('Reservation not found.');
      if (res.donor_id !== donorId) throw new Error('Unauthorized: You are not the donor for this reservation.');
      if (res.status !== 'pending') throw new Error(`Cannot accept reservation with status '${res.status}'.`);

      db.prepare(`
        UPDATE reservations SET
          status = 'accepted',
          donor_notes = ?,
          updated_at = ?
        WHERE id = ?
      `).run(notes || null, now, reservationId);

      if (res.allocation_id) {
        db.prepare("UPDATE allocations SET status = 'accepted', updated_at = ? WHERE id = ?").run(now, res.allocation_id);
      }

      const donation = db.prepare('SELECT title, unit FROM donations WHERE id = ?').get(res.donation_id);

      // Notify recipient that reservation is accepted and contact info is unlocked
      notificationService.create({
        userId: res.requester_id,
        type: 'reservation_accepted',
        message: `Your reservation for ${res.quantity} ${donation.unit} of "${donation.title}" was accepted! Pickup details are now available.`,
        referenceType: 'reservation',
        referenceId: reservationId,
        link: `/reservations/${reservationId}`
      });

      activityService.log({
        userId: donorId,
        action: 'reservation_accepted',
        entityType: 'reservation',
        entityId: reservationId
      });

      return { success: true, message: 'Reservation accepted.' };
    });
  },

  /**
   * Donor rejects a reservation (safely releases quantities)
   */
  rejectReservation(reservationId, donorId, reason = '') {
    return runInTransaction(() => {
      const now = new Date().toISOString();
      const res = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId);
      if (!res) throw new Error('Reservation not found.');
      if (res.donor_id !== donorId) throw new Error('Unauthorized: You are not the donor for this reservation.');
      if (res.status !== 'pending') throw new Error(`Cannot reject reservation with status '${res.status}'.`);

      // Release quantity back to donation
      const donation = db.prepare('SELECT * FROM donations WHERE id = ?').get(res.donation_id);
      if (donation) {
        const releasedAvail = donation.available_quantity + res.quantity;
        const releasedRes = Math.max(0, donation.reserved_quantity - res.quantity);
        let newDonStatus = donation.status;
        if (['Available', 'Partially reserved', 'Fully reserved'].includes(donation.status)) {
          newDonStatus = releasedRes > 0 ? 'Partially reserved' : 'Available';
        }
        db.prepare(`
          UPDATE donations SET
            available_quantity = ?,
            reserved_quantity = ?,
            status = ?,
            updated_at = ?
          WHERE id = ?
        `).run(releasedAvail, releasedRes, newDonStatus, now, res.donation_id);
      }

      // Release quantity back to request
      const request = db.prepare('SELECT * FROM food_requests WHERE id = ?').get(res.request_id);
      if (request) {
        const reqRes = Math.max(0, request.reserved_quantity - res.quantity);
        const reqOut = request.outstanding_quantity + res.quantity;
        let newReqStatus = request.status;
        if (['Open', 'Partially fulfilled', 'Fully reserved'].includes(request.status)) {
          newReqStatus = reqRes > 0 ? 'Partially fulfilled' : 'Open';
        }
        db.prepare(`
          UPDATE food_requests SET
            reserved_quantity = ?,
            outstanding_quantity = ?,
            status = ?,
            updated_at = ?
          WHERE id = ?
        `).run(reqRes, reqOut, newReqStatus, now, res.request_id);
      }

      // Update reservation status
      db.prepare(`
        UPDATE reservations SET
          status = 'rejected',
          donor_notes = ?,
          updated_at = ?
        WHERE id = ?
      `).run(reason || 'Declined by donor', now, reservationId);

      if (res.allocation_id) {
        db.prepare("UPDATE allocations SET status = 'rejected', updated_at = ? WHERE id = ?").run(now, res.allocation_id);
      }

      // Notify recipient
      notificationService.create({
        userId: res.requester_id,
        type: 'reservation_rejected',
        message: `Your reservation request for "${donation ? donation.title : 'food'}" was declined by the donor.`,
        referenceType: 'reservation',
        referenceId: reservationId,
        link: `/reservations/${reservationId}`
      });

      activityService.log({
        userId: donorId,
        action: 'reservation_rejected',
        entityType: 'reservation',
        entityId: reservationId,
        details: { reason }
      });

      return { success: true, message: 'Reservation rejected and quantity safely released.' };
    });
  },

  /**
   * Cancel reservation (before collection)
   */
  cancelReservation(reservationId, userId, reason = '') {
    return runInTransaction(() => {
      const now = new Date().toISOString();
      const res = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId);
      if (!res) throw new Error('Reservation not found.');
      if (res.requester_id !== userId && res.donor_id !== userId) {
        throw new Error('Unauthorized: You can only cancel your own reservations.');
      }
      if (!['pending', 'accepted'].includes(res.status)) {
        throw new Error(`Cannot cancel reservation with status '${res.status}'.`);
      }

      // Release quantities back
      const donation = db.prepare('SELECT * FROM donations WHERE id = ?').get(res.donation_id);
      if (donation) {
        const releasedAvail = donation.available_quantity + res.quantity;
        const releasedRes = Math.max(0, donation.reserved_quantity - res.quantity);
        let newDonStatus = donation.status;
        if (['Available', 'Partially reserved', 'Fully reserved'].includes(donation.status)) {
          newDonStatus = releasedRes > 0 ? 'Partially reserved' : 'Available';
        }
        db.prepare(`
          UPDATE donations SET
            available_quantity = ?,
            reserved_quantity = ?,
            status = ?,
            updated_at = ?
          WHERE id = ?
        `).run(releasedAvail, releasedRes, newDonStatus, now, res.donation_id);
      }

      const request = db.prepare('SELECT * FROM food_requests WHERE id = ?').get(res.request_id);
      if (request) {
        const reqRes = Math.max(0, request.reserved_quantity - res.quantity);
        const reqOut = request.outstanding_quantity + res.quantity;
        let newReqStatus = request.status;
        if (['Open', 'Partially fulfilled', 'Fully reserved'].includes(request.status)) {
          newReqStatus = reqRes > 0 ? 'Partially fulfilled' : 'Open';
        }
        db.prepare(`
          UPDATE food_requests SET
            reserved_quantity = ?,
            outstanding_quantity = ?,
            status = ?,
            updated_at = ?
          WHERE id = ?
        `).run(reqRes, reqOut, newReqStatus, now, res.request_id);
      }

      db.prepare(`
        UPDATE reservations SET
          status = 'cancelled',
          requester_notes = ?,
          updated_at = ?
        WHERE id = ?
      `).run(reason || 'Cancelled by user', now, reservationId);

      if (res.allocation_id) {
        db.prepare("UPDATE allocations SET status = 'cancelled', updated_at = ? WHERE id = ?").run(now, res.allocation_id);
      }

      const otherPartyId = (userId === res.requester_id) ? res.donor_id : res.requester_id;
      notificationService.create({
        userId: otherPartyId,
        type: 'reservation_cancelled',
        message: `Reservation #${reservationId} for "${donation ? donation.title : 'food'}" was cancelled.`,
        referenceType: 'reservation',
        referenceId: reservationId,
        link: `/reservations/${reservationId}`
      });

      activityService.log({
        userId,
        action: 'reservation_cancelled',
        entityType: 'reservation',
        entityId: reservationId,
        details: { reason }
      });

      return { success: true, message: 'Reservation cancelled and quantities restored.' };
    });
  },

  /**
   * Confirm collection (Section 9 & 10)
   * Supports partial collection: e.g. reserved 20, collected 12, not collected 8.
   */
  confirmCollection({ reservationId, collectorUserId, quantityCollected, isFinal = true, notes = '' }) {
    return runInTransaction(() => {
      const now = new Date().toISOString();
      const res = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId);
      if (!res) throw new Error('Reservation not found.');
      if (res.donor_id !== collectorUserId && res.requester_id !== collectorUserId) {
        throw new Error('Unauthorized: Only donor or requester can confirm collection.');
      }
      if (!['accepted', 'partially_collected'].includes(res.status)) {
        throw new Error(`Cannot collect reservation in status '${res.status}'.`);
      }

      const qty = parseFloat(quantityCollected);
      if (isNaN(qty) || qty <= 0) {
        throw new Error('Quantity collected must be greater than zero.');
      }

      const previouslyCollected = res.collected_quantity || 0;
      const remainingReserved = res.quantity - previouslyCollected;

      if (qty > remainingReserved) {
        throw new Error(`Collected quantity (${qty}) exceeds remaining reserved quantity (${remainingReserved}).`);
      }

      const newTotalCollected = previouslyCollected + qty;
      const uncollected = res.quantity - newTotalCollected;
      const isComplete = uncollected === 0 || isFinal;

      // Create collection record
      const crInsert = db.prepare(`
        INSERT INTO collection_records (
          reservation_id, request_id, donation_id, collector_id, donor_id,
          quantity_collected, uncollected_released, collected_at, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      crInsert.run(
        reservationId,
        res.request_id,
        res.donation_id,
        collectorUserId,
        res.donor_id,
        qty,
        isFinal ? uncollected : 0,
        now,
        notes || null,
        now
      );

      // Update reservation
      const newResStatus = uncollected === 0 ? 'completed' : (isFinal ? 'completed' : 'partially_collected');
      db.prepare(`
        UPDATE reservations SET
          collected_quantity = ?,
          uncollected_quantity = ?,
          status = ?,
          updated_at = ?
        WHERE id = ?
      `).run(newTotalCollected, uncollected, newResStatus, now, reservationId);

      // Update donation record:
      // reserved_quantity decreases by collected amount.
      // collected_quantity increases by collected amount.
      // If final and uncollected > 0: release uncollected back to available if window is still open!
      const donation = db.prepare('SELECT * FROM donations WHERE id = ?').get(res.donation_id);
      if (donation) {
        let newDonAvail = donation.available_quantity;
        let newDonReserved = Math.max(0, donation.reserved_quantity - qty);
        let newDonCollected = donation.collected_quantity + qty;

        if (isFinal && uncollected > 0) {
          // If window is still open, release uncollected back to available
          const isStillOpen = new Date(donation.collection_deadline) > new Date();
          if (isStillOpen) {
            newDonAvail += uncollected;
          }
          newDonReserved = Math.max(0, newDonReserved - uncollected);
        }

        let newDonStatus = donation.status;
        if (newDonAvail === 0 && newDonReserved === 0 && newDonCollected > 0) {
          newDonStatus = 'Collected';
        } else if (newDonReserved > 0) {
          newDonStatus = 'Partially reserved';
        } else if (newDonAvail > 0) {
          newDonStatus = 'Available';
        } else {
          newDonStatus = 'Collected';
        }

        db.prepare(`
          UPDATE donations SET
            available_quantity = ?,
            reserved_quantity = ?,
            collected_quantity = ?,
            status = ?,
            updated_at = ?
          WHERE id = ?
        `).run(newDonAvail, newDonReserved, newDonCollected, newDonStatus, now, res.donation_id);
      }

      // Update food request record
      const request = db.prepare('SELECT * FROM food_requests WHERE id = ?').get(res.request_id);
      if (request) {
        let newReqReserved = Math.max(0, request.reserved_quantity - qty);
        let newReqCollected = request.collected_quantity + qty;
        let newReqOutstanding = request.outstanding_quantity;

        if (isFinal && uncollected > 0) {
          newReqReserved = Math.max(0, newReqReserved - uncollected);
          newReqOutstanding += uncollected; // Still needed!
        }

        let newReqStatus = request.status;
        if (newReqCollected >= request.quantity) {
          newReqStatus = 'Fulfilled';
        } else if (newReqCollected > 0) {
          newReqStatus = newReqReserved > 0 ? 'Partially collected' : 'Partially fulfilled';
        }

        db.prepare(`
          UPDATE food_requests SET
            reserved_quantity = ?,
            collected_quantity = ?,
            outstanding_quantity = ?,
            status = ?,
            updated_at = ?
          WHERE id = ?
        `).run(newReqReserved, newReqCollected, newReqOutstanding, newReqStatus, now, res.request_id);
      }

      // Notify the other party
      const notifyTarget = (collectorUserId === res.donor_id) ? res.requester_id : res.donor_id;
      notificationService.create({
        userId: notifyTarget,
        type: 'collection_confirmed',
        message: `Collection confirmed: ${qty} ${donation ? donation.unit : 'items'} recorded. (Total collected: ${newTotalCollected}, Uncollected: ${uncollected})`,
        referenceType: 'reservation',
        referenceId: reservationId,
        link: `/reservations/${reservationId}`
      });

      activityService.log({
        userId: collectorUserId,
        action: 'collection_confirmed',
        entityType: 'reservation',
        entityId: reservationId,
        details: { quantityCollected: qty, uncollected, isFinal }
      });

      return {
        success: true,
        collectedQuantity: qty,
        totalCollected: newTotalCollected,
        uncollected,
        status: newResStatus
      };
    });
  }
};
