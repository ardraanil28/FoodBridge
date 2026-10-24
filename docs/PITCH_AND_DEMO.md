# FoodBridge AI: 2-Minute Pitch & Step-by-Step Demo Script

## 2-Minute Pitch

"Every single day across Kerala, hundreds of kilograms of fresh, nutritious food from restaurants, weddings, and college hostels end up discarded. At the very same moment, community kitchens, elder-care shelters, and daily wage families struggle to secure their evening meal.

Existing food apps either focus on commercial discount sales (like Too Good To Go) or neighbor-to-neighbor household sharing (like Olio). But community shelters have large, specific dietary and quantity needs that no single small donor can fulfill alone.

Enter **FoodBridge AI** — an AI-assisted, needs-first redistribution platform built specifically for low-resource environments and regional inclusion.

FoodBridge AI introduces four connected innovations:
1. **Needs-First Matching:** Shelters post what they need; our deterministic engine ranks available donations by compatibility, locality, and expiry urgency.
2. **Multi-Donor Fulfilment:** When a shelter requests 50 meals, our engine automatically combines 20 meals from a restaurant, 15 from a bakery, and 15 from a hostel, with zero risk of double-booking.
3. **RescueFlow (Backup Recipient Allocation):** When surplus remains unallocated or uncollected, RescueFlow proactively identifies and alerts compatible backup recipients in the locality, guided by AI redistribution explanations.
4. **Verified Collection Accounting:** We distinguish listed, reserved, and actually collected food. If 20 are reserved but only 12 collected, impact numbers strictly count 12.
5. **Inclusive AI Assistant:** With full Malayalam (`മലയാളം`) localization, speech recognition, and Gemini-assisted field drafting, even low-literacy kitchen staff can speak informal Malayalam descriptions to list surplus in seconds.

FoodBridge AI: Turning daily surplus into verified community dignity."

---

## Step-by-Step Demo Script

### Preparation
1. Ensure the backend and frontend are running:
   - Backend at `http://localhost:5000` (`npm.cmd start` in `backend`)
   - Frontend at `http://localhost:3000` (`npm.cmd run dev` in `frontend`)
2. Fresh demo records are seeded via `npm.cmd run seed` in `backend`.

---

### Step 1: Mandatory Login-First Security
1. Open `http://localhost:3000/` in an incognito browser tab.
2. Observe the clean, warm **Terracotta Studio** Login / Sign Up screen immediately.
   - Public unauthenticated browsing and outdated hero sections have been removed.
   - Unauthenticated attempts to access `/dashboard` or `/donations` are redirected straight to `/login`.
3. Highlight the **Forgot Password** flow:
   - Click "Forgot password?", enter `sneha@foodbridge.demo`, and receive a 6-digit verification code.
4. Log in as **Recipient: Sneha Bhavan Kitchen** (`sneha@foodbridge.demo` / `demo123`).

---

### Step 2: The Multi-Donor Fulfilment Innovation (Signature Feature)
1. On the **Dashboard**, locate Sneha Bhavan's active request: **"50 Vegetarian Evening Meals for Community Distribution"**.
2. Click **"View Matches"** (`/matches/request/1`).
3. **Highlight the Proposed Combination Card:**
   - The engine automatically proposes the **Multi-Donor Fulfilment Combination**:
     - Donor A (Anjali's Kitchen): 20 portions
     - Donor B (Malabar Bakers): 15 portions
     - Donor C (Green Valley Hostel): 15 portions
     - **Total Combined: 50/50 portions (100% Demand Met, Unmet: 0).**
4. Click **"Reserve Entire Proposed Combination (3 Donors)"**.
5. Three reservations are created atomically in SQLite with shared Group ID and safe quantity locks.

---

### Step 3: Donor In-App Notifications & Acceptance
1. Log out and log in as **Donor A: Anjali's Kitchen** (`anjali@foodbridge.demo` / `demo123`).
2. Notice the **Notification Bell** badge pops with an unread notification:
   - *"New reservation request for 20 portions of 'Vegetable Pulao & Dal Tadka'"*.
3. Go to **My Donations** (`/my-donations`) -> Click **"Manage Reservations"**.
4. Click **"Accept Reservation"**. The reservation status updates to `accepted`.
5. Point out that Sneha Bhavan's authorized phone number is now unlocked for pickup coordination with a direct **WhatsApp Coordination link**.

---

### Step 4: Confirming Partial Collection (Verified Accounting)
1. Still on the reservation details page (`/reservations/1`), click **"Confirm Actual Food Pickup"**.
2. **Demonstrate Partial Pickup:**
   - Suppose the shelter volunteer arrives with containers that can only hold 12 portions today.
   - Enter **12** portions in the modal.
   - Click **Confirm Collection**.
3. View the updated reservation card:
   - Reserved: **20**
   - Actually Collected: **12**
   - Uncollected Balance: **8**
4. The remaining uncollected portions are safely tracked without inflating platform metrics.

---

### Step 5: RescueFlow Backup Recipient Finding
1. In `anjali@foodbridge.demo`, go to **My Donations** (`/my-donations`).
2. Notice the listing has unallocated or uncollected surplus remaining.
3. Click **"RescueFlow (Find Backup Recipients)"**.
4. The RescueFlow modal appears:
   - Evaluates remaining unallocated portions against pending community requests.
   - Eliminates expired or allergen-conflicted requests.
   - Displays AI-generated redistribution reasoning (or deterministic priority score).
   - Allows instant allocation to backup recipients to prevent food waste.

---

### Step 6: Verify True Impact Numbers & AI Food Waste Insights
1. Click **Impact** in the navigation bar (`/impact`), or look at the Dashboard summary.
2. Notice the **Confirmed Meals Collected** counter displays strictly **12** confirmed meals.
3. Observe the **Food Waste Insights** card:
   - Real-time kilograms diverted ($1\text{ meal} = 0.42\text{ kg}$).
   - CO₂e emissions prevented ($1.05\text{ kg CO}_2\text{e}$ per meal).
   - Actionable AI waste reduction guidance.

---

### Step 7: Malayalam Localization & Gemini Voice Assistant
1. In the navigation bar, click the **"മലയാളം"** toggle pill.
2. The entire interface immediately switches to natural Malayalam strings.
3. Click **"മിച്ചഭക്ഷണം പങ്കിടുക"** (`/donations/create`).
4. Click the microphone icon to test voice input (`ml-IN`), or type informal text:
   - *"കാക്കനാട് 25 വെജിറ്റേറിയൻ ഊണ്, വൈകിട്ട് 7 ന് മുൻപ് എടുക്കണം"*
5. Click **"ജെമിനി സ്മാർട്ട് ഫിൽ"** (Parse with AI).
6. Gemini (or the deterministic fallback engine) extracts title, category, quantity (25), unit (portions), and dietary class (vegetarian).
7. Review and save the donation.
