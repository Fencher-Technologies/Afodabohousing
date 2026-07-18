# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Complete: Initial context refactoring for Afodabo Housing.
- Complete: alignment of mobile specs to the real web app and Supabase backend.
- In progress: first full mobile implementation against the shared Supabase project.

## Current Goal

- Fix tenant my-tenancy manager contact: added explicit per-lease fallback in `list_leases` endpoint that queries `profiles` via service client when `_enrich_leases` doesn't populate the manager contact fields. The `_enrich_leases` function already uses the service client (via `get_lease_svc` change), but this double-defense ensures manager contact resolves even when the batch profiles query returns empty.
- Fix agreement consent: migration `020_allow_agreement_status_updates.sql` modifies the `prevent_agreement_evidence_mutation` trigger to allow status/is_active changes on `agreement_documents` while keeping evidence columns immutable.

## Completed

- Refactored `project-overview.md` to reflect Afodabo Housing.
- Refactored `architecture.md` for React Native/Expo.
- Replaced `ai-workflow-rules.md` with `workflow-rules.md`.
- Refactored `code-standards.md` for mobile development.
- Refactored `ui-context.md` with the new design system.
- Re-aligned product, architecture, and UI context to the actual Vite web app and existing Supabase backend.
- Added shared mobile infrastructure:
  - Supabase client and typed schema
  - React Query provider
  - auth/session context
  - theme tokens and reusable UI primitives
- Replaced the placeholder Expo starter screens with a role-aware mobile app shell.
- Implemented guest property discovery and property detail flows.
- Implemented mobile login and registration against the same Supabase backend as web.
- Implemented first-pass tenant, manager, and admin dashboards with backend-connected actions.
- Added mobile environment configuration for the shared Supabase project.
- Replaced AsyncStorage-backed Supabase session persistence with Expo SecureStore-backed session storage.
- Expanded manager workflows with tenancy notifications, rent reminders, proof review access, and richer tenant messaging.
- Expanded admin workflows with user search and payment proof review.
- Added mobile equivalents for the web app's About, Contact, Privacy Policy, and Terms of Service routes.
- Removed consumer-facing technical wording and demo-only login shortcuts from the app UI.
- Verified `npm run tsc`, `npm run lint`, and `npx jest --runInBand --passWithNoTests`.
- Refactored the mobile app toward a cleaner shell-and-hooks architecture inspired by the approved extraction blueprint:
  - added reusable loading, error, page-header, message, and scrollable screen primitives
  - introduced tenant, manager, and admin dashboard hooks
  - rewired tenant dashboard and tenant messages into a clearer screen -> hook -> service flow
  - adapted manager and admin dashboards to use the same mobile-first loading/error/dashboard shell
- Added a backend API adapter layer so the mobile app can use the Python FastAPI service for aligned property, lease, payment, message, and profile flows while keeping Supabase auth/session handling in place.
- Adapted mobile tenant and manager workflows to the Python backend and converted unsupported tenancy-linking/admin-global actions into explicit mobile limitations instead of broken flows.
- Replaced direct Supabase mobile auth/session usage with backend-token auth storage so the app now boots from FastAPI configuration only.
- Removed direct mobile calls to Supabase auth, storage, and edge functions; unsupported backend-only gaps now surface as explicit temporary limitations instead of runtime config crashes.
- Restored major backend-only platform flows by expanding the Python API:
  - role-aware signup for tenant and house manager registration
  - authenticated query context for backend reads
  - tenant lease loading based on tenant identity instead of owner identity
  - manager tenancy creation by resolving registered users from email
  - backend upload endpoints for payment proofs and property images
  - backend Pesapal initiation for mobile payment redirects
- Removed the redundant mobile post-signup profile patch so account creation now relies on the backend's own profile and role provisioning instead of failing on an immediate second authenticated write.
- Hardened post-signup role routing by persisting the intended mobile session role and using it as a fallback during auth hydration, so newly created house manager accounts no longer drop into the tenant shell when backend role reads are delayed or partial.
- Relaxed public property reads and made tenant property-title enrichment resilient so explore, tenant dashboard, and tenant messages are no longer taken down by non-`available` property statuses or one failed property lookup.
- Added a backend auth-validation fallback that resolves the current user through Supabase when local JWT/JWKS verification rejects a bearer token, so protected mobile routes can still authenticate against the real token format issued by the project.
- Added a permanent backend token-verification path for both RS256 JWKS tokens and legacy HS256 Supabase tokens via `SUPABASE_JWT_SECRET`, so protected mobile routes no longer depend on one signing mode assumption.
- Simplified backend auth to use Supabase Auth token validation directly on protected routes, removing the extra JWT-secret requirement and keeping the backend aligned with the existing environment variables already present in the repo.
- Fixed the shared mobile select dropdown layering/positioning so filter menus render in a proper full-screen overlay with consistent trigger spacing on Android instead of overlapping their own buttons.
- Corrected the Android dropdown anchor offset in the shared select component after the first overlay fix regressed upward positioning on device-specific modal coordinates.
- Moved the manager `List New Property` and `Create Tenancy` flows into dedicated stack routes so those workflows no longer expand large inline forms inside the dashboard view.
- Made property photo selection explicit in the dedicated `List New Property` screen so managers can choose and preview listing images before saving instead of discovering photo upload only at submit time.
- Reverted the compact page-header experiment after it regressed the manager dashboard route, restoring the prior shared header behavior before attempting a safer spacing adjustment.
- Added backend refresh-token support plus mobile session refresh/retry handling so expired access tokens no longer force unauthorized dashboard/message requests or misroute signed-in managers into the tenant shell.
- Tightened the shared page-header title metrics on Android with explicit line height and disabled font padding so serif route titles no longer leave oversized blank space beneath them.
- Reverted the last route-specific React Navigation header experiment after it did not resolve the oversized blank space issue cleanly.
- Fixed an endless manager-dashboard loading spinner by narrowing the focus-refetch dependencies so the screen refreshes once on focus instead of re-triggering continuously as query state changes.
- Added a first-launch onboarding flow in the current app's design language, persisted through secure local storage and wired into the real root navigation flow instead of a mock preview path.
- Added dedicated backend-connected mobile routes for the feature gaps found in the comparison app:
  - tenant payment centre with live payment history, filtering, proof upload, and Pesapal initiation
  - manager properties list plus dedicated property detail
  - manager tenancies list plus dedicated tenancy detail with reminder actions
  - manager conversation list plus dedicated reply thread
  - unsupported-role handling for authenticated accounts that are not yet provisioned for mobile
- Reworked tenant and manager entry points so the new screens are reachable from tabs, dashboards, and account actions without introducing any direct client-side Supabase data calls.
- Reworked onboarding into a true full-screen step flow with a top-right dismiss action, single visual stage, step progress, and left/right navigation instead of stacked card sections.
- Fixed auth hydration so unauthorized backend sessions and unresolved roles no longer fall back into the tenant shell by default; invalid sessions are now cleared and unknown roles stay unresolved instead of silently misrouting house managers.
- Reduced redundant in-screen headings and helper copy across manager, tenant, and admin flows so role screens no longer repeat labels like workspace/property/tenancy detail or show the old "Dedicated Workspaces" wording.
- Removed duplicate manager-side in-page headers where React Navigation already provides the real screen title, and dropped the extra overview navigation card from the manager dashboard.
- Split manager responsibilities more cleanly across tabs by removing property and tenancy sections from the dashboard and moving their working controls into the dedicated Properties and Tenancies tabs, including the rental-unit form and reminder actions.
- Updated manager property photo selection so choosing more images appends to the current draft instead of replacing it, with explicit remove controls for individual images before submit.
- Added refresh-token retry handling to backend upload requests so expired sessions no longer break property-image or payment-proof uploads with raw 401 errors.
- Restored property contact phone/email persistence through the backend contract and moved manager property editing into a dedicated screen instead of inline editing inside the properties tab.
- Tightened profile persistence during backend signup so phone numbers and names are written independently of role assignment quirks, and finished the dedicated manager property edit route as the only edit path from the properties list.
- Added a backend migration for `properties.manager_email` and `properties.manager_phone` so manager contact fields can be stored by the live property create/edit flows instead of crashing on schema-mismatch writes.
- Added the same property-contact schema fix to the real top-level Supabase migrations folder plus a Python `psql`-based migration runner in the backend so future SQL changes can be applied from the command line when a database URL is available.
- Hardened backend auth calls against intermittent Supabase network failures by adding retries and returning a truthful temporary-service error for upstream connectivity problems instead of misclassifying them as invalid credentials.
- Reworked the manager property details page into a full listing-style view with a paged photo gallery, clearer property detail sections, amenities, and rental unit cards so managers can inspect listings in a proper read-first layout before editing.
- Fixed manager tenancy creation by removing the backend dependency on the missing `get_user_id_by_email` RPC, added a styled calendar-based date picker flow for tenancy dates, and introduced downloadable tenancy-agreement PDF generation from the live create-tenancy form data.
- Expanded the manager and tenant experience around the remaining spec gaps without reintroducing direct client-side Supabase usage:
  - deeper Explore filters for bedrooms, bathrooms, and amenities
  - manager-side listing activation/deactivation controls inside the real Properties tab
  - property photo guardrails enforcing a 3-to-10 image listing gallery at creation time
  - manager dashboard reporting for due-soon rent, overdue rent, rent-review windows, occupancy snapshot, and recent confirmed payments
  - downloadable payment receipts from confirmed payment records
  - downloadable editable tenancy-agreement exports in addition to PDF downloads
  - stronger map/directions launching from property details
  - email-verification guidance surfaced in-account when the auth metadata indicates the account is not confirmed yet
- Corrected property-title handling across the mobile/backend boundary by:
  - treating `title` as a real backend property field instead of overloading address/description
  - updating the mobile backend mapper to send and read `title` explicitly
  - adding a Supabase/backend SQL migration to backfill and require `public.properties.title`
- Corrected tenancy-agreement period math so agreement totals now reflect the actual selected billing span, and added current-month manager dashboard cards for rent due versus rent collected.
- Decoupled manager conversations from the full dashboard fetch so message loading is not blocked by unrelated manager endpoints, and regrouped tenant messages into conversation cards with thread-aware replying and less duplicate read-marking traffic.
- Polished manager dashboard empty-data sections with centered soft-cream placeholder panels instead of loose inline text so no-activity states feel intentional.
- Brought tenant messaging into the same conversation-list plus dedicated-thread pattern as the manager side, so tenant messages are now grouped by person consistently across roles.
- Prepared backend deployment handoff assets for Render based on the real FastAPI `Backend` branch, and updated mobile setup docs to use `EXPO_PUBLIC_API_BASE_URL` instead of the old direct-Supabase environment variables.

## In Progress

- Refining dashboard depth and native polish now that the end-to-end mobile foundation is in place.
- Continuing to split heavyweight dashboard screens into lighter, reusable mobile modules while preserving backend-connected workflows.
- Validating the first Python-backend-connected mobile pass and tightening any type or UX gaps uncovered by verification.
- Converting the remaining backend gaps into either Python-backed flows or clear temporary product limits while keeping the mobile client free of direct Supabase runtime dependencies.
- Verifying the newly restored backend-first registration, explore, dashboard, messaging, upload, and payment flows against live data.
- Continuing to close the remaining product-spec gaps around support/feedback handling and any backend-native reporting that still needs first-class API support beyond the mobile-generated document workflows.

## Completed This Session

- Added password visibility toggles to the `InputField` component — all password fields (login, register) now show an eye/eye-off icon to toggle secure entry, managed via internal state so screens require zero changes.
- Added `cursorColor={colors.primary}` to `TextInput` inside `InputField` so the cursor is clearly visible when tapping any input field (email, password, etc.).
- Added `keyboardShouldPersistTaps="handled"` to the `Screen` component's `ScrollView` so tapping into fields works reliably when the keyboard is open and the user can scroll to reach all form fields.
- Implemented **Tenancy Health color-coding** across manager and tenant screens:
  - Created `src/utils/tenancy-health.ts` — client-side utility computing 5-color health status (green/yellow/orange/red/gray) from `rent_start_date`/`rent_end_date` using `date-fns/differenceInDays`, also returns progress percentage for the progress bar.
  - **Manager dashboard** — replaced split "Due To Pay" / "Overdue Rent" cards with a single consolidated **Tenancy Health** card listing all active tenancies sorted by urgency, each row with a colored dot.
  - **Manager tenancies list** — added a 4px colored left border strip on each card matching health status, plus "X days remaining" text in the matching color.
  - **Manager tenancy details** — added a health status row (colored dot + label + days remaining) and a compact progress bar showing period elapsed percentage.
  - **Tenant dashboard** — upgraded "Days Remaining" stat from 3-color to full 5-color scheme; added a **Tenancy Progress** card with progress bar and health-colored days remaining.
  - Corrected labels to match spec: Healthy (green), Approaching (yellow), Warning (orange), Critical (red), Expired (gray strikethrough).
  - Added `textDecorationLine: 'line-through'` to all expired text across all 4 screens (stat value, progress text, badges, health row, health card rows).
  - Added optional `textDecorationLine` prop to the shared `Badge` component.
  - No backend changes, no new dependencies, no new screens.
- Fixed bug where properties still showed as "Available" after a tenancy was created:
  - **Backend** (`backend/services/crud.py`): `LeaseService.create()` now updates `properties.status = 'occupied'` when a lease is created with `status: 'active'`.
  - **Mobile** (`src/services/properties.ts`): Removed client-side `.filter(status === 'available')` so occupied properties still appear in Explore listings.
  - The existing `PropertyCard` already had a status badge — "Available" (green) vs "occupied" (gray) — so no card changes needed.

- Migrated `expo-av` → `expo-audio` to fix the native Android crash (`UnsatisfiedLinkError` from JSI ABI mismatch with RN 0.86):
  - Installed `expo-audio@~57.0.0` and uninstalled `expo-av`
  - Added `expo-audio` config plugin with microphone permission to `app.json`
  - `message-bubble.tsx`: replaced `Audio.Sound` + `AVPlaybackStatus` with `useAudioPlayer` / `useAudioPlayerStatus`; renamed `playsInSilentModeIOS` → `playsInSilentMode`; `formatDuration` now receives seconds instead of ms
  - `message-composer.tsx`: replaced `Audio.Recording` + manual `setInterval` timer with `useAudioRecorder` / `useAudioRecorderState`; replaced `allowsRecordingIOS` → `allowsRecording`; replaced `recording.getURI()` → `recorder.uri`; removed `Audio.RecordingOptionsPresets` → `RecordingPresets`
  - Confirmed zero remaining `expo-av` references in `src/`; no new TypeScript errors introduced

- Implemented **Property Boost** (high-priority web gap):
  - Created `src/services/boosts.ts` with `initiateBoost()` and `fetchBoostPrice()` — calls `POST /boosts/initiate` and `GET /boosts/price/default`
  - Created `src/screens/boost-property-screen.tsx` — manager selects duration (7/14/30 days), enters phone number, pays via NylonPay mobile money
  - Added `BoostProperty` route to navigation types and `AppNavigator`
  - Added "Boost Listing" button to `ManagerPropertyDetailsScreen` (secondary variant)

- Implemented **Accept Invite** (high-priority web gap):
  - Added `acceptInvite()` to `src/services/auth.ts` — calls `POST /auth/accept-invite`, stores session
  - Created `src/screens/accept-invite-screen.tsx` — form with token, name, phone, password, confirm password
  - Added `AcceptInvite` route to navigation types and `AppNavigator`
  - Added "Accept Invitation" button to Account screen (guest view)

- Implemented **Change Password** (high-priority web gap):
  - **Backend**: Added `POST /auth/change-password` endpoint to `backend/routers/auth.py` with `ChangePasswordRequest` model (current+new password), verifies current credentials via sign-in then updates via admin API
  - **Backend**: Added `change_password()` method to `backend/services/auth.py`
  - **Mobile**: Added `changePassword()` to `src/services/auth.ts`
  - Created `src/screens/change-password-screen.tsx` — current, new, confirm password fields with validation
  - Added `ChangePassword` route to navigation types and `AppNavigator`
  - Added "Change Password" button to Account screen (authenticated view)

## Completed This Session (cont.)

- **Password visibility toggle** — Switched Change Password and Accept Invite screens from raw `TextInput` to `InputField` component so both now have native eye/eye-off toggles on all password fields.
- **Popular District Quick Links** — Added horizontal chip row below hero on Explore screen for Kampala, Wakiso, Mukono, Entebbe, Jinja, Mbarara. Tapping a chip filters by that district; tapping again clears.
- **Revenue Chart** — Created `src/components/revenue-chart.tsx` using `react-native-svg`-free pure View-based bar chart. Shows last 6 months of confirmed payment revenue on Manager Dashboard, replacing the old static revenue card.
- **Renewal Request**:
  - **Backend**: Added `POST /leases/{lease_id}/renewal-request` endpoint; added `request_renewal()` to `LeaseService`; added `RenewalRequest` model + migration-ready pattern.
  - **Mobile**: Added `requestRenewal()` to `src/services/tenant.ts`; added "Request Renewal" button to Tenant Dashboard within the Current Tenancy card.
- **Property Bookmarks / Favorites**:
  - **Backend**: Created `PropertyBookmarkService` with full CRUD; created `backend/routers/bookmarks.py` with `GET /bookmarks`, `POST /bookmarks/{property_id}`, `DELETE /bookmarks/{property_id}`, `GET /bookmarks/check/{property_id}`; registered in `main.py` and `routers/__init__.py`.
  - **Mobile**: Created `src/services/favorites.ts`; created `src/screens/favorites-screen.tsx`; added `Favorites` route to navigation types and `AppNavigator`; added heart toggle icon on `PropertyDetailsScreen` (heart/outline, toggles via mutation).
- **Interactive Map**:
  - **Backend**: Added `latitude`/`longitude` optional fields to Property, PropertyCreate, PropertyUpdate, PropertyResponse models.
  - **Mobile**: Added lat/lng to `BackendProperty` type, mapper, and `PropertyRow` type; added `MapView` with `Marker` on PropertyDetails using `react-native-maps` when coordinates are present; existing "Open Directions" button remains as fallback.
- **Push Notifications MVP**:
  - **Backend**: Added `POST /notifications/push-token` endpoint for Expo push token registration; added `backend/migrations/016_push_tokens.sql` for `push_tokens` table.
  - **Mobile**: Installed `expo-notifications`; created `src/services/notifications.ts` with `registerForPushNotifications()` and `uploadPushToken()`; wired into auth context so push token is registered automatically on login/session restore.

- **In‑App Notifications + Send Invite + Password Fix + Rent Reminder Notification**:
  - **Backend**: Created `services/notifications.py` with `create_notification`, `send_push_notification`, `notify` helpers.
  - **Backend**: Notifications hooked into `payments.py` (confirm/reject), `messages.py` (send), `leases.py` (renewal request, lease create).
  - **Mobile**: Firebase push‑registration crash fixed — `registerForPushNotifications()` wrapped in try/catch.
  - **Mobile**: Manager dashboard resilience — individual try/catch for each of 5 parallel requests in `fetchManagerDashboard()`.
  - **Mobile**: Share listing expanded to include title, location, price, bed/bath, description, manager contacts.
  - **Send Invite**: `sendInvite()` in `auth.ts`, `SendInviteScreen`, route in `ManagerTabs` (hidden tab), button on Manager Tenancies screen; backend `InviteResponse` returns `email`/`role`/`token`/`expires_at`/`status`.
  - **Send Invite**: Uses RN built-in `Clipboard` instead of missing `expo-clipboard`.
  - **Accept Invite**: Wrapped in `KeyboardAvoidingView` for scrollable form.
  - **Change Password**: Backend fixed to use `get_service_client` with `admin.update_user_by_id` (was using anon key).
  - **Rent Reminder → Notification**: Added `POST /sms/send-reminder` backend endpoint that sends SMS + creates in‑app notification for tenant; updated mobile `sendRentReminder()` to call it.

## Completed This Session

- **Fixed subscription payment flow** — Mobile no longer shows "Subscription Active!" immediately after API call:
  - **Backend** (`services/subscriptions.py`): Added sandbox auto-confirm via `threading.Timer` — in sandbox mode, `confirm_subscription()` is called 30s after `create_subscription()` to simulate the NylonPay webhook.
  - **Mobile** (`app/subscription-payment.tsx`): Rewrote status handling to proper payment flow:
    - After API call → shows "Payment Initiated" with step-by-step instructions ("Check your phone", "Enter your PIN", "Wait for confirmation")
    - Polls `GET /subscriptions/current` every 5 seconds until status becomes "active"
    - Shows success only when payment is confirmed (status = "active")
    - Shows "timeout" state after 120s with "Check Status" and "Try Again" buttons
    - Cleaned up timers on unmount via `useEffect` return
  - **DB migration** (`migrations/015_subscriptions.sql`): Fixed schema mismatch — drops old `manager_subscriptions` table (with incompatible columns like `amount_paid`) and recreates it with correct schema matching the service code.

## Phase 1 — Property Module: Backend-First Data

- **Backend** (`services/crud.py` and `routers/properties.py`): Removed `rent_period` filter from `get_public_listings` — DB has no `rent_period` column on `properties` table.
- **Mobile** (`src/mappers/property-mapper.ts`): Created single mapping layer — `fromBackendProperty()` converts backend field names (`monthly_rent`, `bedrooms`, `property_type`, `owner_id`, `state`) to mobile names (`rent_amount`, `beds`, `type`, `manager_id`, `district`). Mapper also handles `rent_amount ?? monthly_rent` for both normalized and raw backend responses.
- **Mobile** (`src/types.ts`): Added `BackendProperty` interface matching backend schema; added `manager_email`, `manager_phone`, `square_feet`, `security_deposit` to `Property` UI model.
- **Mobile** (`src/services/properties.ts`): Aligned `PropertyResponse` → `BackendProperty`; added `listPublic()` and `getByIdPublic()` methods for no-auth endpoints.
- **Mobile** (`src/hooks/useProperties.ts`): Added `usePublicProperties()` and `usePublicProperty()` hooks using the mapper; existing hooks now use mapper too.
- **Mobile** (`app/guest/explore.tsx`): Rewired from mock data to `usePublicProperties()` — fetches from `GET /properties/public`. Removed `mockProperties` and `mockDistricts` imports. Districts dynamically derived from API data. Added loading/error states via `LoadingState` and `ErrorState`.
- **Mobile** (`app/manager/properties.tsx`): Removed manual field mapping — uses `usePropertyList()` which now returns mapped `Property[]` via the mapper. Removed hardcoded `manager_id: ""`, `area: ""`, `sitting_rooms: 0`, `kitchens: 0`. Added loading/error states.
- **Mobile** (`app/property-detail.tsx`): Uses `usePublicProperty()` for guest role (no auth) and `useProperty()` for manager role. Shows actual contact info (phone/email/call/directions/inquiry) from backend data instead of hardcoded strings. Delete button calls `useDeleteProperty()` mutation. Share uses React Native `Share` API. Hides empty sections (description, amenities, deposit, contact). Shows `square_feet` if present. Removed mock `units`/`sitting_rooms`/`kitchens` sections.
- **Mobile** (`src/components/PropertyCard.tsx`): Fixed location display — `[area, district].filter(Boolean).join(", ")` avoids leading comma when area is empty.

## Next Up

## Fixed This Session

- **Payment model rework — recorded payments, overdue, days-based health, deposit removal, payment CRUD**:
  - **Recorded payment = confirmed immediately**: `PaymentCreate.status` default changed from `"pending"` to `"confirmed"` (a manager recording a payment means it happened, so it counts toward the balance right away). Online/NylonPay payments still flow through the webhook as `pending` → `confirmed`.
  - **Balance now reduces on record**: backend `_enrich_leases` now sums payments with `status in ("confirmed","completed")` (was only `"completed"`) for `total_paid`/`balance_due`, so recording a payment visibly lowers the balance.
  - **Overdue (payment-based)**: added `is_overdue` to lease enrichment — `balance_due > 0` AND (lease end date in the past OR started >30 days ago). Surfaced as `is_overdue` on `Tenancy` and shown as a "Overdue / Paid up" stat on `TenancyCard` and on the tenant-detail health panel.
  - **Tenancy health is now days-based, NOT payment-based**: `calculateHealth()` rewritten to return bad when terminated/expired, warn when <30 days remaining, good otherwise. Payment standing is now conveyed separately via `is_overdue`/balance, not via health color.
  - **Removed deposit from the tenant card**: `TenancyCard` deposit stat replaced by a "Standing" (Overdue/Paid up) stat; the `HealthProgress` panel on `tenant-detail.tsx` no longer shows the security deposit line (the field is still kept in data for other uses).
  - **Payment detail + CRUD**: new `app/payment-detail.tsx` screen — shows full payment details (amount, tenant, property, type, method, due/paid dates, balance after, notes, status) with **Edit** (amount, paid date, method, notes via PATCH) and **Delete** (with confirm, via new `DELETE /payments/{id}` backend endpoint + `useDeletePayment`). Payment rows in `tenancy-detail.tsx` and `tenant-detail.tsx` now navigate to this screen.

- **Tenancy / Tenant UX overhaul (cards, app bar, agreement upload, tenant-not-found, health progress)**:
  - **Backend** (`backend/routers/tenants.py`, `backend/services/crud.py`): Added `TenantService.get_by_id_for_manager()` which resolves a tenant either by `owner_id` OR by being linked to a lease owned by the manager. `GET /tenants/{id}` now uses this, so navigating to a tenant from a tenancy no longer hits "Tenant not found" when ownership is recorded on the lease row instead of the tenant row.
  - **Agreement upload was silently broken** — the mobile `useAgreementState`/`agreementsService` expected response fields (`state`, `document`, `both_consented`) that did NOT match the real backend contract (`current_document`, `manager.consented`, `tenant.consented`). Re-aligned the hook/service types: `useAgreementState` now `select`s `{ document, manager_consented, tenant_consented, both_consented }` from `current_document`/`manager`/`tenant`. This fixes the "Completed" badge, re-upload label, and consent state across `tenancy-detail.tsx` and `tenant/my-tenancy.tsx`.
  - **`tenancy-detail.tsx`**: Added "View Agreement" action (opens signed URL via `Linking`), kept re-upload for managers, surfaced upload errors, and relabeled the tenant quick action to **"View tenant details"**.
  - **`TenancyCard.tsx`**: Enriched card with status badge, start–end dates, deposit stat, prominent **days-left** label and a **health-colored progress bar** (via `daysLeft()` / `leaseProgress()`).
  - **`app/manager/tenancies.tsx`**: Redesigned the app bar into a modern primary hero with a 3-stat summary (Overdue / Good / Expiring), real search `TextInput`, and polished filter chips with icons and counts.
  - **`tenant-detail.tsx`**: Added a prominent tenancy-health panel showing health label, **days-left**, a **progress bar**, and the security deposit.
  - **`src/mappers/tenancy-mapper.ts` + `src/types.ts`**: Added `deposit_amount` mapping from backend `security_deposit`.
  - **`src/utils/tenancy-health.ts`**: Added `daysLeft()`, `leaseProgress()`, and `HealthText` helpers.

- **Fixed Manager Dashboard, Properties, and Tenancies screens not rendering**:
  - **Root cause**: `TenantService.get_all()` in `backend/services/crud.py:190` only accepted `(owner_id, skip, limit)` but `routers/tenants.py:39-48` called it with keyword arguments `status=`, `search=`, `has_user_account=`, `created_from=`, `created_to=`, causing a `TypeError` → 500 on `GET /tenants`. Since `fetchManagerDashboard()` in `src/services/manager.ts:120` uses `Promise.all([5 API calls])`, this single failure rejected the entire batch and blocked all three manager screens.
  - **Fix**: Updated `TenantService.get_all()` to accept and apply all 5 filter parameters using Supabase query chaining (`.eq()`, `.ilike()`, `.gte()`, `.lte()`).
  - **Files changed**: `backend/services/crud.py` — added `date` import and expanded `get_all()` signature.

## Fixed This Session

- **Restored Guest Browsing Flow**:
  - **Root cause**: `app/_layout.tsx:36` redirected all unauthenticated users to `/login`, preventing guests from browsing properties.
  - **Fix**: Changed redirect to `/guest/explore` so unauthenticated users land on the Explore tab.
  - **Auth gates**: Added `requireAuth()` helper to `app/property-detail.tsx` — shows Alert with "Sign In" / "Create Account" / "Cancel" options for actions requiring login (bookmark/save). Phone, email, WhatsApp, and directions remain open to guests.
  - **Guest flow verified**: `usePublicProperties()` and `usePublicProperty()` use no-auth endpoints (`/properties/public`), so explore, search, filter, and property details work without a session.
- **Fixed property detail data loading for guests**:
  - **Directions/Location**: Removed `{property.lat && property.lng}` gate that hid the entire section when coordinates are null. Always renders "View on Map" button. `handleDirections` now falls back to the address text (`encodeURIComponent`) when lat/lng are unavailable instead of showing an error alert.
  - **Contact Manager**: Removed `{(phone || email)}` gate that hid the entire section when backend profile enrichment returns nulls. Always renders the section; shows "Phone not provided" / "Email not provided" in italic muted text when missing, and tappable buttons when present.
  - **No mock data**: Both `app/guest/explore.tsx` and `app/property-detail.tsx` use real backend API calls (`usePublicProperties` / `usePublicProperty`). Mock data is only referenced in `app/reports.tsx` (a separate screen).
- **Fixed 401 from auth query on guest property detail**: The auth-required `useProperty(id)` hook was always called (even for guests), firing `GET /properties/{id}` which returned 401 for unauthenticated requests. Added `enabled: isManager` option to `useProperty()` hook signature — the auth query is now disabled for guests, eliminating the unnecessary 401 calls and preventing stale-token refresh loops.
- **Fixed guest explore not showing all properties**: Backend `get_public_listings` in `services/crud.py:168` filtered by `.eq("status", "available")`, which excluded occupied properties. Changed to `.eq("is_active", True)` so all manager-public listings appear — available and occupied — in the guest Explore view.
- **Added WhatsApp message button to guest actions**: Added a `MessageCircle` icon button in the guest secondary actions row (Share → WhatsApp → Call) that opens WhatsApp with a generic interest message via `handleMessage()`. Styled with WhatsApp green (#25D366). The existing "Send Inquiry" primary CTA remains unchanged (uses inquiry template).
- **Confirmed NylonPay for subscriptions**: Payment flow uses NylonPay only (no Pesapal) for manager subscription payments.
- **UI/UX Accent Color Audit**: Thoughtfully introduced the brand orange (`#D4783C` / `accentSoft: #F5E6DC`) in strategic places while keeping green/white dominant:
  - **PropertyCard**: Added "Featured" badge (`tone="accent"`) for boosted listings in guest explore
  - **Guest Explore**: Passes `featured={item.isBoosted}` to highlight boosted properties
  - **Subscription Screen**: Popular plan card uses `accentSoft` background + accent badge; selected state refined
  - **Subscription Payment**: Recommended payment method highlighted with accent border/background + "Recommended" badge
  - **Tenant My Tenancy**: WhatsApp manager button uses accent background (matching WhatsApp green)
  - **Manager Dashboard**: "Collected This Month" stat card icon uses accent; FAB uses accent; "See all" links use accent
  - **Manager Account**: Verified badge uses accent; subscription card icon uses accentSoft; "Manage Subscription" button uses accent tone
  - **Tenant Account**: Verified user avatar uses accent background
  - **Register**: Footer link uses accent color
  - **Create Property**: Selected amenity chips use accent tone
  - **Property Detail**: "Send Inquiry" primary CTA uses accent tone
  - **Onboarding**: Already used accent for active dot indicator
  - **Badge Component**: Already supports `accent` tone via ThemeColors
  - Green remains primary brand color; orange used sparingly for emphasis, premium features, and WhatsApp actions

## Open Questions

- Payment flows should continue using the same backend capabilities as web, including proof upload and NylonPay initiation where supported on mobile.
- Some desktop-only website pages will likely be folded into profile/help entry points rather than mirrored as standalone app screens.
- Deep-link or post-payment return handling can be expanded later if mobile-specific NylonPay callbacks are needed.
- Tenant creation/linking from mobile still needs backend endpoint alignment because the Python service models tenants and leases differently from the original Supabase-first flow.
- Admin mobile should remain a limited-access surface until the Python backend exposes broader platform-wide reporting and mutation endpoints.
- File uploads and NylonPay initiation still need first-class Python backend endpoints before payment proof upload, online pay, and mobile image upload can return in a backend-only architecture.

## Architecture Decisions

- **React Navigation v7**: Chosen for robust navigation handling.
- **Supabase JS**: Shared backend client with the web app for auth, database, storage, and edge functions.
- **SecureStore-backed Supabase session persistence**: Selected so auth tokens live in secure native storage instead of AsyncStorage.
- **Hybrid mobile backend strategy**: Keep Supabase for auth session lifecycle, storage uploads, and edge functions like NylonPay/SMS where already working, while routing aligned CRUD reads/writes through the Python FastAPI backend with bearer-token auth.
- **Backend-only mobile runtime**: The mobile app should depend only on the Python API at runtime, with any Supabase usage hidden fully behind backend services rather than the client app.

## Session Notes

- Context now reflects the real production backend and the requirement that mobile be a native client for the existing Afodabo Housing platform.
- The app now launches into a mobile-first property exploration experience instead of a landing page and routes authenticated users by the same backend roles used on web.
- The mobile app now exposes the same main customer-facing screens as web, with native routes for About, Contact, Privacy Policy, and Terms of Service.
- Logged-in manager and admin users now have stronger parity with web actions, including reminders, proof access, richer messaging, and broader review tools.
- The shared app shell now includes dedicated loading/error/page-header/message primitives, and tenant flows now follow a clearer hook-driven composition pattern that can be reused across the rest of the app.
- The current mobile integration now targets the Python backend first for properties, leases, payments, messages, and profile updates, with compatibility mapping to the existing mobile view models.
- Manager tenancy creation and broad admin controls are intentionally blocked on mobile for now because the Python backend does not yet expose safe equivalents for the original Supabase-first workflows.
- The app no longer requires `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to boot; authentication state is now stored as a backend-issued bearer token in secure local storage.
