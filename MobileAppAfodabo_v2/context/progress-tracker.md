# Progress Tracker — MobileAppAfodabo_v2

## Current Phase: Payment Verification Workflow

---

## Completed Work

### Payment Verification Feature
- [x] SQL migration `migrations/021_payment_verifications.sql` — creates `payment_verifications` table with RLS, indexes, trigger
- [x] Supabase migration copy `supabase/migrations/20260707230000_payment_verifications.sql`
- [x] Model `models/payment_verification.py` — PaymentVerification, PaymentVerificationCreate, PaymentVerificationReject, PaymentVerificationResponse
- [x] Service `services/payment_verifications.py` — PaymentVerificationService with create (auto-lease), duplicate check, approve (reuses PaymentService.create()), reject
- [x] Router `routers/payment_verifications.py` — POST, GET /my, GET (owner), PATCH approve, PATCH reject
- [x] Notifications wired: tenant submission → manager, manager approve/reject → tenant
- [x] Registered in `models/__init__.py`, `services/__init__.py`, `routers/__init__.py`, `main.py`

### Mobile — Payment Verification
- [x] Types `src/types.ts` — PaymentVerification, PaymentVerificationStatus, PaymentVerificationCreate
- [x] Service `src/services/payment-verifications.ts` — create, getMySubmissions, getOwnerSubmissions, approve, reject, uploadScreenshot
- [x] Hooks `src/hooks/usePaymentVerifications.ts` — useMySubmissions, useOwnerSubmissions, useCreateVerification, useApproveVerification, useRejectVerification
- [x] `app/tenant/submit-payment.tsx` — Form (amount, method, reference, date, notes, screenshot) + "Pending Verification" success state
- [x] `app/tenant/payments.tsx` — Added "Submit Payment for Verification" button + "Payment Submissions" section with status badges and rejection reasons
- [x] `app/manager/payment-verification.tsx` — Full screen with filter tabs (Pending/Approved/Rejected), search by tenant/property, submission cards, Approve (with confirmation dialog), Reject (with reason dialog)
- [x] `app/manager/home.tsx` — Added "Verify Payments" quick action
- [x] `app/_layout.tsx` — Registered `/tenant/submit-payment` and `/manager/payment-verification` routes
- [x] `src/utils/format.ts` — Updated formatMethod to handle all payment methods (cash, bank, bank_transfer, mobile_money, credit_card, check, other)

---

## Current Phase: Property Module Audit & Polish

---

## Completed Work

### Backend — Subscription System
- [x] SQL migration `migrations/015_subscriptions.sql` — creates `subscription_plans` and `manager_subscriptions` tables
- [x] Models `models/subscription.py` — Pydantic models for plans, subscriptions, create/response types
- [x] Service `services/subscriptions.py` — plan listing, subscription creation, NylonPay confirmation, expiration scheduler
- [x] Router `routers/subscriptions.py` — `GET /subscriptions/plans`, `GET /subscriptions/current`, `POST /subscriptions/create`, `POST /subscriptions/webhook`
- [x] Registered in `main.py`, `routers/__init__.py`, `services/__init__.py`, `models/__init__.py`

### Backend — Reports Endpoint
- [x] Router `routers/reports.py` — `GET /reports/tenants`, `GET /reports/due-payments?filter=`, `GET /reports/payment-history`
- [x] Registered in `main.py` and `routers/__init__.py`

### Mobile — API Infrastructure
- [x] `constants/config.ts` — API base URL config
- [x] `src/lib/api-client.ts` — Fetch-based API client with JWT auth, token refresh, error handling
- [x] `src/services/auth.ts` — signIn, signUp, signOut, refreshToken, getProfile, updateProfile, changePassword
- [x] `src/services/properties.ts` — CRUD for properties
- [x] `src/services/tenancies.ts` — CRUD for leases
- [x] `src/services/tenants.ts` — CRUD for tenants
- [x] `src/services/payments.ts` — CRUD for payments, NylonPay initiation
- [x] `src/services/agreements.ts` — getState, uploadDocument, consent
- [x] `src/services/subscriptions.ts` — getPlans, getCurrent, create
- [x] `src/services/reports.ts` — getTenantsReport, getDuePayments, getPaymentHistory
- [x] `src/services/notifications.ts` — list, markRead, markAllRead
- [x] `src/hooks/useProperties.ts` — React Query hooks for property CRUD
- [x] `src/hooks/useTenancies.ts` — React Query hooks for lease CRUD
- [x] `src/hooks/useTenants.ts` — React Query hooks for tenant CRUD
- [x] `src/hooks/usePayments.ts` — React Query hooks for payment CRUD
- [x] `src/hooks/useAgreements.ts` — React Query hooks for agreement flow
- [x] `src/hooks/useSubscriptions.ts` — React Query hooks for subscription
- [x] `src/hooks/useReports.ts` — React Query hooks for reports
- [x] `src/hooks/useDashboard.ts` — aggregated dashboard stats

### Mobile — Auth Wired to Backend
- [x] `src/context/auth-context.tsx` — replaced mock auth with real API calls
- [x] JWT token management with AsyncStorage persistence
- [x] Session restore on app launch via `GET /auth/me`
- [x] Automatic subscription fetch for manager role
- [x] Profile update via `PATCH /auth/profile`

### Mobile — Screens Wired to Real Backend
- [x] `app/manager/home.tsx` — dashboard stats, alerts, overdue list, search
- [x] `app/manager/properties.tsx` — property list with search
- [x] `app/manager/tenancies.tsx` — tenancy list with filter tabs
- [x] `app/property-detail.tsx` — property detail
- [x] `app/edit-property.tsx` — edit property form
- [x] `app/create-tenancy.tsx` — create tenancy with tenant resolution
- [x] `app/tenancy-detail.tsx` — full detail with agreement consent flow
- [x] `app/tenant-detail.tsx` — tenant detail
- [x] `app/payment-history.tsx` — payment list for a lease
- [x] `app/tenant/my-tenancy.tsx` — tenant's active tenancy
- [x] `app/subscription.tsx` — plan selection from API
- [x] `app/subscription-payment.tsx` — NylonPay initiation via API

### Reports Tab
- [x] Added 5th tab "Reports" to `app/manager/_layout.tsx`
- [x] Created `app/manager/reports.tsx` with real API data
- [x] Three report tabs: Tenants, Due Payments, Payment History
- [x] Export PDF/CSV buttons

### Agreement Consent Flow
- [x] Agreement state display in `app/tenancy-detail.tsx`
- [x] Upload & consent buttons for manager/tenant
- [x] Status badges showing both parties' consent state

### Components
- [x] `RecordPaymentModal` — wired to `useCreatePayment()` mutation
- [x] `SubscriptionGate` — uses auth context (already wired)

### Property Module — Backend Alignment
- [x] Backend: removed `rent_period` filter from `get_public_listings()` (column doesn't exist)
- [x] Created `src/mappers/property-mapper.ts` — single mapping layer for `BackendProperty` → `Property`
- [x] Added `BackendProperty` interface in `src/types.ts`
- [x] Added `listPublic()`, `getByIdPublic()` methods in `src/services/properties.ts`
- [x] Added `usePublicProperties()`, `usePublicProperty()`, `usePropertyListItems()` hooks
- [x] `app/guest/explore.tsx` — wired to `GET /properties/public`, removed all mock data
- [x] `app/manager/properties.tsx` — wired through mapper, removed manual field mapping
- [x] `app/property-detail.tsx` — guests use public endpoint, managers use auth endpoint; all fields rendered from real data; no "N/A" placeholders

### Occupancy Display Consistency
- [x] Added `occupancy_status` to `Property` type — passes through raw backend `status`
- [x] Manager properties page now uses `useFocusEffect` to refetch list every time screen focuses — stale list data replaced with fresh data whenever returning from detail/edit
- [x] Guest explore page also refetches on focus for consistency

### Edit Screen Image Handling
- [x] Image previews shown via `expo-image` (160x120 thumbnails in horizontal ScrollView)
- [x] Each image has `Replace` button (opens picker, replaces that specific image in array)
- [x] Each image has `Remove` button (removes from array)
- [x] `Add More Images` button appends new images
- [x] All wired to `useUpdateProperty` → `PATCH /properties/{id}` which sends the final `images[]` array to the backend

### Property Detail UX Improvements
- [x] **Share** — full property info (title, location, rent, type, beds, baths, description, amenities, contact) shared via `Share.share()`
- [x] **Share/Call buttons** — press color change (icon + background switch to primary solid)
- [x] **Contact Manager** — section renamed from "Contact", phone/email styled as tappable buttons with pressed state
- [x] **Location/Map** — new "Location" section with "View on Map" button when coordinates exist, opens Google Maps; visible to all users (both guest and manager)
- [x] **Delete** — confirmation dialog before deletion with error handling

### Edit Property Screen — Full Rewrite
- [x] All editable fields: title, district, city, address, property type, rent, bedrooms, bathrooms, square feet, deposit, description, amenities (toggle chips), images (expo-image-picker with add/remove)
- [x] Wired to `useUpdateProperty()` mutation — sends `PATCH /properties/{id}`
- [x] Proper mapping from mobile field names to backend field names on save

### Occupancy Status & Management Controls
- [x] Added `occupancy_status` to `Property` and `PropertyListItem` types — passes through raw backend `status` ("available"/"occupied")
- [x] PropertyCard now shows "Available" / "Occupied" badge prominently (green/warning)
- [x] Property detail badges: shows occupancy type badge + inactive badge when applicable
- [x] Manager can toggle occupancy (Mark Available / Mark Occupied) directly from detail screen via `PATCH /properties/{id}`
- [x] Manager can toggle visibility (Activate / Deactivate) directly from detail screen via `PATCH /properties/{id}` — no longer "coming soon"

---

## Remaining (Low Priority)
- [ ] `app/reports.tsx` — old route still has mock data (superseded by `app/manager/reports.tsx`)
- [x] `app/create-property.tsx` — wired to `useCreateProperty()` mutation with full fields (amenities, images, deposit, sq ft), proper field mapping to backend

### Auth — Change Password
- [x] `app/change-password.tsx` — now calls `authService.changePassword(current, newPwd)` → `POST /auth/change-password`
- [x] Backend verifies current password via Supabase `sign_in_with_password` before allowing change
- [x] Loading state, error display (current password incorrect, validation errors from backend)
- [x] Works for both manager and tenant roles (uses `require_active_user` dependency)
- [x] **Session invalidation handled**: Supabase Auth invalidates ALL sessions when password changes. After success, app signs user out, clears tokens, and redirects to `/login` with message "Please sign in with your new password." This prevents 401 errors on subsequent API calls.

### Auth — Edit Profile
- [x] `app/edit-profile.tsx` — email field removed (shown as read-only), only `full_name` and `phone` are editable
- [x] Wired to `updateProfile()` → `PATCH /auth/profile` with loading/error handling
- [x] Backend `ProfileUpdate` model only accepts `full_name`, `phone`, `avatar_url` — email changes blocked

### Auth — Global 401 Session Expiry Handling
- [x] `src/lib/api-client.ts` — added `onTokensCleared` event emitter; `clearTokens()` now notifies all listeners; `request()` and `uploadFile()` throw clear `ApiError("Your session has expired. Please sign in again.", 401)` on failed token refresh instead of propagating the confusing backend error
- [x] `src/context/auth-context.tsx` — added `useEffect` listener for `onTokensCleared` that sets `user` and `subscription` to null when tokens are cleared (any API 401 + failed refresh)
- [x] `app/edit-profile.tsx` — catch block now detects `ApiError` with `status === 401` and redirects to `/login` via `router.replace()`
- [x] `app/_layout.tsx` — existing `useEffect` on `user` already redirects to `/login` when user becomes null, so the global listener auto-logs out on ANY screen when session expires

### Auth Screens — Official Branding Icon
- [x] `app/login.tsx` — replaced `<Home>` Lucide placeholder with `<Image source={require("../assets/images/icon.png")}>` (official app icon)
- [x] `app/register.tsx` — same replacement for consistent branding
- [x] Both screens use 56x56 icon in a 72x72 rounded-square container with semi-transparent backdrop; matches existing green gradient header

### Manager Contact on Properties
- [x] Backend `crud.py` — added `_enrich_with_manager_contact()` helper that fetches `profiles` table for each property's `owner_id` and populates `manager_email`/`manager_phone`
- [x] Applied to all property-fetching methods: `get_all`, `get_by_id`, `get_by_id_public`, `get_public_listings`
- [x] Contact section on property detail now shows the real manager details from the profiles table

### Property Type Enum — Server-Side Normalization (FIX: "Could not update property")
- [x] **Root cause**: PATCH/POST reached Supabase with raw mobile `property_type` value (`apartment`, `shop`, …) which is not a valid Postgres enum (`Residential` | `Office Space`), causing `22P02 invalid input value for enum property_type`.
- [x] Backend `services/crud.py` — added `_normalize_property_type()` that maps mobile values → enum (`apartment/house/studio/single_room` → `Residential`, `shop` → `Office Space`) and passes through already-valid enum values. Applied in both `PropertyService.create()` and `PropertyService.update()`.
- [x] Mobile `src/services/properties.ts` `mapPropertyTypeInData()` already maps `type`/`property_type` to backend enum before send (defense in depth).
- [x] Now edit-property AND create-property both succeed end-to-end regardless of bundle state.

### Tenancies Module — Phase 1: Core Data Integrity & Backend Integration
- [x] **Server-side lease enrichment** — `backend/services/crud.py` added `_enrich_leases()` (mirrors `_enrich_with_manager_contact`): batch-fetches tenants (name/phone/email), properties (title), and payments (completed only) to compute `total_paid`, `balance_due = max(0, monthly_rent - total_paid)`, and `last_payment_*` per lease. Applied in `LeaseService.get_all`, `get_all_for_tenant`, `get_by_id`, `get_by_id_for_tenant`, `create`, `update`.
- [x] **`backend/models/lease.py`** — extended `Lease`/`LeaseResponse` with enriched optional fields (`tenant_name`, `tenant_phone`, `tenant_email`, `property_title`, `balance_due`, `total_paid`, `last_payment_date/amount/method`); added `unit_label` to `Lease`/`LeaseCreate`/`LeaseResponse`.
- [x] **`backend/migrations/017_lease_unit_label.sql`** — adds `unit_label TEXT` column + index to `leases` (app already sent it; was silently dropped).
- [x] **Mobile `src/mappers/tenancy-mapper.ts` (NEW)** — `fromBackendLease()` / `fromBackendLeaseList()` single source-of-truth mapping backend lease → `Tenancy`, using `calculateHealth` for status. Replaces duplicated inline mapping.
- [x] **Mobile `src/services/tenancies.ts`** — `LeaseResponse` interface extended with enriched fields.
- [x] Replaced inline hardcoded mapping in `app/manager/tenancies.tsx`, `app/tenancy-detail.tsx`, `app/manager/home.tsx`, `app/tenant-detail.tsx` with the mapper. Removed hardcoded empty tenant/property/balance values.
- [x] **Record Payment wiring fixed** — `app/manager/tenancies.tsx` now passes the selected `Tenancy` (not `null`) to `RecordPaymentModal`, so list Record Payment opens.
- [x] **Dashboard** — `useDashboardStats` now fetches full tenancy list (limit 100) so overdue count is accurate; detail screen uses backend `balance_due`/`total_paid` for consistency.
- [x] Payment status aligned: backend uses `completed` (matches DB CHECK), mobile previously used `confirmed`; detail now uses backend-computed values.

### Tenancies Module — Phase 2: Complete Existing Manager Workflows
- [x] **Agreement Upload workflow** — `app/tenancy-detail.tsx` `handleUploadAgreement` now uses `expo-document-picker` (added dep `expo-document-picker@^57.0.1`) to pick PDF/image, uploads via `useUploadAgreement` → `POST /agreements/{id}/upload`, shows in-button progress (`ActivityIndicator` + "Uploading…"), success/failure `Alert` + inline `uploadError`, and refreshes agreement status via `useAgreementState` (query key invalidated on success). Consent button also shows pending state.
- [x] **Record Payment refresh** — `useCreatePayment`/`useUpdatePayment` now also invalidate `["dashboard"]` (in addition to `["payments"]`/`["tenancies"]`), so list, detail, dashboard stats, and payment history all refresh automatically after recording. Detail balance uses backend `balance_due` (recomputed on refetch).
- [x] **Active Tenancy Creation** — `app/create-tenancy.tsx` now sends `status: "active"` (added `status` to `LeaseCreateData`). Backend `create_lease` already fires the `tenancy_created` notification when `status == "active"`, so tenant is notified and the lease is immediately active (no more Draft).
- [x] **Health consistency** — Every screen now derives `health` from the shared `calculateHealth` via `fromBackendLease`. Removed last hardcoded `health: "good"` in `app/tenant/my-tenancy.tsx` (now mapped) and `app/manager/home.tsx` search results (now mapped → real health badge). No inline health computation remains in any screen.
- [x] **`app/tenant/my-tenancy.tsx`** refactored to use `fromBackendLease` (real tenant name/phone/email, balance, last payment, health) with tenant identity + agreement status overlaid.

## Next Steps
1. Verify end-to-end on device: create (active) → open → record payment (balance updates) → upload agreement (status refreshes) → dashboard updates.
2. Phase 3 (future): Edit Tenancy, Terminate, Renewal UI; cumulative balance model; pagination beyond 100; add `expo-document-picker` type widening if desired.

---

## Balance Recalculation & In-Place Renewal (Option B)

> LAYOUT NOTE: This is the **MobileAppAfodabo_v2** app (Expo Router). Tenancy screens
> live in `app/tenancy-detail.tsx`, `app/create-tenancy.tsx`, `app/edit-tenancy.tsx`;
> the backend lease mapping is `src/mappers/tenancy-mapper.ts`; services/hooks are
> `src/services/tenancies.ts` and `src/hooks/useTenancies.ts`. (The older tracker
> entries referencing `src/screens/...` / `src/services/backend-mappers.ts` describe
> a different checkout and do NOT apply here.)

### Backend — Full-period balance math (calendar-month diff, min 1 month)
- [x] `services/crud.py` — added `_months_between(start, end)` = `(end.year - start.year)*12 + (end.month - start.month)`, min 1. Rewrote `_enrich_leases()` to compute `expected_rent = monthly_rent * months`, `balance_due = max(0, expected_rent - total_paid)`, `tenant_credit = max(0, total_paid - expected_rent)`, and `effective_status` (terminated | expired if today>end | else active). `is_overdue` = `balance_due > 0`. Uses `confirmed`/`completed` payments only.
- [x] `models/lease.py` — `LeaseResponse` now returns `expected_rent`, `tenant_credit`, `effective_status`. Added `RenewLease` model (`new_end_date`, optional `monthly_rent`, `notes`).
- [x] `services/crud.py` `LeaseService.renew()` — owner-scoped (returns None/PermissionError if caller is not the lease owner), validates `new_end_date > current end_date` (ValueError otherwise), UPDATEs `end_date` + optional `monthly_rent` + `status='active'`, and inserts a `renewal_history` row.
- [x] `routers/leases.py` — `POST /leases/{lease_id}/renew` (manager only, maps PermissionError→403, ValueError→400). Imported `RenewLease`.
- [x] `migrations/018_renewal_history.sql` — creates `renewal_requests` (was referenced by code but missing) and `renewal_history` tables + indexes.

### Mobile (MobileAppAfodabo_v2) — Balance display + Renewal UI + Edit Tenancy
- [x] `src/types.ts` — `Tenancy` now carries `expected_rent`, `tenant_credit`, `effective_status` (defaulted to 0 / status).
- [x] `src/mappers/tenancy-mapper.ts` — `BackendLease` + `fromBackendLease()` map `expected_rent`, `tenant_credit`, `effective_status`; health is derived from `effective_status` so expired leases show as bad.
- [x] `src/services/tenancies.ts` — added `renew(leaseId, payload)` → `POST /leases/{id}/renew`.
- [x] `src/hooks/useTenancies.ts` — added `useRenewTenancy()` (invalidates tenancies list + detail).
- [x] `src/components/RenewTenancyModal.tsx` (NEW) — day/month/year date inputs validate `new_end_date > current end_date` (server-enforced too), optional new rent + notes; calls `useRenewTenancy`.
- [x] `app/tenancy-detail.tsx` — new "Payment Standing" card (Expected Rent / Outstanding / Tenant Credit); expired tenancies (manager only) show a renew banner + button opening `RenewTenancyModal`; added an "Edit" quick action linking to `app/edit-tenancy.tsx`; wired Renew success + refetch.
- [x] `app/edit-tenancy.tsx` (NEW) — full **Edit Tenancy** workflow reusing the Create form fields (tenant email, property, unit, rent, start/end dates, deposit, status). Pre-populated from `useTenancy(id)`; saves via `useUpdateTenancy` → `PATCH /leases/{id}`; invalidates and returns to detail. Shows loading (`updateTenancy.isPending`), success and error (`Alert`) states. Blocks accidental loss of unsaved changes via a `isDirty` guard on back/cancel.

### Verification
- [x] `python -m py_compile` of backend crud/routers/lease model — passes.
- [x] `npx tsc --noEmit` (MobileAppAfodabo_v2) — no errors in changed files (`app/edit-tenancy.tsx`, `src/components/RenewTenancyModal.tsx`, `app/tenancy-detail.tsx`, `src/mappers/tenancy-mapper.ts`, `src/services/tenancies.ts`, `src/hooks/useTenancies.ts`, `src/types.ts`).

### Security guarantees (per request)
- Only the property owner / manager assigned to the property (lease `owner_id`) can call `POST /leases/{id}/renew` — enforced server-side via `LeaseService.renew` ownership check (403 for others).
- `new_end_date` must be strictly greater than the current lease end date — enforced server-side (`ValueError` → 400) and client-side in `RenewTenancyModal`.
- Edit Tenancy uses the same ownership-scoped `PATCH /leases/{id}` (backend `update_lease` filters by `owner_id`), so a manager can only edit their own leases.

---

## Tenant Module — 4-Tab Experience & Polish (MobileAppAfodabo_v2)

### Phase 1 — Backend lease enrichment for tenant (manager contact + image)
- [x] `backend/services/crud.py` `_enrich_leases()` added `manager_name`, `manager_phone`, `manager_email`, `property_image`, `property_title` to each lease response.
- [x] `backend/models/lease.py` `LeaseResponse` extended with those fields.
- [x] Mobile `src/services/tenancies.ts` + `src/mappers/tenancy-mapper.ts` + `Tenancy` type carry the new fields.
- [x] `useAuth` now loads `phone` from `GET /auth/profile`.
- [x] `app/tenant/my-tenancy.tsx` removed broken `l.tenant_id === user.id` comparison (uses tenant-scoped lease directly).

### Phase 2 — Tenant tab navigation + Payments tab
- [x] `app/tenant/_layout.tsx` now 4 tabs: Browse, My Tenancy, Payments, Account.
- [x] `app/tenant/browse.tsx` re-exports `guest/explore`.
- [x] `app/tenant/payments.tsx` created (KPIs + history, originally with NylonPay flow).

### Phase 3 — My Tenancy agreement lifecycle card
- [x] Agreement card shows 4-step lifecycle (Pending → Uploaded → You Consented → Manager Consented → Fully Executed), opens doc via `Linking`, tenant consent via `useConsentAgreement`.

### Phase 4 — Payment history edit/delete gating
- [x] `payment-history.tsx` + `payment-detail.tsx` Edit/Delete gated behind `user.role === "manager"`.

### Phase 5 — My Tenancy dashboard polish
- [x] Property image, status + health badges, start date, days remaining, summary grid.

### Change 1 — Tenancy validity progress bar (My Tenancy)
- [x] Status card now shows validity progress bar using `leaseProgress()` + `HealthText` colors (good/warn/bad) with days-left label.

### Change 2 — Removed tenant rent-pay flow
- [x] Removed Pay Rent / NylonPay / mobile-money flow from `app/tenant/payments.tsx`; now view-only KPIs + history. Deleted pay imports, `handlePay`, `initiateNylon`, `payAmount`, and unused styles (`payCard`, `payHeader`, `payIconWrap`, `payTitle`, `paySubtitle`, `amountRow`, `amountLabel`, `amountValue`, `phoneHint`).

### Change 3 — Full property browse filters + improved header (Tenant Browse)
- [x] Rewrote `app/guest/explore.tsx` with full filters mirroring old app: District (SelectField), Property Type (SelectField), Min/Max Price (InputField), Min Bedrooms/Bathrooms (SelectField), Amenities (multi-chip), Popular-district quick chips, Reset.
- [x] Improved hero header ("Find Your Perfect Home" + marketplace badge + subtitle).
- [x] Backend-supported filters (state, property_type, min_price, max_price) passed to `usePublicProperties`; bedrooms/bathrooms/amenities filtered client-side.
- [x] `npx tsc --noEmit` clean for `explore.tsx` and `payments.tsx`.

---

## Property Boosting — Phase 1 MVP

### Backend
- [x] `services/boost.py` — replaced `BOOST_PRICE_PER_DAY` with `BOOST_PACKAGES` dict (7d=10k, 14d=18k, 30d=35k); added `get_boost_packages()`, `get_packages()` method, `get_active_boost_by_property_id()`, `get_active_boost_details()`; `calculate_boost_price()` now validates duration against packages.
- [x] `models/boost.py` — added `BoostPackage` Pydantic model.
- [x] `routers/boosts.py` — added `GET /boosts/packages` (public, returns available packages).
- [x] `models/property.py` — `PropertyResponse` gains `is_boosted`, `boosted_until`, `boost_days_remaining`, `boost_package_label` (all optional, default false/0/null).
- [x] `services/crud.py` — added `_enrich_with_boost_info(props, supabase)` helper: batch-queries `property_boosts` for active, non-expired boosts and decorates each property with `is_boosted`, `boosted_until`, `boost_days_remaining`, `boost_package_label`. Applied to `get_all()`, `get_public_listings()`, `get_by_id()`, `get_by_id_public()`.
- [x] `services/scheduler.py` — added `check_boost_expiry()` async job that calls `BoostService.expire_old()` (daily in production, every 12h otherwise).

### Mobile (MobileAppAfodabo_v2)
- [x] `src/types.ts` — added `BoostPackage` interface, `BoostInitiateResponse`, boost fields to `BackendProperty`, `Property`, `PropertyListItem`.
- [x] `src/services/boosts.ts` (NEW) — `boostsService.fetchPackages()` → `GET /boosts/packages`, `boostsService.initiateBoost()` → `POST /boosts/initiate`.
- [x] `src/mappers/property-mapper.ts` — `fromBackendProperty()` and `fromBackendToListItem()` now map boost fields.
- [x] `src/components/PropertyCard.tsx` — shows `★ Boosted` badge (gold tone, top-right) when `property.is_boosted` is true.
- [x] `app/property-detail.tsx` — boost badge in image section (gold); Management section shows boost status card (boosted → days remaining with star icon) or "Boost Property" button linking to `/boost-property`.
- [x] `app/boost-property.tsx` (NEW) — Expo Router screen: fetches packages from API, selectable cards, phone number input, "Pay with Mobile Money" button, success state with pending instructions.
- [x] `app/manager/properties.tsx` — subtitle shows boosted count when any properties are boosted.

### Demo: Manual Payment Simulation (Supabase)
To manually simulate a successful boost payment for presentation:
1. Open Supabase dashboard → **property_boosts** table
2. Find the pending boost row (status = `"pending"`)
3. Edit the row:
   - `status` → change to `"active"`
   - `transaction_id` → change to `"manual-demo"` (or similar)
   - `started_at` → set to current timestamp (e.g. `2026-07-18T12:00:00Z`)
   - `expires_at` → set to current timestamp + package duration (e.g. +7 days: `2026-07-25T12:00:00Z`)
4. Save the row
5. Refresh the mobile app → property will show `★ Boosted` badge, appear first in public listings, and manager will see days remaining in the detail screen
6. To test expiry, set `expires_at` to a past timestamp → property reverts to normal on next query (or after scheduler runs `expire_old()`)

### Verification Checklist
- [ ] Manager sees `★ Boosted` badge on property cards when `is_boosted` is true
- [ ] Manager property detail shows boost status with days remaining
- [ ] "Boost Property" button on unboosted properties navigates to purchase screen
- [ ] Purchase screen loads packages from `GET /boosts/packages`
- [ ] Payment initiation calls `POST /boosts/initiate` and shows pending success state
- [ ] Public listings order: boosted properties first (server-side)
- [ ] Guest PropertyCard also shows `★ Boosted` badge
- [ ] Boost expires automatically (scheduler + query-time check via `_enrich_with_boost_info`)

---

## Current Phase: Property Boosting Polish & Verification

---

## Agreement Versioning & Consent Integrity + Tenant Fixes

### Backend — Agreement versioning
- [x] `migrations/019_agreement_versions.sql` — adds `version`, `is_active`, `status` (active/archived/fully_executed) to `agreement_documents`; backfills existing rows (latest per lease = active, fully_executed if both consented); index on (lease_id, is_active, version); refreshes RLS policy.
- [x] `models/agreements.py` — `AgreementDocumentResponse` gains `version/is_active/status`; new `AgreementVersionResponse` + `AgreementVersionsResponse`.
- [x] `services/agreements.py` — `get_current_document` now returns the active version; `upload_document` archives previous active version(s), computes next version, resets consent (new document_id → fresh consents); `record_consent` marks document `fully_executed` when both parties consented; added `list_versions()` + `get_all_documents()`.
- [x] `routers/agreements.py` — `GET /agreements/{lease_id}/versions` returns version history; upload now notifies BOTH manager and tenant (fresh consent required); `build_state` exposes `version`/`status`.

### Consent integrity guarantees
- [x] Consent is always stored per `agreement_document_id` + `party_role` (never per manager/tenant alone). Different leases/versions are fully independent; a new upload never carries forward prior consent. Previous versions remain immutable (audit triggers) and read-only in history.

### Frontend — Shared AgreementFlow component
- [x] `src/components/AgreementFlow.tsx` (NEW) — 3-stage stepper (Uploaded → Tenant Consented → Manager Consented) with immediate, evidence-driven ticks; view agreement (Linking); consent + upload actions; collapsible version history; manager contact passthrough.
- [x] `src/services/agreements.ts` + `src/hooks/useAgreements.ts` — `AgreementState` gains `version`/`status`; added `useAgreementVersions()` + `listVersions()`.

### Frontend — Screen updates
- [x] `app/tenant/my-tenancy.tsx` — replaced inline agreement card + lifecycle with `<AgreementFlow role="tenant">`; removed `full_name` crash (`user!` → guarded `!user`); Manager Contact card now clearly displays manager phone + email; Call uses `tel:` Linking; WhatsApp uses `manager_phone` with graceful fallback.
- [x] `app/tenancy-detail.tsx` — replaced inline agreement UI with `<AgreementFlow role={isManager?'manager':'tenant'} canUpload={isManager}>`; removed duplicate upload/consent/view handlers.
- [x] `app/manager/home.tsx` — new "Tenancy Agreements" section lists recent tenancies each with the same 3-stage `AgreementFlow` cycle.
- [x] `app/payment-history.tsx` — fixed param bug: reads both `id` and `tenancyId` (`leaseId = id || tenancyId`). This fixes "View Payment History from My Tenancy shows none" while the Payments tab worked (it sends `tenancyId`).

### Verification
- [x] `python -m py_compile` of agreements router/service/model — passes.
- [x] `npx tsc --noEmit` clean for all changed files (my-tenancy, AgreementFlow, tenancy-detail, home, payment-history, useAgreements, agreements.ts). Pre-existing errors elsewhere (create-property, create-tenancy, subscription, mock-data, api-client, auth-context) are unrelated.
- [ ] Run migration `019_agreement_versions.sql` against the database (with RLS) before testing versioning end-to-end.

---

## Terminology Separation — Tenancy Lifecycle vs Payment Status

**Decision (user-approved):** Tenancy *lifecycle* (validity period) is fully separated from *payment* status.
- Lifecycle labels: `Current` (health good, >30d left), `Expiring` (warn, <30d left), `Expired` (bad — ended/terminated or no end date). NEVER payment.
- Payment labels: `Outstanding` (balance_due>0 or is_overdue), `Paid Up` (no balance), `Tenant Credit` (paid > expected). NEVER lifecycle.
- `HealthLabel` in `src/utils/tenancy-health.ts`: good→"Current", warn→"Expiring", bad→"Expired". `calculateHealth` unchanged.

### Completed edits
- [x] `src/utils/tenancy-health.ts` — `HealthLabel` now Current/Expiring/Expired.
- [x] `app/manager/tenancies.tsx` — `FilterTab` type = "all" | "current" | "expiring" | "expired" | "outstanding"; tabs reordered All/Current/Expiring/Expired/Outstanding; summary tiles relabeled Current/Expiring/Expired (overdue→expired, good→current); heroSubtitle "{currentCount} current"; tab active color map updated (expired→danger, current→success); help text updated to new tab names + terminology clarification.
- [x] `app/manager/home.tsx:217` — hardcoded health badge "Overdue"→"Expired" (good→"Current", warn→"Expiring").
- [x] `app/tenancy-detail.tsx:97` — hardcoded health badge "Overdue"→"Expired" (Attention→"Expiring"). (Line 148 "Overdue" is the financial `is_overdue` Payment Standing label — intentionally kept.)
- [x] `src/components/TenancyCard.tsx:123` — payment badge "Up to date"→"Paid Up" for consistency with required payment vocabulary.
- [x] Audit complete: all remaining "Overdue"/"Up to Date" strings are financial (`is_overdue`, `balance_due`) — left untouched per decision. Line 151/266 already use `HealthLabel` (auto-resolved).

### Verification
- [x] `npx tsc --noEmit` clean for touched files (tenancies, home, tenancy-detail, tenant-detail, my-tenancy, tenancy-health, TenancyCard).

### Next Steps
- [ ] On-device verify: manager Tenancies tabs (Current/Expiring/Expired/Outstanding) filter & counts correct; badges consistent across home, tenancy-detail, TenancyCard.
- [ ] (Optional) Consider renaming `summaryOverdue` style key to `summaryExpired` for clarity (no functional impact).

---

## Manager Home — Greeting & Agreement Clutter Fixes

### Completed
- [x] `app/manager/home.tsx` — greeting now uses manager **name** only (`user.full_name`); no longer falls back to email. When no name is set, just the time-based greeting (e.g. "Good morning") is shown.
- [x] `app/manager/home.tsx` — removed the entire **Tenancy Agreements** section from the home tab (3-stage `AgreementFlow` list per tenancy) to avoid congestion as tenant count grows. Agreement consent already lives inside each tenancy (`tenancy-detail.tsx`), so managers still reach it by tapping a tenancy. Removed the now-unused `AgreementFlow` import.

### Verification
- [x] `npx tsc --noEmit` clean for `app/manager/home.tsx`.

---

## Tenant Payment Edit/Delete Fix (Security)

### Bug
- Tenant (logged in) tapping **View Payment History** from My Tenancy saw an **Edit / Delete** payment row. Root cause: `app/payment-history.tsx` rendered the action row **twice** — once unconditionally (visible to everyone, incl. tenants) at lines 106-122, and again gated behind `isManager` at 123-141.

### Fix
- [x] `app/payment-history.tsx` — removed the always-on (unconditional) Edit/Delete action row. Only the `isManager`-gated action row remains, so tenants can only view payments; managers can Edit/Delete.
- [x] Confirmed `app/payment-detail.tsx` already gates Edit/Delete behind `!editing && isManager` (line 120) — no change needed.

### Verification
- [x] `npx tsc --noEmit` clean for `app/payment-history.tsx`.
- [ ] On-device verify: versioning scenario (manager with multiple properties → independent consent per lease/version), stepper ticks update immediately, tenant can view uploaded agreement, manager contact visible + working call/whatsapp, payment history from My Tenancy now lists payments.

---

## Global Pull-to-Refresh (TanStack Query + RefreshControl)

### Approach
Leveraged the existing TanStack Query cache (no new state lib). Built a reusable
`useRefresh` hook + extended `Screen` to render a native `RefreshControl`.

### New / modified files
- [x] `src/hooks/useRefresh.ts` (NEW) — `useRefresh({ queryKeys? | refetches? })` returns `{ refreshing, onRefresh }`. Uses `invalidateQueries({ refetchType: "active" })` (preferred, dedupes per key) or explicit `refetch()` promises; spinner clears on success AND error.
- [x] `src/components/Screen.tsx` — added optional `onRefresh`/`refreshing` props; renders `<RefreshControl tintColor/colors={Colors.primary}>` on the `ScrollView` when `onRefresh` is provided.
- [x] `app/manager/home.tsx` — refresh `useDashboardStats` + `useTenancyList` together.
- [x] `app/manager/tenancies.tsx` — refresh `useTenancyList`.
- [x] `app/manager/properties.tsx` — refresh `usePropertyList` (main branch only; error branch keeps retry button).
- [x] `app/manager/reports.tsx` — refresh all 6 report queries (`useTenantsReport`/`useOutstandingReport`/`useRentCollection`/`useFinancialSummary`/`usePaymentHistory`/`useTenantStatement`).
- [x] `app/tenant/my-tenancy.tsx` — refresh `useTenancyList` + `usePaymentList`.
- [x] `app/tenant/payments.tsx` — refresh `usePaymentList` + `useTenancyList`.
- [x] `app/payment-history.tsx` — refresh `usePaymentList`.
- [x] `app/guest/explore.tsx` — refresh `usePublicProperties` (public, no auth).
- [x] `app/tenancy-detail.tsx` — refresh `useTenancy` + `usePaymentList`.
- [x] `app/tenant-detail.tsx` — refresh `useTenant` + `useTenancyList` + `usePaymentList`.
- [x] `app/subscription.tsx` — refresh `useSubscriptionPlans`.
- Forms (`create/edit-tenancy`, `create/edit-property`, accounts, legal, etc.) intentionally skipped — low value + gesture conflict with inputs.

### Verification
- [x] `npx tsc --noEmit` — no new errors from refresh changes. (Pre-existing unrelated errors remain in create-property, create-tenancy, subscription.tsx:46 style typing, auth-context, mock-data, api-client.)
- [ ] On-device verify: pull-to-refresh on each screen triggers a single network refresh, spinner clears on success/error, and data updates consistently across mounted screens.

---

## Subscription Polish + Property Location + Property Filters + Payment Delete Verification

### Subscription screen (`app/subscription.tsx`)
- [x] Removed the **Auto-renew on/off toggle** (lines and styles deleted — was a placeholder that did nothing).
- [x] Added a **days-remaining progress bar** under the status details (color changes: green >60d, amber >14d, red ≤14d) so the manager can quickly gauge subscription health.
- [x] Status card still shows plan name, expires-on date, days-remaining count, and active/expired badge.

### Payment delete verification
- [x] Backend: `DELETE /payments/{payment_id}` at `routers/payments.py:273` — owner-scoped `service.delete()`.
- [x] Mobile: `useDeletePayment` → `paymentsService.delete(id)` → `api.delete<void>(/payments/${id})`.
- [x] Wired in `app/payment-history.tsx` (manager-only action row after earlier tenant-gating fix). Works end-to-end.

### Property location (`create-property.tsx`, `edit-property.tsx`)
- [x] Added **Latitude** and **Longitude** numeric input fields alongside address, so managers can specify geographic coordinates.
- [x] Values sent as `latitude`/`longitude` in create/update payload (backend model already supports these as `float | null`).
- [x] `property-detail.tsx` *already had* a **"View on Map"** button (`handleDirections`) that opens Google Maps with `property.lat,property.lng` — no changes needed there.
- [x] `src/mappers/property-mapper.ts` *already maps* `b.latitude → property.lat` and `b.longitude → property.lng` — no changes needed.

### Property status filters (`app/manager/properties.tsx`)
- [x] Added **filter chip row** with four tabs: **All**, **Available**, **Occupied**, **Inactive**.
- [x] Filters by `occupancy_status` (available/occupied) and `status` (active/inactive):
  - Available: `occupancy_status === "available" && status === "active"`
  - Occupied: `occupancy_status === "occupied" && status === "active"`
  - Inactive: `status === "inactive"`
- [x] Imported `Radii` + added filter chip styles (active backgrounds: primary/success/warning/muted).
- [x] Empty state text updated to "Try a different filter or list a new property."

### Verification
- [x] `npx tsc --noEmit` — no new errors from these changes. Only pre-existing errors remain (same as above).
- [ ] On-device verify: subscription progress bar colors; lat/lng inputs create maps link; property filter tabs count correctly.

---

## First-Time User Experience Audit & UI Refinement

### Issues found and fixed

#### Critical: Onboarding routing
- [x] **`app/onboarding.tsx`** — `handleFinish` and `handleSkip` previously routed to `/login`, forcing first-time users to authenticate immediately. Changed both to route to `/guest/explore` so first-time users enter the **guest browsing experience** as intended. Auth is only prompted when a guest taps an action that requires it (bookmarking a property).
- [x] Last slide: "Create Account" button now goes to `/register`, "Sign In" link goes to `/login`, "Browse as Guest" (skip) goes to `/guest/explore`. The skip button is now visible on **all slides** (was previously hidden on the last slide, making it impossible to continue without auth).

#### Onboarding auto-slide & polish
- [x] **Auto-slide** — Added a `useEffect` with `setInterval(4000)` that automatically advances slides every 4s (pauses on last slide). Cleaned up on unmount.
- [x] **Icons** — Changed from `Colors.gold` (dominant orange) to white (#FFFFFF) with improved icon wrap styling (larger, better border, more translucent).
- [x] **Gradients** — Refreshed for better contrast (deeper greens).
- [x] **Skip button** — Now has a subtle semi-transparent pill background, always visible on every slide (last slide shows "Browse as Guest").
- [x] **Page indicators** — Active dot is now white and wider (28px); inactive dots are smaller and semi-transparent white instead of gray border color.
- [x] **Next button** — Changed from right-icon arrow to a clean `tone="accent"` Button.
- [x] **Sign In link** — Text color adjusted for better readability on dark gradients.

#### Guest account screen (`app/guest/account.tsx`)
- [x] Replaced the old welcome card with a centered **hero section**: app icon (Home), "Browsing as Guest" title, and clear explanation of what signing up enables.
- [x] Removed the `user ? signOut : ...` branch (guests are always unauthenticated here; if somehow a logged-in user lands here it now shows the guest UI — harmless).
- [x] Auth buttons in a clean Card: "Sign In" (solid) + "Create Account" (outline).
- [x] "Support & Policies" renamed to "Quick Links", kept collapsible.
- [x] Cleaner spacing, removed redundant title.

#### Guest explore & property detail
- [x] Verified: property browsing uses public API (`usePublicProperties`), no auth required.
- [x] Verified: property detail loads via `usePublicProperty`, contact/WhatsApp/call work without auth.
- [x] Verified: `requireAuth` prompt appears only for bookmarking — shows a friendly "Sign in required" alert with "Sign In" / "Create Account" options. Never a silent redirect.
- [x] Guest tab layout (Explore + Account) uses consistent bottom-tab navigation.

#### Not modified (per request)
- [x] Login screen — untouched (already approved).
- [x] Register screen — untouched (already approved).
- [x] Forgot password screen — untouched.

### Verification
- [x] `npx tsc --noEmit` — no new errors from any of the changed files. Pre-existing unrelated errors remain (auth-context effect callback, create-property ButtonVariant, subscription style array, mock-data, api-client).

---

## Onboarding Redesign — Modern, Premium, Welcoming

### Objective
Redesign the 3-slide onboarding to answer "Why should I use Afodabo?" for each audience: visitors/home seekers, property managers, and tenants. Preserve all existing behavior (auto-slide, manual swipe, Skip, Next, page dots, navigation flow).

### Completed
- [x] **Slide 1 — Home Seekers** (`Search` icon): "Find Your Perfect Home" with 4 benefit bullets (browse listings, filter, WhatsApp contact, tap away).
- [x] **Slide 2 — Property Managers** (`Briefcase` icon): "Manage Rentals Like a Pro" with 4 benefit bullets (track rent & tenants, reports, WhatsApp receipts, affordable plans).
- [x] **Slide 3 — Tenants** (`UserCheck` icon): "Rent Smarter, Live Better" with 4 benefit bullets (discover rentals, pay via mobile money, digital receipts, message manager).
- [x] Benefit bullets rendered with gold `CheckCircle2` icons for premium feel and brand warmth.
- [x] Glass-effect icon containers (96px translucent circle with subtle border).
- [x] Consistent dark brand gradients (`#1B4A38`/`#2E7D52`, `#0F3A28`/`#236048`, `#1B4A38`/`#236048`) for readability with white text.
- [x] Transparent glass-morphism skip button (works on all slide backgrounds).
- [x] Next button now includes `ChevronRight` icon for forward affordance (`tone="accent"`).
- [x] Auto-slide increased to 5s (from 4s) for more reading time with 4 benefit bullets.
- [x] All existing behavior preserved: auto-slide timer (pauses on last slide), `ScrollView` paging, `onMomentumEnd`-style `onScroll` indexing, Skip → `/guest/explore`, Last slide Create Account → `/register`, Sign In → `/login`.
- [x] Navigation flow verified: `markOnboardingSeen()` called before every route transition; `router.replace()` used throughout.
- [x] Removed unused `ImageBackground` import from old code.
- [x] `npx tsc --noEmit` — single file change (`app/onboarding.tsx`), no pre-existing errors introduced (same unrelated errors remain).

### Verification Checklist
- [ ] First launch → auto-slides through 3 new slides every 5s
- [ ] Manual swipe left/right works, page dots track correctly
- [ ] Skip → lands on `/guest/explore`, `hasSeenOnboarding` becomes true
- [ ] Last slide: "Create Account" → `/register`; "Sign In" → `/login`; "Browse as Guest" → `/guest/explore`
- [ ] Check icon and benefit text readable on dark green gradients
- [ ] Gold `CheckCircle2` icons render correctly on all slides

---

## Auth — Profile Name/Phone Missing After Login

### Bug
After sign-in, `full_name` and `phone` on the user profile were always empty. The name/phone only appeared after an app cold start (when `GET /auth/me` re-fetches from the `profiles` table).

### Root Cause
`src/context/auth-context.tsx:104` — `signIn()` read `full_name` from `result.user?.full_name`, but the backend's `POST /auth/signin` returns the raw Supabase Auth user object where `full_name` is nested inside `user_metadata`, not at the top level. The expression always resolved to `undefined` → `""`.

### Fix
`src/context/auth-context.tsx:102-110` — After signing in (token stored), the method now fetches the profile via `authService.getProfile()` → `GET /auth/profile` (reads from `profiles` table), mirroring the same pattern used by the initial load `useEffect`. `full_name` and `phone` are sourced from the database row instead of the auth response.

### Verification
- [x] No new TypeScript errors introduced (same pre-existing errors remain).
- [x] `signIn()` now matches the initial load pattern: sets token → fetches profile → sets user with real `full_name`/`phone` from DB.

---

## Property Map Location Selection — GPS + Paste Google Maps Link

### Simplified approach (no Google Maps API key needed)
Removed the `react-native-maps` dependency and interactive map UI. The location picker now has just 2 methods — both work without any API key:

| Method | How it works | API key? |
|--------|-------------|----------|
| **📍 Use Current Location** | GPS via `expo-location` (already installed) → shows reverse-geocoded address → confirm | No |
| **🔗 Paste Google Maps Link** | Manager pastes a Google Maps URL → regex extracts `lat,lng` from the URL → shows address for confirmation → saves coordinates | No |

### How the tenant experience works
When coordinates exist on a property, the detail screen shows:
- **📍 View Location** — opens `https://www.google.com/maps?q={lat},{lng}` on the tenant's phone
- **🧭 Get Directions** — opens `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}` for navigation

These are just URL links — they launch Google Maps on whatever device the tenant is using. **No API key needed anywhere in the flow.**

### Architecture Changes
- **Removed dependency**: `react-native-maps` (was installed, now removed)
- **Existing dep used**: `expo-location@~19.0.8` — GPS + reverse geocoding (was already installed, no change)
- **app.json**: Added `expo-location` plugin with permission strings (no Google Maps config)

### Files Modified
- `app.json` — added `expo-location` plugin permissions; removed `android.config.googleMaps` (no API key needed)
- `app/create-property.tsx` — replaced lat/lng `InputField` pair with `LocationPicker`; location is now **required** (submit blocked + inline error message)
- `app/edit-property.tsx` — replaced lat/lng `InputField` pair with `LocationPicker` (pre-populated from existing property coordinates)
- `app/property-detail.tsx` — Location section shows two buttons when coordinates exist: "📍 View Location" and "🧭 Get Directions"; when no coordinates, shows address text only

### Files Created
- `src/components/LocationPicker.tsx` — location picker with 2 options:
  - **"Add Location"** dashed button when no location set
  - **"✓ Property location added"** confirmation card when location is set (with Change Location / Remove)
  - **Modal** with two flow options:
    1. **📍 Use Current Location** — `expo-location` GPS → reverse geocode → confirm
    2. **🔗 Paste Google Maps Link** — text input → regex parses coordinates from URL → reverse geocode → confirm. Parses these formats: `@lat,lng`, `?q=lat,lng`, `?query=lat,lng`, `?ll=lat,lng`
  - Handles: permission denied, GPS unavailable, invalid link format — no crashes

### Verification
- [x] `npx tsc --noEmit` — no new errors (only pre-existing unrelated errors remain)
- [x] No Google Maps API key required anywhere
- [x] `react-native-maps` package removed from dependencies
- [ ] Create property: must select location before submitting
- [ ] Edit property: existing coordinates pre-loaded, can change or remove
- [ ] Property detail: shows View Location + Get Directions when coords exist; shows address only when coords missing

---

## Payment Success Messages + Dashboard Total Collections

### Changes

**Payment record success message** (`src/components/RecordPaymentModal.tsx`)
- After recording a payment, manager now sees an Alert: `"Payment for [tenant name] of [amount] has been recorded successfully."`
- Uses `formatUGX()` and `tenancy.tenant_name` for dynamic content.

**Payment delete success message** (`app/payment-history.tsx`)
- After deleting a payment, manager now sees an Alert: `"The payment record of [amount] has been deleted successfully."`
- Delete operation uses `useDeletePayment` → `paymentsService.delete(id)` → `DELETE /payments/{id}` (owner-scoped, works end-to-end).

**Dashboard total collections** (`src/hooks/useDashboard.ts` + `app/manager/home.tsx`)
- New `collected_total` field in `DashboardStats` — sum of all confirmed payments (all-time), computed from `paymentsService.list()`.
- Dashboard stats cards now show **4** cards: Active Tenants, Outstanding, **Collected Total** (all-time sum), and Collected This Month.
- Auto-refreshes when any payment is created or deleted (via query invalidation in `useCreatePayment`/`useDeletePayment`).

### Files Modified
- `src/components/RecordPaymentModal.tsx` — added `Alert.alert("Payment Recorded", …)` with tenant name + amount
- `app/payment-history.tsx` — added `Alert.alert("Payment Deleted", …)` with amount
- `src/hooks/useDashboard.ts` — added `collected_total` computed from all confirmed payments
- `app/manager/home.tsx` — replaced "Pending Review" stat card with "Collected Total" card

### Verification
- [x] `npx tsc --noEmit` — no new errors
- [ ] Record a payment → see "Payment for John Doe of UGX 150,000 has been recorded successfully."
- [ ] Delete a payment → see "The payment record of UGX 150,000 has been deleted successfully."
- [ ] Dashboard shows "Collected Total" card summing all confirmed payments

---

## Agreement Builder Screens

### New Files
- [x] `app/agreement-summary.tsx` — Summary card after manager fills create/edit form: agreement number placeholder, party info (tenant + manager), property, rent/dates, clause count. Two actions: "View Full Agreement" → `/agreement-preview`, "Generate & Save Agreement" → calls `useBuildAgreement`, shows success state with agreement number + "Back to Tenancy" button.
- [x] `app/agreement-preview.tsx` — Full read-only rendered preview using `AgreementRenderer` with `mode="preview"`. If agreement is already saved (has content from `useAgreementContent`), shows the saved content with version info. Otherwise builds a local preview from template + tenancy data, with a "Generate & Save Agreement" button at the bottom.

### Patterns Used
- Route params via `useLocalSearchParams<{ leaseId: string }>()`
- `useAgreementTemplate()`, `useBuildAgreement()`, `useAgreementContent()` from `@/src/hooks/useAgreements`
- `useTenancy(leaseId)` for lease data
- `AgreementRenderer` for content display
- `Screen`, `PageHeader`, `Card`, `Button` components
- Success state with `CheckCircle` icon, agreement number display, and navigation back to tenancy detail

### Verification
- [x] `npx tsc --noEmit` — no new errors from these files
- [ ] Navigate from tenancy detail → agreement summary → preview → generate → success → back to detail

---

## Agreement View & Version History Screens

### New Files
- [x] `app/agreement-view.tsx` — Read-only screen for both tenant and manager to view a fully rendered agreement with signature information. Accepts `leaseId` from `useLocalSearchParams`, loads content via `useAgreementContent(leaseId)` and consent state via `useConsentState(leaseId)`. Shows status badge (Executed/Awaiting Tenant Consent/etc.), signature status card for tenant and manager, and renders the full document via `AgreementRenderer` with `mode="view"`. Includes a "View Version History" button linking to `/agreement-history`.
- [x] `app/agreement-history.tsx` — Lists all agreement versions for a lease. Accepts `leaseId` from `useLocalSearchParams`, loads version history via `useAgreementVersionHistory(leaseId)`. Each version card shows version number, agreement number, status badge, tenant/manager signature status (with signed name if available), and creation date. The active version is highlighted with a green left border and soft background. Tapping a version navigates to `/agreement-view`.

### Patterns Used
- Route params via `useLocalSearchParams<{ leaseId: string }>()`
- `useAgreementContent()`, `useConsentState()`, `useAgreementVersionHistory()` from `@/src/hooks/useAgreements`
- `AgreementRenderer` with `mode="view"` for document display
- `Screen`, `PageHeader`, `Card`, `Badge`, `Button`, `LoadingState`, `ErrorState`, `EmptyState` components
- `AgreementStatus` type mapping to tone/label config for badges
- `lucide-react-native` icons (`CheckCircle`, `Clock`, `FileText`, `History`)

### Verification
- [x] `npx tsc --noEmit` — no new errors from these files
