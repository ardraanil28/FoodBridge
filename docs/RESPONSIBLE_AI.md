# Responsible AI, Safety & Fairness Architecture

## 1. AI Role: Assistant, Never Decision-Maker
At FoodBridge AI, Artificial Intelligence acts strictly as an entry assistant and natural-language synthesizer. 
- **AI Never Decides Eligibility:** The matching engine is 100% deterministic code running on Node.js and SQLite.
- **AI Never Adjusts Quantities:** Quantities, allocations, and reservation locks are handled exclusively via atomic SQLite transactions (`BEGIN TRANSACTION ... COMMIT`).
- **AI Never Certifies Safety:** FoodBridge AI explicitly disclaims food safety certification. Donors must certify compliance with hygiene practices, and users must review all extracted fields.

## 2. Deterministic Safeguards & Hard Rules
The backend enforces non-negotiable hard rules prior to any match scoring:
1. **Unit Compatibility:** Incompatible units (e.g. `kg` vs `portions`) are strictly rejected. Conversions are never guessed.
2. **Allergen Protection:** Any declared allergen conflict automatically and completely blocks a match. If a recipient declares an allergy and the donation lists allergen details as unknown or uncertified, automatic matching is blocked, and the listing is flagged for human review.
3. **Dietary Restrictions:** Vegetarian requests strictly exclude non-vegetarian or unknown classifications. Vegan requests strictly exclude vegetarian or unknown classifications.
4. **Locality Boundaries:** Auto-matching rejects listings across differing Kerala districts. Intra-district transit is flagged with a "Requires travel" notice.
5. **Time Window Validity:** Expired listings, cancelled listings, and listings where the collection deadline precedes the need time are rejected.

## 3. Algorithmic Fairness & Bias Mitigation (Section 14)
To ensure larger commercial kitchens and institutions do not monopolize available food, the engine incorporates a **Fairness Boost (up to 10 points)**:
- **Small Request Prioritization (+4 pts):** Requests for 20 portions or fewer receive an automatic boost to protect vulnerable individuals and small families.
- **Individual Requester Boost (+3 pts):** Accounts registered as `individual` receive a boost over large commercial institutions.
- **Wait-Time Equity (+3 pts):** Open requests waiting longer than 12 hours receive an increasing boost to ensure unfulfilled needs are not perpetually superseded by newer requests.
- **Personal Attribute Blindness:** Matching algorithms are strictly blinded to names, religions, castes, genders, or socioeconomic profiling.

## 4. Privacy & Coordination Security (Section 4)
- **Contact Confidentiality:** Phone numbers and email addresses are withheld from public browse pages and search results.
- **Just-In-Time Disclosure:** Contact details are only unlocked and shared when a donor explicitly accepts a reservation.
- **Moderation:** A built-in reporting system allows community members to flag listings for hygiene concerns, inaccurate quantities, or inappropriate content.

## 5. Low-Resource Viability & Language Inclusion
- **Kerala Locality Model:** Fixed dropdown hierarchy covering Kerala's 14 districts with canonical local areas.
- **Full Malayalam Localization:** Complete bilingual interface with one-click toggling (`English` and `മലയാളം`).
- **Web Speech API Integration:** Speech-to-text input supporting `ml-IN` and `en-IN` accents.
- **PWA Offline Resiliency:** Service worker caching ensures critical listings remain readable on unstable rural networks.
