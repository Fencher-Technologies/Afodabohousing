# Afodabo Housing Mobile

## Overview

Afodabo Housing Mobile is the Expo-based native companion to the Afodabo Housing web app. It must use the same Supabase backend, the same roles, and the same core workflows already implemented on web while adapting the UX to native mobile patterns.

The mobile app is not a separate product. It is another client for the existing Afodabo Housing platform.

## Product Goals

1. Let guests browse verified rental listings quickly on mobile without a marketing-style landing page.
2. Let tenants sign in, track tenancy status, upload payment proof, pay online when available, and message their house manager.
3. Let house managers manage listings, tenants, payments, and messages from a phone-first interface.
4. Let admins monitor platform activity, users, properties, tenancies, and payments using the same backend tables as the web app.
5. Preserve the web app's visual identity: earthy palette, serif display typography, warm surfaces, and trust-first presentation.

## Source of Truth

- Backend: existing Supabase project already used by the Vite web app.
- Auth model: Supabase Auth with the `user_roles` table for role resolution.
- Domain data: `properties`, `rental_units`, `tenancies`, `payments`, `messages`, `profiles`, and `user_roles`.
- Mobile must not introduce a parallel backend or substitute mock APIs for production flows.

## Core Mobile User Flows

1. **Guest**: Opens directly into property discovery, searches by district, filters listings, and views property details.
2. **Guest to Authenticated**: Signs in or creates an account as tenant or house manager.
3. **Tenant**: Views active tenancy, upcoming rent status, payment history, uploads payment proof, and sends messages to the manager.
4. **House Manager**: Reviews dashboard metrics, manages owned properties, creates tenancies, reviews payments, and replies to tenants.
5. **Admin**: Reviews global platform metrics, users, listings, tenancies, and payment records.

## Feature Scope

### In Scope

- Supabase-backed authentication and persistent sessions.
- Role-aware navigation and screen gating.
- Property discovery, search, filters, and detail view.
- Registration and sign-in with the same role model as web.
- Tenant dashboard parity for core rent and messaging flows.
- Manager dashboard parity for core property, tenancy, payment, and messaging flows.
- Admin dashboard parity for monitoring and property/payment actions.
- File uploads required for payment proof and property photos where mobile flows support them.

### Out of Scope For This Mobile Build

- About, contact, privacy, terms, and other website-style informational pages as first-class app destinations.
- A marketing landing page.
- New backend tables or mobile-only data models.
- New business rules that diverge from the existing web implementation.

## Mobile UX Principles

- Start on an exploration screen instead of a landing page.
- Use bottom tabs and stack navigation rather than website navigation chrome.
- Prefer native sheets, segmented controls, cards, and large touch targets.
- Keep high-frequency actions close to the thumb zone.
- Preserve the web app's visual language while simplifying layout density for handheld screens.

## Success Criteria

1. The app can sign in against the existing Supabase project and route users by role.
2. Guests can browse, search, filter, and open property details without using the web app.
3. Tenants, managers, and admins can complete the same core backend-driven tasks available on web.
4. The UI feels clearly related to the web brand while behaving like a native mobile product.

