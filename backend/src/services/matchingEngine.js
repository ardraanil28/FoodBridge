import { db } from '../config/db.js';
import { compareLocalities } from '../config/localities.js';

/**
 * Needs-First Matching Engine
 * 
 * Deterministic scoring algorithm with strict eligibility rules.
 * Section 8 & Section 14 compliance.
 */
export const matchingEngine = {
  /**
   * Check strict eligibility for a donation against a request.
   * Returns { eligible: boolean, reason?: string, needsHumanReview?: boolean, warnings: string[] }
   */
  checkEligibility(donation, request) {
    const warnings = [];

    // 1. Status check: reject expired, cancelled, or unavailable donations
    if (!['Available', 'Partially reserved'].includes(donation.status)) {
      return { eligible: false, reason: `Donation status is '${donation.status}'` };
    }

    // 2. Quantity check: reject donations with no remaining quantity
    if (donation.available_quantity <= 0) {
      return { eligible: false, reason: 'Donation has zero available quantity' };
    }

    // 3. Incompatible units: exact match required (kg != portions)
    if (donation.unit !== request.unit) {
      return { eligible: false, reason: `Incompatible units: requested '${request.unit}', donation is in '${donation.unit}'` };
    }

    // 4. Locality: reject outside-district
    const localityCheck = compareLocalities(
      { district: donation.district, area: donation.area },
      { district: request.district, area: request.area }
    );
    if (!localityCheck.compatible) {
      return { eligible: false, reason: 'Locality outside district' };
    }
    if (localityCheck.requiresTravel) {
      warnings.push(`Same district (${donation.district}), requires travel from ${donation.area} to ${request.area}`);
    }

    // 5. Time windows:
    // Reject donation not yet available when needed, or collection deadline has already passed
    const now = new Date();
    const donationDeadline = new Date(donation.collection_deadline);
    const donationAvailFrom = new Date(donation.available_from);
    const requestNeededBy = new Date(request.needed_by);

    if (donationDeadline <= now) {
      return { eligible: false, reason: 'Donation collection deadline has already passed' };
    }
    if (donationAvailFrom > requestNeededBy) {
      return { eligible: false, reason: 'Donation only available after requested need time' };
    }

    // 6. Allergens (Hard Rule):
    // Parse allergens
    const declaredAllergens = Array.isArray(donation.declared_allergens)
      ? donation.declared_allergens
      : JSON.parse(donation.declared_allergens || '[]');

    const allergiesToAvoid = Array.isArray(request.allergies_to_avoid)
      ? request.allergies_to_avoid
      : JSON.parse(request.allergies_to_avoid || '[]');

    let needsHumanReview = false;

    // Check for direct allergen conflict
    const lowerAllergens = declaredAllergens.map(a => a.toLowerCase().trim());
    for (const allergy of allergiesToAvoid) {
      const cleanAllergy = allergy.toLowerCase().trim();
      if (cleanAllergy && lowerAllergens.includes(cleanAllergy)) {
        return { eligible: false, reason: `Declared allergen conflict: donation contains '${cleanAllergy}'` };
      }
    }

    // Check unknown allergen status:
    // If recipient listed allergies and donation has explicitly unknown or uncertified allergen data
    if (allergiesToAvoid.length > 0) {
      if (donation.has_unknown_allergens || lowerAllergens.includes('unknown')) {
        needsHumanReview = true;
        warnings.push('Donation allergen information is unknown or uncertified. Recipient human review required.');
      }
    }

    // 7. Dietary requirements
    const reqDiet = (request.dietary_requirements || 'any').toLowerCase();
    const donDiet = (donation.dietary_class || 'unknown').toLowerCase();

    if (reqDiet === 'vegan') {
      if (donDiet !== 'vegan') {
        return { eligible: false, reason: `Request requires vegan; donation is '${donDiet}'` };
      }
    } else if (reqDiet === 'vegetarian') {
      if (!['vegetarian', 'vegan'].includes(donDiet)) {
        return { eligible: false, reason: `Request requires vegetarian; donation is '${donDiet}'` };
      }
    }

    return {
      eligible: true,
      needsHumanReview,
      warnings,
      localityCheck
    };
  },

  /**
   * Transparent scoring out of 100 points
   * Deadline urgency (30) + Quantity share (25) + Locality (20) + Dietary/Category (15) + Fairness boost (10)
   */
  calculateScore(donation, request, eligibilityInfo, requesterUser = null) {
    const reasons = [];
    const breakdown = {
      deadline: 0,
      quantity: 0,
      locality: 0,
      dietary: 0,
      fairness: 0
    };

    // 1. Deadline urgency and time remaining (30 points)
    // Priority weight: urgent (12), normal (6), low (3)
    let priorityPts = 6;
    if (request.priority === 'urgent') {
      priorityPts = 12;
      reasons.push('Priority request (+12 pts urgency)');
    } else if (request.priority === 'low') {
      priorityPts = 3;
    }
    // Time remaining until collection deadline (up to 18 pts for prompt food rescue)
    const now = Date.now();
    const deadlineTime = new Date(donation.collection_deadline).getTime();
    const hoursRemaining = Math.max(0, (deadlineTime - now) / (1000 * 60 * 60));
    let deadlinePts = 6;
    if (hoursRemaining <= 6) {
      deadlinePts = 18;
      reasons.push('High waste-prevention priority: expires within 6 hours (+18 pts)');
    } else if (hoursRemaining <= 24) {
      deadlinePts = 12;
      reasons.push('Expires within 24 hours (+12 pts)');
    } else {
      deadlinePts = 6;
    }
    breakdown.deadline = Math.min(30, priorityPts + deadlinePts);

    // 2. Quantity contribution (25 points)
    const needed = request.outstanding_quantity > 0 ? request.outstanding_quantity : request.quantity;
    const contributable = Math.min(donation.available_quantity, needed);
    const share = Math.min(1.0, contributable / needed);
    breakdown.quantity = Math.round(share * 25);
    reasons.push(`Can contribute ${contributable} of ${needed} ${request.unit} (${Math.round(share * 100)}% coverage)`);

    // 3. Locality (20 points)
    if (eligibilityInfo.localityCheck.type === 'same_area') {
      breakdown.locality = 20;
      reasons.push(`Same area (${donation.area})`);
    } else {
      breakdown.locality = 10;
      reasons.push(`Same district (${donation.district}), requires local transit`);
    }

    // 4. Dietary & Category fit (15 points)
    let dietaryPts = 5;
    if (request.food_type === donation.category) {
      dietaryPts += 5;
      reasons.push(`Exact food category match (${donation.category})`);
    }
    if (request.dietary_requirements === donation.dietary_class) {
      dietaryPts += 5;
      reasons.push(`Exact dietary match (${donation.dietary_class})`);
    }
    breakdown.dietary = Math.min(15, dietaryPts);

    // 5. Fairness Boost (Section 14: up to 10 points)
    // - Smaller requests (<= 20 portions) get +4 to protect individuals/small families from being outranked
    // - Individual requesters get +3
    // - Waiting longer (> 12 hours) gets +3
    let fairnessPts = 0;
    if (request.quantity <= 20) {
      fairnessPts += 4;
      reasons.push('Fairness boost: Small request prioritisation (+4 pts)');
    }
    if (requesterUser && requesterUser.org_type === 'individual') {
      fairnessPts += 3;
      reasons.push('Fairness boost: Individual requester (+3 pts)');
    }
    const createdAt = new Date(request.created_at).getTime();
    const waitHours = (now - createdAt) / (1000 * 60 * 60);
    if (waitHours >= 12) {
      fairnessPts += 3;
      reasons.push(`Fairness boost: Waiting over 12 hours (+3 pts)`);
    }
    breakdown.fairness = Math.min(10, fairnessPts);

    const totalScore = Math.min(100, breakdown.deadline + breakdown.quantity + breakdown.locality + breakdown.dietary + breakdown.fairness);

    return {
      score: totalScore,
      breakdown,
      reasons,
      contributableQuantity: contributable
    };
  },

  /**
   * Find all eligible individual matches for a food request, ranked by score.
   */
  findMatchesForRequest(requestId) {
    const request = db.prepare('SELECT * FROM food_requests WHERE id = ?').get(requestId);
    if (!request) return { matches: [], combination: null, request: null };

    const requester = db.prepare('SELECT * FROM users WHERE id = ?').get(request.requester_id);

    // Fetch active donations in the same district and matching unit
    const donations = db.prepare(`
      SELECT d.*, u.name as donor_name, u.org_type as donor_org_type
      FROM donations d
      JOIN users u ON d.donor_id = u.id
      WHERE d.district = ?
        AND d.unit = ?
        AND d.status IN ('Available', 'Partially reserved')
        AND d.available_quantity > 0
      ORDER BY d.collection_deadline ASC
    `).all(request.district, request.unit);

    const eligibleMatches = [];

    for (const donation of donations) {
      const eligibility = this.checkEligibility(donation, request);
      if (eligibility.eligible) {
        const scoring = this.calculateScore(donation, request, eligibility, requester);
        eligibleMatches.push({
          donation: {
            id: donation.id,
            donor_id: donation.donor_id,
            donor_name: donation.donor_name,
            donor_org_type: donation.donor_org_type,
            title: donation.title,
            category: donation.category,
            quantity: donation.quantity,
            available_quantity: donation.available_quantity,
            reserved_quantity: donation.reserved_quantity,
            unit: donation.unit,
            dietary_class: donation.dietary_class,
            declared_allergens: JSON.parse(donation.declared_allergens || '[]'),
            district: donation.district,
            area: donation.area,
            available_from: donation.available_from,
            collection_deadline: donation.collection_deadline,
            image_url: donation.image_url,
            storage_info: donation.storage_info
          },
          contributable_quantity: scoring.contributableQuantity,
          score: scoring.score,
          breakdown: scoring.breakdown,
          reasons: scoring.reasons,
          warnings: eligibility.warnings,
          needs_human_review: eligibility.needsHumanReview
        });
      }
    }

    // Sort descending by score
    eligibleMatches.sort((a, b) => b.score - a.score);

    // Compute Multi-Donor Fulfilment Combination (Section 9)
    const combination = this.computeMultiDonorCombination(request, eligibleMatches);

    return {
      request,
      matches: eligibleMatches,
      combination
    };
  },

  /**
   * Multi-Donor Combination (Section 9 signature feature)
   * Proposes combining contributions from multiple donors to fulfill a request.
   * Example: Request 50 -> Donor A (20) + Donor B (15) + Donor C (15) = 50 total.
   */
  computeMultiDonorCombination(request, rankedMatches) {
    const targetQuantity = request.outstanding_quantity > 0 ? request.outstanding_quantity : request.quantity;
    if (targetQuantity <= 0 || rankedMatches.length === 0) {
      return null;
    }

    let remainingNeeded = targetQuantity;
    const allocations = [];

    for (const match of rankedMatches) {
      if (remainingNeeded <= 0) break;

      const allocQty = Math.min(match.donation.available_quantity, remainingNeeded);
      if (allocQty > 0) {
        allocations.push({
          donation_id: match.donation.id,
          donation_title: match.donation.title,
          donor_name: match.donation.donor_name,
          donor_id: match.donation.donor_id,
          district: match.donation.district,
          area: match.donation.area,
          allocated_quantity: allocQty,
          unit: match.donation.unit,
          collection_deadline: match.donation.collection_deadline,
          dietary_class: match.donation.dietary_class,
          score: match.score,
          needs_human_review: match.needs_human_review,
          warnings: match.warnings
        });
        remainingNeeded -= allocQty;
      }
    }

    const totalAllocated = targetQuantity - remainingNeeded;

    return {
      request_id: request.id,
      requested_quantity: targetQuantity,
      unit: request.unit,
      total_allocated: totalAllocated,
      remaining_unmet: remainingNeeded,
      fully_fulfilled: remainingNeeded === 0,
      donor_count: allocations.length,
      allocations
    };
  }
};
