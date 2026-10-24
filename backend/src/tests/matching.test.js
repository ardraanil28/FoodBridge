import test from 'node:test';
import assert from 'node:assert/strict';
import { matchingEngine } from '../services/matchingEngine.js';

test('Matching Engine: Strict Eligibility & Rejection Rules', async (t) => {
  const baseRequest = {
    id: 1,
    title: '50 Veg Portions',
    food_type: 'cooked_meals',
    quantity: 50,
    outstanding_quantity: 50,
    unit: 'portions',
    dietary_requirements: 'vegetarian',
    allergies_to_avoid: JSON.stringify(['peanuts']),
    district: 'Ernakulam',
    area: 'Kakkanad',
    needed_by: new Date(Date.now() + 4 * 3600000).toISOString(),
    priority: 'urgent',
    created_at: new Date().toISOString()
  };

  const baseDonation = {
    id: 10,
    title: 'Veg Rice',
    category: 'cooked_meals',
    quantity: 20,
    available_quantity: 20,
    reserved_quantity: 0,
    unit: 'portions',
    dietary_class: 'vegetarian',
    declared_allergens: JSON.stringify([]),
    has_unknown_allergens: 0,
    district: 'Ernakulam',
    area: 'Kakkanad',
    available_from: new Date().toISOString(),
    collection_deadline: new Date(Date.now() + 5 * 3600000).toISOString(),
    status: 'Available'
  };

  await t.test('accepts fully compatible donation', () => {
    const res = matchingEngine.checkEligibility(baseDonation, baseRequest);
    assert.equal(res.eligible, true);
    assert.equal(res.needsHumanReview, false);
  });

  await t.test('rejects expired or cancelled donation', () => {
    const expired = { ...baseDonation, status: 'Expired' };
    assert.equal(matchingEngine.checkEligibility(expired, baseRequest).eligible, false);

    const cancelled = { ...baseDonation, status: 'Cancelled' };
    assert.equal(matchingEngine.checkEligibility(cancelled, baseRequest).eligible, false);
  });

  await t.test('rejects donation with zero remaining quantity', () => {
    const zeroQty = { ...baseDonation, available_quantity: 0 };
    assert.equal(matchingEngine.checkEligibility(zeroQty, baseRequest).eligible, false);
  });

  await t.test('rejects incompatible units (kg vs portions)', () => {
    const kgDonation = { ...baseDonation, unit: 'kg' };
    const res = matchingEngine.checkEligibility(kgDonation, baseRequest);
    assert.equal(res.eligible, false);
    assert.match(res.reason, /Incompatible units/i);
  });

  await t.test('rejects outside-district donations', () => {
    const outsideDistrict = { ...baseDonation, district: 'Thiruvananthapuram', area: 'Technopark' };
    const res = matchingEngine.checkEligibility(outsideDistrict, baseRequest);
    assert.equal(res.eligible, false);
    assert.match(res.reason, /Locality outside district/i);
  });

  await t.test('flags requires travel when same district but different area', () => {
    const sameDistrictDifferentArea = { ...baseDonation, district: 'Ernakulam', area: 'Edappally' };
    const res = matchingEngine.checkEligibility(sameDistrictDifferentArea, baseRequest);
    assert.equal(res.eligible, true);
    assert.equal(res.warnings.length > 0, true);
    assert.match(res.warnings[0], /requires travel/i);
  });

  await t.test('hard blocks match on declared allergen conflict', () => {
    const peanutDonation = { ...baseDonation, declared_allergens: JSON.stringify(['peanuts', 'sesame']) };
    const res = matchingEngine.checkEligibility(peanutDonation, baseRequest);
    assert.equal(res.eligible, false);
    assert.match(res.reason, /Declared allergen conflict/i);
  });

  await t.test('flags needsHumanReview when recipient has allergy and donation has unknown allergen info', () => {
    const unknownAllergenDonation = { ...baseDonation, has_unknown_allergens: 1, declared_allergens: JSON.stringify(['unknown']) };
    const res = matchingEngine.checkEligibility(unknownAllergenDonation, baseRequest);
    assert.equal(res.eligible, true);
    assert.equal(res.needsHumanReview, true);
    assert.match(res.warnings[0], /Recipient human review required/i);
  });

  await t.test('rejects non-vegetarian donation for vegetarian request', () => {
    const nonVeg = { ...baseDonation, dietary_class: 'non-vegetarian' };
    const res = matchingEngine.checkEligibility(nonVeg, baseRequest);
    assert.equal(res.eligible, false);
    assert.match(res.reason, /Request requires vegetarian/i);
  });
});

test('Matching Engine: Scoring and Multi-Donor Combination Proposals', async (t) => {
  const request = {
    id: 100,
    quantity: 50,
    outstanding_quantity: 50,
    unit: 'portions',
    priority: 'urgent',
    dietary_requirements: 'vegetarian',
    food_type: 'cooked_meals',
    created_at: new Date(Date.now() - 14 * 3600000).toISOString() // 14 hours ago (tests waiting boost)
  };

  const donorA = {
    donation: {
      id: 1,
      title: 'Donor A Pulao',
      donor_name: 'Anjali',
      donor_id: 101,
      district: 'Ernakulam',
      area: 'Kakkanad',
      available_quantity: 20,
      unit: 'portions',
      collection_deadline: new Date(Date.now() + 4 * 3600000).toISOString(),
      dietary_class: 'vegetarian'
    },
    score: 95,
    needs_human_review: false,
    warnings: []
  };

  const donorB = {
    donation: {
      id: 2,
      title: 'Donor B Chapatis',
      donor_name: 'Malabar',
      donor_id: 102,
      district: 'Ernakulam',
      area: 'Kakkanad',
      available_quantity: 15,
      unit: 'portions',
      collection_deadline: new Date(Date.now() + 5 * 3600000).toISOString(),
      dietary_class: 'vegetarian'
    },
    score: 90,
    needs_human_review: false,
    warnings: []
  };

  const donorC = {
    donation: {
      id: 3,
      title: 'Donor C Rice',
      donor_name: 'Green Valley',
      donor_id: 103,
      district: 'Ernakulam',
      area: 'Kakkanad',
      available_quantity: 15,
      unit: 'portions',
      collection_deadline: new Date(Date.now() + 6 * 3600000).toISOString(),
      dietary_class: 'vegetarian'
    },
    score: 85,
    needs_human_review: false,
    warnings: []
  };

  await t.test('computes Section 9 multi-donor combination (20 + 15 + 15 = 50)', () => {
    const combination = matchingEngine.computeMultiDonorCombination(request, [donorA, donorB, donorC]);
    assert.ok(combination);
    assert.equal(combination.requested_quantity, 50);
    assert.equal(combination.total_allocated, 50);
    assert.equal(combination.remaining_unmet, 0);
    assert.equal(combination.fully_fulfilled, true);
    assert.equal(combination.donor_count, 3);
    assert.equal(combination.allocations[0].allocated_quantity, 20);
    assert.equal(combination.allocations[1].allocated_quantity, 15);
    assert.equal(combination.allocations[2].allocated_quantity, 15);
  });
});
