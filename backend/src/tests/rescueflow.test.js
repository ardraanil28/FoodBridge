import test from 'node:test';
import assert from 'node:assert/strict';
import { db, initDb } from '../config/db.js';
import { seedDatabase } from '../seed.js';
import { rescueFlowService } from '../services/rescueFlowService.js';

test('RescueFlow & Password Reset Automation', async (t) => {
  const ids = seedDatabase();

  await t.test('RescueFlow proposes backup allocations for unallocated surplus', async () => {
    // Donation A (Pulao) has 20 available portions in Kakkanad
    const proposal = await rescueFlowService.proposeBackupRecipients(ids.donA_id);

    assert.ok(proposal);
    assert.equal(proposal.donation.id, ids.donA_id);
    assert.equal(proposal.unallocated_quantity, 20);
    assert.ok(proposal.candidates_count > 0);
    assert.ok(proposal.proposed_allocations.length > 0);

    // Verify first candidate allocation respects quantity
    const firstAlloc = proposal.proposed_allocations[0];
    assert.ok(firstAlloc.allocated_quantity > 0);
    assert.ok(firstAlloc.allocated_quantity <= 20);
  });

  await t.test('RescueFlow confirms backup allocations atomically', () => {
    // Confirm allocation of 10 portions from Donor A to Sneha's request
    const confirmResult = rescueFlowService.confirmRescueAllocations({
      donationId: ids.donA_id,
      allocations: [
        {
          request_id: ids.reqSneha_id,
          allocated_quantity: 10
        }
      ],
      donorUserId: ids.donorA_id,
      notes: 'Emergency evening shelter backup'
    });

    assert.equal(confirmResult.success, true);
    assert.equal(confirmResult.totalAllocated, 10);
    assert.equal(confirmResult.remainingUnallocated, 10);
    assert.equal(confirmResult.reservations.length, 1);

    // Verify DB state
    const don = db.prepare('SELECT available_quantity, reserved_quantity, status FROM donations WHERE id = ?').get(ids.donA_id);
    assert.equal(don.available_quantity, 10);
    assert.equal(don.reserved_quantity, 10);
    assert.equal(don.status, 'Partially reserved');

    const req = db.prepare('SELECT reserved_quantity, outstanding_quantity, status FROM food_requests WHERE id = ?').get(ids.reqSneha_id);
    assert.equal(req.reserved_quantity, 10);
    assert.equal(req.outstanding_quantity, 40);
  });

  await t.test('RescueFlow rejects allocation exceeding available surplus', () => {
    // Currently only 10 portions remaining available on Donation A
    assert.throws(() => {
      rescueFlowService.confirmRescueAllocations({
        donationId: ids.donA_id,
        allocations: [
          {
            request_id: ids.reqSneha_id,
            allocated_quantity: 50 // Exceeds 10
          }
        ],
        donorUserId: ids.donorA_id
      });
    }, /exceeds available quantity/);
  });
});
