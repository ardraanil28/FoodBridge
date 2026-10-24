import test from 'node:test';
import assert from 'node:assert/strict';
import { db, initDb } from '../config/db.js';
import { seedDatabase } from '../seed.js';
import { reservationService } from '../services/reservationService.js';

test('Reservation & Partial Collection Lifecycle', async (t) => {
  // Re-seed DB to clean slate
  const ids = seedDatabase();

  await t.test('creates multi-donor batch reservation safely (Section 20 Demo Flow)', () => {
    // Sneha reserves from Donor A (20), Donor B (15), Donor C (15) for Request (50)
    const result = reservationService.createReservations({
      requestId: ids.reqSneha_id,
      requesterId: ids.recipientSneha_id,
      items: [
        { donationId: ids.donA_id, quantity: 20 },
        { donationId: ids.donB_id, quantity: 15 },
        { donationId: ids.donC_id, quantity: 15 }
      ],
      requesterNotes: 'Community shelter dinner distribution.'
    });

    assert.ok(result.groupId);
    assert.equal(result.reservations.length, 3);
    assert.equal(result.totalReserved, 50);
    assert.equal(result.requestStatus, 'Fully reserved');

    // Verify donation A available is now 0, reserved is 20
    const donA = db.prepare('SELECT available_quantity, reserved_quantity, status FROM donations WHERE id = ?').get(ids.donA_id);
    assert.equal(donA.available_quantity, 0);
    assert.equal(donA.reserved_quantity, 20);
    assert.equal(donA.status, 'Fully reserved');
  });

  await t.test('rejects over-reservation attempt', () => {
    // Attempting to reserve from Donor A again should fail since available is 0 (or exceeds available)
    assert.throws(() => {
      reservationService.createReservations({
        requestId: ids.reqSneha_id,
        requesterId: ids.recipientSneha_id,
        items: [{ donationId: ids.donA_id, quantity: 5 }]
      });
    }, /no longer available|Insufficient quantity/);
  });

  await t.test('donor accepts reservation', () => {
    // Find reservation for Donor A
    const resA = db.prepare('SELECT id FROM reservations WHERE donation_id = ? AND donor_id = ?').get(ids.donA_id, ids.donorA_id);
    assert.ok(resA);

    const acceptRes = reservationService.acceptReservation(resA.id, ids.donorA_id, 'Ready for pickup at 3 PM');
    assert.equal(acceptRes.success, true);

    const checkRes = db.prepare('SELECT status, donor_notes FROM reservations WHERE id = ?').get(resA.id);
    assert.equal(checkRes.status, 'accepted');
  });

  await t.test('confirms partial collection (reserved 20, collected 12, not collected 8)', () => {
    const resA = db.prepare('SELECT id, quantity FROM reservations WHERE donation_id = ?').get(ids.donA_id);
    assert.equal(resA.quantity, 20);

    // Confirm collection of 12 portions
    const collectRes = reservationService.confirmCollection({
      reservationId: resA.id,
      collectorUserId: ids.donorA_id,
      quantityCollected: 12,
      isFinal: false,
      notes: 'Recipient took 12 portions; remaining 8 will be picked up before deadline.'
    });

    assert.equal(collectRes.collectedQuantity, 12);
    assert.equal(collectRes.totalCollected, 12);
    assert.equal(collectRes.uncollected, 8);
    assert.equal(collectRes.status, 'partially_collected');

    // Verify collection records
    const cr = db.prepare('SELECT quantity_collected FROM collection_records WHERE reservation_id = ?').get(resA.id);
    assert.equal(cr.quantity_collected, 12);

    // Verify donation collected_quantity is 12
    const don = db.prepare('SELECT collected_quantity, reserved_quantity FROM donations WHERE id = ?').get(ids.donA_id);
    assert.equal(don.collected_quantity, 12);
    assert.equal(don.reserved_quantity, 8);
  });

  await t.test('donor rejects reservation and quantity is safely released', () => {
    // Re-seed for a fresh test
    const fresh = seedDatabase();
    
    // Create single reservation of 10 from Donor A
    const created = reservationService.createReservations({
      requestId: fresh.reqSneha_id,
      requesterId: fresh.recipientSneha_id,
      items: [{ donationId: fresh.donA_id, quantity: 10 }]
    });

    const resId = created.reservations[0].id;

    // Donor A rejects
    const rejectRes = reservationService.rejectReservation(resId, fresh.donorA_id, 'Out of kitchen stock');
    assert.equal(rejectRes.success, true);

    // Verify donation A quantity is restored back to 20
    const donA = db.prepare('SELECT available_quantity, reserved_quantity, status FROM donations WHERE id = ?').get(fresh.donA_id);
    assert.equal(donA.available_quantity, 20);
    assert.equal(donA.reserved_quantity, 0);
    assert.equal(donA.status, 'Available');
  });
});
