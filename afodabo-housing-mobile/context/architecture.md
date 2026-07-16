# Architecture Context

## Stack

| Layer | Technology | Role |
| --- | --- | --- |
| Framework | Expo / React Native | Cross-platform mobile runtime |
| Language | TypeScript | Static typing and safety |
| Navigation | React Navigation v7 | Root stack plus role-specific tabs and detail stacks |
| Styling | `StyleSheet.create` + theme tokens | Native styling and reusable layout system |
| Data | `@tanstack/react-query` | Remote fetching, cache, and mutation state |
| Backend | Supabase JS | Auth, database, storage, and edge functions |
| Session Storage | SecureStore-backed Supabase auth storage | Persistent mobile sessions in secure native storage |
| Native Integrations | Expo modules | File picking, linking, sharing, and secure device behaviors |

## App Shape

- `src/app` or root composition: providers and app bootstrap.
- `src/navigation` — root navigator, auth stack, guest stack, and role-based tabs/stacks.
- `src/screens` — screen-level containers grouped by guest, tenant, manager, and admin usage.
- `src/components` — reusable presentational primitives and mobile-specific cards, chips, stats, rows, and form controls.
- `src/services` — Supabase client, typed queries, mutations, upload helpers, and edge-function calls.
- `src/context` — auth/session context and other global providers.
- `src/theme` — design tokens, spacing, typography helpers, and shared shadows.
- `src/types` — shared app types derived from Supabase schema and navigation contracts.
- `src/utils` — pure helpers for formatting money, dates, labels, and validation.

## Backend Integration Model

- The mobile app talks directly to the same Supabase project used by the web app.
- Shared tables:
  - `properties`
  - `rental_units`
  - `tenancies`
  - `payments`
  - `messages`
  - `profiles`
  - `user_roles`
- Shared edge functions:
  - `send-sms`
  - `pesapal-pay`
- Shared storage buckets:
  - property image uploads
  - payment proof uploads

## Auth and Access Model

- Supabase Auth is the only authentication mechanism.
- Sessions must persist across app launches using mobile-safe storage.
- User role is resolved from `user_roles` after auth state changes.
- Navigation is role-gated:
  - Guest users see discovery and auth flows.
  - Tenants see tenant tabs and tenant-only screens.
  - House managers see manager tabs and manager-only screens.
  - Admins see admin tabs and admin-only screens.

## Data Flow Rules

- UI components do not query Supabase directly.
- All remote reads and writes go through `src/services`.
- React Query owns request lifecycle, background refresh, cache invalidation, loading states, and mutation state.
- Screens compose hooks/services and render UI; they should not embed raw backend wiring.

## Storage Model

- Supabase session storage persists in Expo SecureStore through a custom storage adapter.
- Sensitive auth/session lifecycle is delegated to Supabase client behavior rather than custom token logic.
- Temporary local UI state stays in React state unless it needs cross-screen persistence.

## Navigation Model

- Root stack decides between splash/loading, guest, and authenticated role trees.
- Root stack may show onboarding before the guest tree on first launch.
- Guest tree:
  - Onboarding
  - Explore / listings
  - Property detail
  - Login
  - Register
- Authenticated trees:
  - Tenant: overview, explore, dedicated payments, messages, profile/actions
  - Manager: overview, dedicated properties, dedicated tenancies, payments, messages, property/tenancy/conversation detail
  - Admin: overview, users, properties, tenancies, payments
- Detail screens and forms are pushed on stacks instead of opening website-style full-page routes.

## Invariants

1. A user may only reach screens allowed by their resolved role.
2. Mobile feature behavior must remain compatible with the existing Supabase schema and web business rules.
3. Property browsing must work for guests without requiring auth.
4. Loading, empty, and error states are required for every backend-driven screen.
5. Visual identity must remain consistent with the web app's palette, typography intent, and trust-first tone.

