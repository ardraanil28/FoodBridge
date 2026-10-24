# Comparative Analysis: FoodBridge AI vs Existing Platforms

Food sharing and food rescue platforms already exist globally and in India. FoodBridge AI does not claim that surplus redistribution itself is new. This document provides an honest assessment of what existing platforms excel at and what FoodBridge AI contributes.

---

### Comparison Matrix

| Capability | Too Good To Go | Olio | Feeding India (Zomato) | FoodBridge AI |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Model** | Commercial discounted "surprise bags" B2C | Peer-to-peer neighborhood food sharing | Large NGO charity logistics for hunger relief | **Needs-first, verified community redistribution** |
| **Needs-First Matching** | ❌ No (Users browse commercial store listings) | ❌ No (Users browse what individuals offer) | ⚠️ Manual dispatch via NGO volunteers | **✅ Automated matching driven by recipient needs** |
| **Multi-Donor Fulfilment** | ❌ No (Single store purchase only) | ❌ No (Pick up single item from single person) | ⚠️ Manual fleet consolidation | **✅ Automated combination of multiple donors for 1 request** |
| **Dietary & Allergen Filtering** | ❌ Very limited (Surprise bags contain unknown items) | ⚠️ Unstructured text descriptions | ⚠️ Bulk grain / standardized thali rations | **✅ Deterministic hard blocking & human review flags** |
| **Verified Collection Accounting** | ⚠️ App swipe confirmation | ⚠️ Informal chat coordination | ✅ Bulk delivery audit records | **✅ Real collection vs reserved audit trail with uncollected release** |
| **Language Inclusion** | Local European languages | English / Spanish | English / Hindi | **✅ English + Malayalam (`മലയാളം`) with Voice Input** |
| **Low-Resource Viability** | High-end native mobile app | Native mobile app | Specialized logistics portal | **✅ Lightweight responsive PWA with offline caching** |

---

### What Existing Platforms Do Well
1. **Too Good To Go:** Highly successful commercial monetization model that incentivizes bakeries and supermarkets to recoup food costs through discounted customer purchases.
2. **Olio:** Exceptional community engagement for neighbor-to-neighbor household items and pantry surplus in the UK.
3. **Feeding India / Robin Hood Army:** Tremendous on-the-ground volunteer mobilization for massive, centralized meal distribution drives.

---

### What FoodBridge AI Adds (Our 4 Signature Contributions)
1. **Needs-First Matching:** Instead of forcing hungry shelters to constantly refresh feeds hoping suitable food appears, recipients post their specific dietary requirements and quantity needs. The backend engine automatically scores and recommends compatible surplus.
2. **Multi-Donor Partial Fulfilment:** When a community shelter needs 50 portions, a single donor often cannot supply it. FoodBridge AI calculates and proposes combining contributions from multiple nearby donors (e.g., 20 portions from a restaurant + 15 from a bakery + 15 from a hostel), locking allocations atomically.
3. **Transparent Deadline & Locality Ranking:** Scores matches by waste diversion urgency (collection deadlines), locality travel boundaries, and fairness boosts for smaller families, without opaque black-box AI decisions.
4. **Verified Collection vs Reserved Tracking:** Solves the "phantom collection" problem by explicitly distinguishing listed, reserved, and actually collected food. Uncollected quantities are safely tracked and released back to available food pools.
