# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Complete: Initial context refactoring for Afodabo Housing.
- Complete: alignment of mobile specs to the real web app and Supabase backend.
- In progress: first full mobile implementation against the shared Supabase project.

## Current Goal

- Stabilize and refine the first working mobile implementation with full web-route parity and stronger workflow depth.

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

## Next Up

- Improve interaction polish:
  - richer empty/loading states
  - tighter form UX
  - deeper manager/admin workflows such as finer-grained unit management, property editing in dedicated detail screens, and proof review UX
  - continue decomposing large manager/admin dashboard screens into smaller feature-level components

## Open Questions

- Payment flows should continue using the same backend capabilities as web, including proof upload and Pesapal initiation where supported on mobile.
- Some desktop-only website pages will likely be folded into profile/help entry points rather than mirrored as standalone app screens.
- Deep-link or post-payment return handling can be expanded later if mobile-specific Pesapal callbacks are needed.
- Tenant creation/linking from mobile still needs backend endpoint alignment because the Python service models tenants and leases differently from the original Supabase-first flow.
- Admin mobile should remain a limited-access surface until the Python backend exposes broader platform-wide reporting and mutation endpoints.
- File uploads and Pesapal initiation still need first-class Python backend endpoints before payment proof upload, online pay, and mobile image upload can return in a backend-only architecture.

## Architecture Decisions

- **React Navigation v7**: Chosen for robust navigation handling.
- **Supabase JS**: Shared backend client with the web app for auth, database, storage, and edge functions.
- **SecureStore-backed Supabase session persistence**: Selected so auth tokens live in secure native storage instead of AsyncStorage.
- **Hybrid mobile backend strategy**: Keep Supabase for auth session lifecycle, storage uploads, and edge functions like Pesapal/SMS where already working, while routing aligned CRUD reads/writes through the Python FastAPI backend with bearer-token auth.
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
