import { db, runInTransaction } from '../config/db.js';
import { matchingEngine } from './matchingEngine.js';
import { geminiService } from './geminiService.js';
import { notificationService } from './notificationService.js';
import { activityService } from './activityService.js';
import crypto from 'node:crypto';

export const rescueFlowService = {
  /**
   * Find and propose backup recipients for unallocated surplus food (Section 12 & 15 Feature B)
   */
  async proposeBackupRecipients(donationId) {
    const donation = db.prepare('SELECT * FROM donations WHERE id = ?').get(donationId);
    if (!donation) {
      throw new Error('Donation not found.');
    }
    if (['Cancelled', 'Expired', 'Collected'].includes(donation.status)) {
      throw new Error(`Cannot run RescueFlow on a donation with status '${donation.status}'.`);
    }

    const unallocatedQuantity = donation.available_quantity;
    if (unallocatedQuantity <= 0) {
      return {
        donation,
        unallocated_quantity: 0,
        candidates_count: 0,
        proposed_allocations: [],
        unresolved_surplus: 0,
        message: 'No unallocated surplus remaining on this donation.'
      };
    }

    // Find open requests in same district and matching unit
    const candidateRequests = db.prepare(`
      SELECT r.*, u.name as requester_name, u.org_type as requester_org_type, u.phone as requester_phone
      FROM food_requests r
      JOIN users u ON r.requester_id = u.id
      WHERE r.district = ?
        AND r.unit = ?
        AND r.status IN ('Open', 'Partially fulfilled', 'Partially matched')
        AND r.outstanding_quantity > 0
        AND r.requester_id != ?
      ORDER BY r.needed_by ASC, r.created_at ASC
    `).all(donation.district, donation.unit, donation.donor_id);

    // Apply strict deterministic eligibility checks
    const eligibleCandidates = [];
    for (const req of candidateRequests) {
      const eligibility = matchingEngine.checkEligibility(donation, req);
      if (eligibility.eligible) {
        const requesterUser = { org_type: req.requester_org_type };
        const scoring = matchingEngine.calculateScore(donation, req, eligibility, requesterUser);
        eligibleCandidates.push({
          request: req,
          score: scoring.score,
          breakdown: scoring.breakdown,
          reasons: scoring.reasons,
          warnings: eligibility.warnings,
          needsHumanReview: eligibility.needsHumanReview
        });
      }
    }

    // Sort descending by score
    eligibleCandidates.sort((a, b) => b.score - a.score);

    if (eligibleCandidates.length === 0) {
      return {
        donation,
        unallocated_quantity: unallocatedQuantity,
        candidates_count: 0,
        proposed_allocations: [],
        unresolved_surplus: unallocatedQuantity,
        message: 'No eligible backup requests found in this district matching dietary and safety criteria.'
      };
    }

    // Propose allocations across eligible candidates up to unallocated quantity
    let remainingToDistribute = unallocatedQuantity;
    const proposedAllocations = [];

    for (const candidate of eligibleCandidates) {
      if (remainingToDistribute <= 0) break;

      const allocQty = Math.min(candidate.request.outstanding_quantity, remainingToDistribute);
      if (allocQty > 0) {
        proposedAllocations.push({
          request_id: candidate.request.id,
          requester_id: candidate.request.requester_id,
          requester_name: candidate.request.requester_name,
          requester_org_type: candidate.request.requester_org_type,
          title: candidate.request.title,
          area: candidate.request.area,
          district: candidate.request.district,
          allocated_quantity: allocQty,
          outstanding_quantity: candidate.request.outstanding_quantity,
          unit: donation.unit,
          score: candidate.score,
          reasons: candidate.reasons,
          warnings: candidate.warnings,
          explanation: `Allocated ${allocQty} ${donation.unit} to fulfill ${candidate.request.requester_org_type} need in ${candidate.request.area} (Score: ${candidate.score}/100)`
        });
        remainingToDistribute -= allocQty;
      }
    }

    // If Gemini is available, enhance explanation and allocation narrative
    let aiSummary = null;
    if (geminiService.isConfigured() && proposedAllocations.length > 0) {
      try {
        const prompt = `
You are the FoodBridge RescueFlow AI coordinator.
We need to allocate ${unallocatedQuantity} ${donation.unit} of "${donation.title}" (${donation.dietary_class}) to backup recipients in ${donation.district}.
Here is our verified proposed allocation:
${JSON.stringify(proposedAllocations.map(p => ({
  recipient: p.requester_name,
  area: p.area,
  qty: p.allocated_quantity,
  score: p.score,
  reasons: p.reasons
})))}

Provide a concise, encouraging 2-sentence summary explaining why this distribution maximizes community impact and prevents food waste.
`;
        aiSummary = await geminiService.generateSummary(prompt);
      } catch (err) {
        console.warn('RescueFlow AI summary note:', err.message);
      }
    }

    return {
      donation: {
        id: donation.id,
        title: donation.title,
        quantity: donation.quantity,
        available_quantity: donation.available_quantity,
        unit: donation.unit,
        district: donation.district,
        area: donation.area,
        collection_deadline: donation.collection_deadline
      },
      unallocated_quantity: unallocatedQuantity,
      candidates_count: eligibleCandidates.length,
      proposed_allocations: proposedAllocations,
      unresolved_surplus: remainingToDistribute,
      ai_summary: aiSummary || `RescueFlow proposed ${proposedAllocations.length} backup allocation(s) diverting ${unallocatedQuantity - remainingToDistribute} ${donation.unit} of food.`
    };
  },

  /**
   * Confirm RescueFlow allocations inside an ACID transaction (Section 12)
   */
  confirmRescueAllocations({ donationId, allocations, donorUserId, notes = '' }) {
    return runInTransaction(() => {
      const now = new Date().toISOString();
      const groupId = `rescue_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      const donation = db.prepare('SELECT * FROM donations WHERE id = ?').get(donationId);
      if (!donation) throw new Error('Donation not found.');
      if (donation.donor_id !== donorUserId) {
        throw new Error('Unauthorized: Only the listing donor can confirm RescueFlow allocations.');
      }
      if (new Date(donation.collection_deadline) <= new Date()) {
        throw new Error('Donation collection deadline has passed.');
      }

      let totalAllocated = 0;
      for (const a of allocations) {
        totalAllocated += parseFloat(a.allocated_quantity || a.quantity);
      }

      if (totalAllocated <= 0) {
        throw new Error('Total allocated quantity must be greater than zero.');
      }
      if (totalAllocated > donation.available_quantity) {
        throw new Error(`Total allocated quantity (${totalAllocated}) exceeds available quantity (${donation.available_quantity}).`);
      }

      const createdReservations = [];

      for (const alloc of allocations) {
        const requestId = Number(alloc.request_id || alloc.requestId);
        const qty = parseFloat(alloc.allocated_quantity || alloc.quantity);

        const request = db.prepare('SELECT * FROM food_requests WHERE id = ?').get(requestId);
        if (!request) {
          throw new Error(`Food request #${requestId} not found.`);
        }
        if (['Fulfilled', 'Cancelled', 'Expired'].includes(request.status)) {
          throw new Error(`Request '${request.title}' is no longer active.`);
        }

        // Create allocation record
        const allocRes = db.prepare(`
          INSERT INTO allocations (request_id, donation_id, allocated_quantity, collected_quantity, status, created_at, updated_at)
          VALUES (?, ?, ?, 0, 'reserved', ?, ?)
        `).run(requestId, donationId, qty, now, now);
        const allocationId = Number(allocRes.lastInsertRowid);

        // Create reservation record (pre-accepted by donor since triggered via RescueFlow!)
        const resResult = db.prepare(`
          INSERT INTO reservations (
            reservation_group_id, request_id, donation_id, requester_id, donor_id,
            allocation_id, quantity, collected_quantity, uncollected_quantity,
            status, donor_notes, requester_notes, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 'accepted', ?, ?, ?, ?)
        `).run(
          groupId,
          requestId,
          donationId,
          request.requester_id,
          donorUserId,
          allocationId,
          qty,
          notes || 'Allocated via FoodBridge RescueFlow',
          'RescueFlow matched allocation',
          now,
          now
        );
        const reservationId = Number(resResult.lastInsertRowid);

        // Update request reserved and outstanding quantities
        const newReqReserved = request.reserved_quantity + qty;
        const newReqOutstanding = Math.max(0, request.outstanding_quantity - qty);
        const newReqStatus = newReqOutstanding === 0 ? 'Fully reserved' : 'Partially fulfilled';

        db.prepare(`
          UPDATE food_requests SET
            reserved_quantity = ?,
            outstanding_quantity = ?,
            status = ?,
            updated_at = ?
          WHERE id = ?
        `).run(newReqReserved, newReqOutstanding, newReqStatus, now, requestId);

        // Notify recipient immediately
        notificationService.create({
          userId: request.requester_id,
          type: 'reservation_accepted',
          message: `RescueFlow Alert: ${qty} ${donation.unit} of "${donation.title}" has been allocated to your request! Pickup details are ready.`,
          referenceType: 'reservation',
          referenceId: reservationId,
          link: `/reservations/${reservationId}`
        });

        activityService.log({
          userId: donorUserId,
          action: 'rescueflow_allocation_confirmed',
          entityType: 'reservation',
          entityId: reservationId,
          details: { requestId, quantity: qty }
        });

        createdReservations.push({
          id: reservationId,
          requestId,
          requesterName: request.requester_name,
          quantity: qty,
          unit: donation.unit
        });
      }

      // Update donation available and reserved quantities
      const newDonAvail = donation.available_quantity - totalAllocated;
      const newDonReserved = donation.reserved_quantity + totalAllocated;
      const newDonStatus = newDonAvail === 0 ? 'Fully reserved' : 'Partially reserved';

      db.prepare(`
        UPDATE donations SET
          available_quantity = ?,
          reserved_quantity = ?,
          status = ?,
          updated_at = ?
        WHERE id = ?
      `).run(newDonAvail, newDonReserved, newDonStatus, now, donationId);

      return {
        success: true,
        groupId,
        totalAllocated,
        remainingUnallocated: newDonAvail,
        reservations: createdReservations
      };
    });
  }
};
