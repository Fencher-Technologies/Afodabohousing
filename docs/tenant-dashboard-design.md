# Tenant Dashboard Design

## Understanding Summary
- **What**: A redesigned Tenant Dashboard with mobile-first bottom-tab layout
- **Why**: Current tenant dashboard is a shallow copy of manager's; lacks clear tenant-focused UX
- **Who**: Tenants renting properties (non-technical, mobile-first)
- **Key features**: Pay rent + history, communicate with manager, lease timeline, property details, notifications
- **Non-goals**: No property management, no payment approval, no multi-tenant views

## Assumptions
- 1–50 tenants per manager; no concurrency issues
- Mobile-first design; most tenants use phones
- Supabase direct queries (no separate backend API)
- Existing RLS policies protect tenant data
- Maintenance requests deferred to future iteration

## Decision Log

| Decision | Alternatives | Why Chosen |
|---|---|---|
| Bottom-tab mobile layout | Sidebar, single-page feed | Familiar mobile UX, one-thumb navigation |
| 3 tabs: Home, Payments, Messages | 5 tabs inc. Maintenance & Docs | YAGNI — keep scope minimal |
| Chat-style single-thread messages | Multi-conversation inbox | Tenant has one manager |
| Vaul Drawer for Pay Rent | Dialog | More mobile-native feel |
| Card-list payments | Table | Mobile-friendly, easier to scan |
| Activity feed on Home | Static stats | Feels alive, surfaces what matters |
| Remove Navbar + Footer | Keep existing | Bottom nav replaces top navigation |

## Final Design

### Layout
- Fixed bottom navigation bar with 3 icons: Home, Payments, Messages
- Simple header: property name + unread badge + sign-out
- Full-height scrollable content area above bottom nav
- Mobile-first: full-width on phones, max-600px on desktop

### Home Tab
1. **Lease Status Card** — property title, rent, days left (color-coded), renew CTA
2. **Rent Summary** — current month status, total paid, next due date
3. **Activity Feed** — recent payments, messages, lease updates (chronological)
4. **Property Snapshot** — photo, bedrooms, bathrooms, district, amenities

### Payments Tab
- Sticky "Pay Rent" button at top → opens Vaul Drawer (bottom sheet)
- Drawer: pre-filled amount, file upload for proof, optional note
- Payment history as card list: amount, status badge, dates
- Empty state: "No payments yet" + prompt

### Messages Tab
- Chat bubbles: tenant right-aligned, manager left-aligned
- Fixed input bar at bottom: text + voice recorder + send
- Unread indicator on unread manager messages
- Empty state: welcome message with manager name

## Data Sources
- `tenants` → `leases` → `properties` (for lease & property info)
- `payments` table filtered by tenant_id
- `messages` table filtered by sender_id/receiver_id
- `profiles` for manager name/avatar
- Supabase Storage `property-images` for property photos
