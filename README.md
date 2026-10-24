# FoodBridge AI — Needs-First Surplus Food Redistribution Platform

> An AI-assisted, needs-first food redistribution platform connecting restaurants, hostels, bakeries, and households with surplus food to community kitchens, shelters, and individuals across Kerala.

---

## 1. Project Overview & Architectural Principles

FoodBridge AI addresses the daily tragedy of edible surplus food being discarded while nearby families and shelters experience unmet needs. Unlike commercial surplus apps or traditional charity listings, FoodBridge AI operates on a **needs-first, safety-first paradigm** with four connected core capabilities:

1. **Needs-First Matching:** Community kitchens, hostels, and families post their specific needs (dietary class, portion count, deadline, and allergen restrictions); the deterministic matching engine recommends eligible surplus.
2. **Multi-Donor Partial Fulfilment:** A single request (e.g., 50 vegetarian meals) is automatically fulfilled by combining contributions from multiple donors (e.g., 20 portions from Anjali's Kitchen + 15 from Malabar Bakers + 15 from Green Valley Hostel), executed under atomic transaction locks with zero double-booking.
3. **RescueFlow (Staged Backup Recipient Finding):** When surplus food remains unallocated or a reservation is cancelled/partially uncollected, RescueFlow proactively identifies and ranks compatible backup recipients within the locality and provides AI-drafted reallocation narratives before safely committing reservations.
4. **Verified Collection Accounting:** Strictly distinguishes between *listed*, *reserved*, and *actually collected* meals. Partial collections (e.g., 20 reserved, 12 picked up) record only confirmed meals towards impact metrics. No fabricated numbers.

### Login-First Security Architecture
Unauthenticated visitors are immediately presented with the **Login / Sign Up** screen. Public unauthenticated browsing and promotional landing page clutter have been completely eliminated. All application routes, API endpoints, and private profiles are protected behind verified sessions.

### Deterministic vs. AI Division of Responsibility
- **Deterministic Backend Code** strictly controls compatibility rules, allergen blocking, quantity reservations, transaction rollbacks, and collection metrics. AI is **never** permitted to decide eligibility, adjust inventory, or certify food safety.
- **Google Gemini AI (`@google/genai`)** acts exclusively as a human assistant: parsing messy voice/text descriptions, explaining match suitability, summarizing RescueFlow reallocations, and surfacing food waste insights. Full offline fallback rules are included if an API key is not configured.

---

## 2. Four Integrated Gemini AI Capabilities

FoodBridge AI integrates the official `@google/genai` SDK on the backend (`/api/ai/*`) with graceful offline fallbacks:

| Feature | Endpoint | Description | Fallback Behavior |
| :--- | :--- | :--- | :--- |
| **1. Smart Food Matching** | `POST /api/ai/explain-match` | Analyzes compatibility between request constraints and donor food, explaining why a match was ranked highly. | Generates deterministic constraint breakdown (locality distance, deadline margin, diet match). |
| **2. RescueFlow Backup Allocation** | `GET /api/rescueflow/propose/:id` | Generates a plain-language redistribution brief explaining why selected backup recipients prevent imminent food waste. | Provides structured score breakdowns and urgent time-to-spoilage alerts. |
| **3. Natural Language Donation Assistant** | `POST /api/ai/parse-description` | Converts free-form speech or informal text (English or Malayalam) into structured listing fields (item name, portions, dietary class, allergens, pickup window). | Uses regex and keyword heuristics to extract quantities, dietary labels, and allergens. |
| **4. Food Waste Insights & Reduction Trends** | `GET /api/ai/waste-insights` | Aggregates real platform statistics (total kilograms rescued, CO₂ equivalent diverted, top rescued food categories) and provides actionable advice for donors. | Computes accurate mathematical ratios ($1\text{ meal} = 0.42\text{ kg} = 1.05\text{ kg CO}_2\text{e}$) and returns practical waste prevention tips. |

---

## 3. Technology Stack & Multi-User Database

- **Frontend:** React 18, Vite 6, JavaScript, React Router 6, Lucide Icons, Terracotta Studio CSS.
  - Development URL: `http://localhost:3000` (proxies `/api` and `/uploads` to backend).
- **Backend:** Node.js, Express, REST API, Node-Cron, Multer, Cookie-Parser.
  - Development URL: `http://localhost:5000`.
- **Database (Dual Production / Local Architecture):**
  - **Local Development:** Native SQLite (`node:sqlite` DatabaseSync) with foreign keys enabled, WAL journal mode, `PRAGMA busy_timeout = 5000;`, and atomic transaction rollbacks (`backend/data/foodbridge.db`).
  - **Production Ready:** PostgreSQL schema with Supabase Row Level Security (RLS) policies provided in `backend/migrations/01_init_supabase_schema.sql`.
- **Hosting & Deployment:**
  - Netlify configuration provided in `netlify.toml` with automated Vite build commands and backend proxy rewrites.
- **Authentication & Security:**
  - HttpOnly, SameSite JWT authentication cookies.
  - Passwords hashed with `bcryptjs` (salt rounds: 10).
  - Working Password Reset flow (`/api/auth/forgot-password` and `/api/auth/reset-password`) using 6-digit verification codes.
  - Registration requires confirmation password matching and explicit acceptance of Terms of Service & Privacy Policy.
  - Unlocked donor contact details and WhatsApp coordination links are restricted to confirmed reservations.
- **Accessibility & Inclusion:**
  - Complete English and Malayalam (`മലയാളം`) interface toggle.
  - Web Speech API voice input (`ml-IN` and `en-IN`) for low-literacy users.
  - WCAG 2.1 AA compliant touch targets (minimum 44px) and `prefers-reduced-motion` support.
  - PWA manifest (`manifest.json`) and service worker for offline accessibility.

---

## 4. Terracotta Studio UI Palette

Defined in `frontend/src/index.css`:
- **Background:** `#FFF9F1` (Warm Ivory)
- **Secondary Background:** `#F3E8D8`
- **Primary Accent:** `#D77B61` (Warm Terracotta)
- **Deep Clay:** `#733E3A`
- **Main Text:** `#292625`
- **Secondary Text:** `#827973`
- **Cards:** `#FFFFFF`
- **Borders:** `#E8DED4`

---

## 5. Local Setup & Running Instructions (Windows Compatible)

### Prerequisites
- Node.js v22.0.0 or higher (Tested on Node.js v24.21.0).
- Windows PowerShell note: PowerShell script execution policies may restrict `npm.ps1`. Always use `npm.cmd` as shown below.

### Step 1: Clone or Navigate to the Project Root
```powershell
cd c:\Users\ASUS\OneDrive\Desktop\ardra\Vibethon
```

### Step 2: Configure Backend Environment Variables (Optional)
The backend runs with built-in defaults out of the box. To configure custom settings or enable live Google Gemini AI, create `backend/.env`:
```env
PORT=5000
JWT_SECRET=foodbridge-dev-secret-key-2026-safe-random-bytes
NODE_ENV=development

# Optional: Google Gemini API Key (If omitted, intelligent deterministic fallbacks are used)
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
GEMINI_MODEL=gemini-2.5-flash
```

### Step 3: Seed Database & Run Backend Tests
Run the 22 automated test suites verifying strict eligibility rules, multi-donor proposals, RescueFlow allocation locks, and reservation lifecycles:
```powershell
cd backend
npm.cmd install
npm.cmd run seed
npm.cmd test
```
*(All 22 automated tests pass with 0 errors in ~600ms).*

### Step 4: Start the Backend Server
```powershell
npm.cmd start
# Backend API running at http://localhost:5000
```

### Step 5: Start the Frontend Application
Open a second PowerShell terminal:
```powershell
cd c:\Users\ASUS\OneDrive\Desktop\ardra\Vibethon\frontend
npm.cmd install
npm.cmd run dev
# Frontend running at http://localhost:3000
```

---

## 6. Seeded Demo Accounts (Password: `demo123`)

For evaluation and testing, the database is pre-seeded with representative community accounts across Kerala:

| Account Name | Email | Locality | Role / Pre-configured State |
| :--- | :--- | :--- | :--- |
| **Sneha Bhavan Community Kitchen** | `sneha@foodbridge.demo` | Ernakulam (Kakkanad) | Recipient with an active 50-portion vegetarian request |
| **Anjali's Kitchen** | `anjali@foodbridge.demo` | Ernakulam (Kakkanad) | Restaurant donor offering 20 vegetarian portions |
| **Malabar Bakers** | `malabar@foodbridge.demo` | Ernakulam (Kakkanad) | Bakery donor offering 15 vegetarian portions |
| **Green Valley Hostel** | `greenvalley@foodbridge.demo` | Ernakulam (Kakkanad) | Hostel donor offering 15 vegetarian portions |
| **Rahul Nair** | `rahul@foodbridge.demo` | Ernakulam (Edappally) | Individual recipient (+4 pts fairness priority boost) |
| **Technopark Cafeteria** | `techno@foodbridge.demo` | Thiruvananthapuram | Distant donor (tests cross-district geographic rejection) |

*Default password for all seeded accounts:* `demo123`

---

## 7. Step-by-Step End-to-End Demo Guide

### Flow 1: Login-First Security & Route Protection
1. Open `http://localhost:3000` in an incognito window.
2. Notice immediate presentation of the **Login / Sign Up** screen (the old landing page and public browsing are removed).
3. Try navigating directly to `http://localhost:3000/dashboard` or `http://localhost:3000/donations` — you will be safely redirected back to `/login`.
4. Test the **Forgot Password** flow:
   - Click "Forgot password?".
   - Enter `sneha@foodbridge.demo` and click "Send Reset Code".
   - A 6-digit verification code is generated (displayed in the backend terminal logs for dev convenience).
   - Enter the code, specify a new password, and confirm.

### Flow 2: Multi-Donor Fulfilment (Signature Innovation)
1. Log in as **Sneha Bhavan Community Kitchen** (`sneha@foodbridge.demo` / `demo123`).
2. On the **Dashboard**, locate the request for **50 portions** and click **"View Matches"** (or open **Recommended Matches** in the nav).
3. Observe the **Multi-Donor Fulfilment Combination**:
   - Proposed donor bundle: Anjali's Kitchen (20) + Malabar Bakers (15) + Green Valley Hostel (15).
   - Total proposed: **50 / 50 portions (100% Demand Met, Unmet: 0)**.
4. Click **"Reserve Entire Proposed Combination (3 Donors)"**.
5. The reservations are safely created in SQLite with atomic quantity locks.

### Flow 3: RescueFlow Backup Recipient Finding
1. Log in as **Anjali's Kitchen** (`anjali@foodbridge.demo` / `demo123`).
2. Go to **My Donations** -> view your active listing with unallocated surplus portions.
3. Click **"RescueFlow (Find Backup Recipients)"**.
4. The RescueFlow modal appears:
   - Calculates unallocated meals at risk of expiration.
   - Evaluates nearby active requests, filtering out incompatible diets and allergen conflicts.
   - Displays AI-generated redistribution rationale or deterministic score breakdowns.
   - Allows one-click allocation to reserve remaining portions directly to backup recipients.

### Flow 4: Verified Collection & WhatsApp Coordination
1. In `anjali@foodbridge.demo`, open **My Donations** -> click **"Manage Reservations"**.
2. Click **"Accept Reservation"**. The recipient's contact phone and a **Direct WhatsApp Coordination** link unlock.
3. Click **"Confirm Actual Food Pickup"**.
4. Enter **12** portions (simulating a partial collection where 12 out of 20 were picked up).
5. Click **"Confirm Pickup"**.
6. Navigate to **Impact** (`/impact`) or view the Dashboard metrics. Verify that **only the 12 verified meals** are counted towards meals rescued.

### Flow 5: Regional Inclusion & Voice Assistant
1. Click the language toggle pill in the top navigation bar to switch the entire application to **മലയാളം**.
2. Click **"ഭക്ഷണം സംഭാവന ചെയ്യുക"** (Create Donation).
3. Click the microphone icon to activate Malayalam voice speech recognition (`ml-IN`), or type informal text.
4. Click **"AI അസിസ്റ്റന്റ് ഉപയോഗിക്കുക"** (Parse with AI) to auto-populate the structured form fields.

---

## 8. Automated Test Suite Summary

The backend test suite (`backend/src/tests/*.test.js`) runs via the Node.js native test runner:
- **`matching.test.js` (10 tests):** Verifies strict rejection on expiry, zero quantity, unit mismatches, cross-district boundaries, allergen conflicts, and computes multi-donor combinations.
- **`rescueflow.test.js` (3 tests):** Verifies candidate proposal ranking, atomic backup reservations, and over-allocation rejection.
- **`reservations.test.js` (5 tests):** Verifies batch creation, over-reservation safety, donor acceptance, partial pickup accounting, and rejection quantity release.
- **`auth.test.js` (4 tests):** Verifies registration validation, JWT cookie issuance, password reset code generation, and password update.

```powershell
npm.cmd test --prefix backend
# Result: 22 passed, 0 failed
```

---

## 9. Production Deployment Guidance

### Supabase PostgreSQL Migration
To deploy to a shared Supabase PostgreSQL database:
1. Open the Supabase SQL Editor.
2. Run the migration script in `backend/migrations/01_init_supabase_schema.sql`.
3. Enable Row Level Security (RLS) as configured in the migration script.
4. Configure your Supabase connection string in `backend/.env`.

### Netlify Frontend Hosting
The project includes `netlify.toml` configured for one-click Netlify builds:
```toml
[build]
  base = "frontend"
  publish = "dist"
  command = "npm run build"

[[redirects]]
  from = "/api/*"
  to = "https://your-production-backend.com/api/:splat"
  status = 200
```
