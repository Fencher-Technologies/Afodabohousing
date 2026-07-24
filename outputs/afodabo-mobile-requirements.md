# Afodabo Housing — Mobile App Build Requirements

> **Source codebase audit date:** 2026-07-15
> **Backend:** FastAPI + Supabase/Postgres (v0.2.0)
> **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS v3 + shadcn/ui
> **Auth:** Supabase Auth (email/password + JWT)
> **Payments:** NylonPay (mobile money) — live; Pesapal — stubbed

---

## 1. ROLES & PERMISSIONS

### 1.1 Role Enum (`app_role` on `profiles`)

| Role | Description | Created By |
|------|------------|------------|
| `super_admin` | Platform owner (mapped from legacy `admin`) | Seeded manually |
| `house_manager` | Property manager who owns/rents out properties | Created by `super_admin` |
| `tenant` | Renter with an active lease | Invited by `house_manager` |

### 1.2 What Each Role Can See/Do

| Capability | super_admin | house_manager | tenant |
|------------|:-----------:|:-------------:|:------:|
| View all profiles | ALL rows | Only their own + tenants linked to them (via `manager_id` or `created_by`) | Only own profile |
| Create/manage users/managers | Yes | No | No |
| View all properties | ALL rows | Only own (`owner_id = auth.uid()`) | Only property they have a lease on |
| Create/edit/delete properties | Yes (any) | Own properties only | No |
| View tenants | ALL rows | Only own (`owner_id = auth.uid()`) | Only own record |
| Create/edit/delete tenants | Yes | Own only | No |
| View leases | ALL rows | Own only (`owner_id = auth.uid()`) | Only own lease |
| Create/edit/delete leases | Yes | Own only | No |
| View payments | ALL rows | Own lease payments | Own payments only |
| Create payments | Yes | No | Yes (own) |
| Update payments | Yes | Own only | Own only |
| View maintenance requests | ALL rows | On own properties | Own requests |
| Create maintenance requests | No (not needed) | No (by tenant) | Yes |
| View/send messages | ALL messages | Own conversations | Own conversations |
| View boosts | ALL rows | No | No |
| Create/cancel boosts | Yes | Initiate with payment | No |
| View subscriptions | ALL rows | Own subscription | No |
| Create subscriptions | No | Initiate with payment | No |
| Export data (CSV/XLSX) | All resource types | Own data scoped | No |

### 1.3 Invite-Only Registration Flow

1. **Super Admin** creates a `house_manager` via `POST /admin/create-manager` — generates the user in Supabase Auth directly with a temporary password (returns it in response).
2. **Super Admin** can also invite a `house_manager` via `POST /auth/invite` — creates a record in the `invitations` table with a UUID token (7-day expiry).
3. **House Manager** invites a `tenant` via `POST /auth/invite` — same mechanism, but `role = 'tenant'` and the `manager_id` is set to the inviting manager.
4. The invited person visits `/accept-invite?token=<uuid>` on the web frontend. They set their full name, phone, and password. The backend:
   - Validates the token (exists, status = `pending`, not expired)
   - Creates the user in Supabase Auth via `supabase.auth.admin.create_user()`
   - Upserts the `profiles` row with `role`, `created_by`, and `manager_id` from the invitation
   - Marks the invitation as `accepted`
   - Signs the user in and returns JWT tokens

### 1.4 Role Enforcement

- **Backend:** The `get_user_role()` SQL function reads `profiles.role`. The `dependencies/auth.py` layer resolves the role from the profile table on every authenticated request. Guard functions: `require_super_admin()`, `require_manager()`, `require_super_admin_or_manager()`, `require_tenant()`.
- **RLS:** Every table has row-level security policies based on `public.get_user_role(auth.uid())`. See Section 3.
- **Frontend:** `ProtectedRoute` component checks `profiles.role` and redirects unauthorized users to their appropriate dashboard.

---

## 2. AUTHENTICATION

### 2.1 Provider

- **Supabase Auth** with email/password
- JWT tokens issued by Supabase (standard `access_token` + `refresh_token`)
- Token validation on backend: `supabase.auth.get_user(token)` via the `get_current_user` dependency

### 2.2 Auth Endpoints (FastAPI)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/signup` | POST | Public tenant sign-up (only role = `tenant` allowed) |
| `/auth/signin` | POST | Email + password sign-in |
| `/auth/signin/form` | POST | OAuth2 form-based sign-in (for Swagger docs) |
| `/auth/signout` | POST | Sign out (invalidates token) |
| `/auth/refresh` | POST | Refresh token exchange |
| `/auth/reset-password` | POST | Sends password reset email via Supabase |
| `/auth/invite` | POST | Create invitation (super_admin or manager) |
| `/auth/accept-invite` | POST | Complete invitation flow, returns JWT |
| `/auth/me` | GET | Get current user's profile + role |
| `/auth/profile` | GET | Get full profile |
| `/auth/profile` | PATCH | Update profile |
| `/auth/roles` | GET | Get current user's role + status |

### 2.3 Session Handling

- **Frontend:** Supabase JS client (`@supabase/supabase-js`) manages sessions in `localStorage` with `autoRefreshToken: true`
- `AuthContext.tsx` calls `supabase.auth.getSession()` on mount, then subscribes to `onAuthStateChange` for real-time updates
- `refreshRole()` fetches the role from `profiles` table directly
- **Backend:** Stateless JWT validation on each request via Supabase Admin SDK (service role key for admin operations, anon key + user JWT for regular requests)

---

## 3. DATABASE SCHEMA

### 3.1 Enum Types

```sql
app_role           → 'tenant' | 'house_manager' | 'super_admin'
property_type      → 'house' | 'apartment' | 'self_contained' | 'room' | 'studio' | 'bungalow'
rent_period        → 'monthly' | 'quarterly' | 'annually'
property_status    → 'available' | 'occupied' | 'inactive'
payment_status     → 'pending' | 'uploaded' | 'confirmed' | 'rejected'
tenancy_status     → 'active' | 'expired' | 'terminated'
```

### 3.2 Tables

#### `profiles`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | `gen_random_uuid()` |
| user_id | UUID FK → `auth.users(id)` | UNIQUE, ON DELETE CASCADE |
| email | TEXT | Originally stored, indexed |
| full_name | TEXT | |
| phone | TEXT | |
| avatar_url | TEXT | mapped as `photo_url` in frontend |
| role | `app_role` | Core role column |
| status | TEXT | `'active' | 'suspended' | 'pending'`, default `'active'` |
| created_by | UUID FK → `auth.users(id)` | NULL for super_admin, set for invited users |
| manager_id | UUID FK → `auth.users(id)` | Set for tenants, identifies their manager |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**RLS:**
- super_admin: full access on all rows
- Users can read/update their own row
- house_manager can read tenant profiles where `manager_id = auth.uid()` or `created_by = auth.uid()`
- Insert allowed on accept-invite (`auth.uid() = user_id`)

#### `properties`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| owner_id | UUID FK → `auth.users(id)` | Renamed from `manager_id` |
| title | TEXT | NOT NULL |
| description | TEXT | |
| property_type | property_type | |
| district | TEXT | |
| city | TEXT | |
| area | TEXT | |
| address | TEXT | |
| bedrooms | INT | |
| sitting_rooms | INT | |
| kitchens | INT | |
| bathrooms | INT | |
| rent_amount | BIGINT | Legacy column, frontend normalizes `monthly_rent` |
| monthly_rent | BIGINT | Synced from rent_amount |
| rent_currency | TEXT | Default 'UGX' |
| rent_period | rent_period | |
| amenities | TEXT[] | |
| images | TEXT[] | URLs from Supabase Storage |
| status | property_status | |
| state | TEXT | |
| zip_code | TEXT | |
| country | TEXT | Default 'UG' |
| square_feet | INT | |
| security_deposit | BIGINT | Default 0 |
| is_active | BOOLEAN | Default true |
| manager_email | TEXT | Contact field |
| manager_phone | TEXT | Contact field |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**RLS:**
- Public: can view available properties (status = 'available')
- super_admin: full access
- house_manager: CRUD own (`owner_id = auth.uid()`)
- tenant: can view property they lease (via leases → tenants → user_id chain)
- Inactive properties hidden from public

#### `tenants`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| owner_id | UUID FK → `auth.users(id)` | The house_manager who manages this tenant |
| user_id | UUID FK → `auth.users(id)` | SET NULL on delete — the linked auth user |
| first_name | TEXT | |
| last_name | TEXT | |
| email | TEXT | |
| phone | TEXT | |
| employer | TEXT | |
| monthly_income | BIGINT | |
| credit_score | INT | |
| emergency_contact_name | TEXT | |
| emergency_contact_phone | TEXT | |
| notes | TEXT | |
| status | tenancy_status | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**UNIQUE:** `(user_id, owner_id)` — one tenant record per user per manager

**RLS:**
- super_admin: full access
- house_manager: CRUD own (`owner_id = auth.uid()`)
- tenant: can view own record (`user_id = auth.uid()`)

#### `leases`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| owner_id | UUID FK → `auth.users(id)` | |
| property_id | UUID FK → `properties(id)` | ON DELETE CASCADE |
| tenant_id | UUID FK → `tenants(id)` | ON DELETE CASCADE |
| start_date | DATE | |
| end_date | DATE | |
| monthly_rent | BIGINT | |
| security_deposit | BIGINT | Default 0 |
| status | tenancy_status | |
| terms | TEXT | |
| termination_date | DATE | |
| termination_reason | TEXT | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**RLS:**
- super_admin: full access
- house_manager: CRUD own (`owner_id = auth.uid()`)
- tenant: can view own lease (where `tenant_id` in tenants where `user_id = auth.uid()`)

#### `payments`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| lease_id | UUID FK → `leases(id)` | |
| tenant_id | UUID FK → `tenants(id)` | |
| amount | BIGINT | |
| payment_type | TEXT | Default 'rent' |
| payment_method | TEXT | |
| status | payment_status | |
| due_date | DATE | |
| paid_date | DATE | |
| transaction_id | TEXT | For payment gateway ref |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**RLS:**
- super_admin: full access
- house_manager: view/update payments on own leases (via `lease_id IN (leases WHERE owner_id = auth.uid())`)
- tenant: create/view/update own payments (where `tenant_id IN (tenants WHERE user_id = auth.uid())`)

#### `maintenance_requests`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| property_id | UUID FK → `properties(id)` | ON DELETE CASCADE |
| tenant_id | UUID FK → `tenants(id)` | ON DELETE SET NULL |
| title | TEXT | |
| description | TEXT | |
| priority | TEXT | Default 'medium' |
| status | TEXT | Default 'open' |
| scheduled_date | DATE | |
| completed_date | DATE | |
| cost | BIGINT | |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**RLS:**
- super_admin: full access
- house_manager: view/update/delete on own properties
- tenant: create (if `role = 'tenant'`), view own requests

#### `rental_units`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| property_id | UUID FK → `properties(id)` | ON DELETE CASCADE |
| owner_id | UUID | Not in original schema, added in backend |
| unit_number | TEXT | |
| floor_level | TEXT | |
| bedrooms | INT | |
| bathrooms | INT | |
| sitting_rooms | INT | |
| kitchens | INT | |
| rent_amount | BIGINT | |
| rent_currency | TEXT | Default 'UGX' |
| status | property_status | |
| description | TEXT | |
| amenities | TEXT[] | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**RLS:**
- Public: view available (status <> 'inactive')
- super_admin: full access
- house_manager: CRUD units in own properties (via `property_id IN (properties WHERE owner_id = auth.uid())`)

#### `messages`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| sender_id | UUID FK → `auth.users(id)` | |
| receiver_id | UUID FK → `auth.users(id)` | |
| property_id | UUID FK → `properties(id)` | SET NULL |
| content | TEXT | |
| voice_note_url | TEXT | For voice messages |
| is_read | BOOLEAN | Default false |
| created_at | TIMESTAMPTZ | |

**RLS:**
- super_admin: view all
- Users: view own conversations, send (insert), mark read (update) if receiver

#### `invitations`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| email | TEXT | UNIQUE |
| role | TEXT | CHECK 'house_manager' or 'tenant' |
| invited_by | UUID FK → `auth.users(id)` | |
| token | UUID | UNIQUE, `gen_random_uuid()` |
| status | TEXT | Default 'pending' — 'pending' | 'accepted' | 'expired' |
| expires_at | TIMESTAMPTZ | Default now() + 7 days |
| manager_id | UUID FK → `auth.users(id)` | Set for tenant invites |
| created_at | TIMESTAMPTZ | |

**RLS:**
- super_admin: full access
- house_manager: create/view own invitations (only role = 'tenant')
- Public: can read invitation by token (token is unguessable UUID)

#### `property_boosts`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| property_id | UUID FK → `properties(id)` | |
| manager_id | UUID FK → `auth.users(id)` | |
| amount_paid | DECIMAL | |
| duration_days | INT | |
| started_at | TIMESTAMPTZ | |
| expires_at | TIMESTAMPTZ | |
| status | TEXT | active / expired / cancelled / pending / failed |
| transaction_id | TEXT | |
| payment_method | TEXT | e.g. 'nylonpay' |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**RLS:** Handled at app-level (super_admin only for full access)

#### `manager_subscriptions`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| manager_id | UUID FK → `auth.users(id)` | |
| plan_type | TEXT | '3mo' / '6mo' / '12mo' |
| status | TEXT | active / expired / cancelled / pending / failed |
| start_date | TIMESTAMPTZ | |
| expiry_date | TIMESTAMPTZ | |
| amount_paid | DECIMAL | |
| payment_method | TEXT | |
| transaction_id | TEXT | |
| auto_renew | BOOLEAN | Default false |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**RLS:** Handled at app-level (super_admin full; manager can view own)

### 3.3 Storage Buckets

| Bucket | Public | Purpose |
|--------|--------|---------|
| `property-images` | Yes | Property photos, public read |
| `payment-proofs` | No | Payment proof uploads, signed URLs |
| `documents` | No | Lease agreements, other docs |

---

## 4. CORE FEATURES BY ROLE

### 4.1 Super Admin Dashboard (`/dashboard/super-admin`)

**Status: FULLY BUILT**

Available tabs/sections:
1. **Overview** — Stat cards (total properties, managers, active tenants, monthly rent collected), multi-line rent collection trend chart, revenue donut chart (Recharts), tenant registration bar chart, active leases bar chart, pending manager invites bar chart, recent activity table, audit log feed
2. **Managers** — Paginated, searchable, filterable table of house managers with:
   - Row selection (bulk suspend / CSV export)
   - Invite manager (email-based invitation)
   - Create manager (direct account creation with temporary password)
   - Status toggle (active/suspend)
   - Navigate to manager detail page
3. **Settings** — Tab placeholder

**Mock data usage:** Several charts use randomized/placeholder data with `// TODO` comments noting real Supabase queries are needed.

**Manager Detail (`/dashboard/super-admin/managers/:id`)** — Shows manager profile, stat cards, assigned properties list with occupancy, mock activity log.

### 4.2 House Manager Dashboard (`/dashboard/manager`)

**Status: FULLY BUILT**

Available tabs/sections:
1. **Overview** — Stat cards (total listings, active tenants, confirmed revenue), revenue breakdown bar, payment queue (review/confirm/reject), property status list with "Boost" link, alerts for pending payments and rent expiry
2. **Properties** — Table of own properties with view/edit/deactivate/delete/boost actions, add property dialog (full form with image upload, amenities), add unit dialog
3. **Tenants** — Table of tenant leases with rent, expiry days, WhatsApp link, rent reminder button. Add tenant dialog (looks up by email, creates tenancy/lease)
4. **Payments** — Table of all payments with confirm/reject actions
5. **Requests** — Maintenance requests for manager's properties
6. **Profile** — Avatar upload, change password

**Actions available across dashboard:**
- Create/Edit/Delete property (CRUD)
- Add rental units to a property
- Create lease/tenancy for existing user (by email lookup)
- Confirm/reject payment uploads with SMS notification
- Send rent reminders via SMS
- Initiate property boost (NylonPay mobile money)
- WhatsApp link to tenant
- Change password
- SMS sent through Supabase Edge Function

### 4.3 Tenant Dashboard (`/dashboard/tenant`)

**Status: FULLY BUILT — mobile-first layout already**

Available tabs/sections (bottom tab nav):
1. **Home** — Welcome banner, lease agreement card with payment progress bar, action-needed alerts (renewal, open maintenance requests), rent summary (total/paid/balance), my home section (property image, room counts, amenities, WhatsApp link to manager), my profile section, lease health ring (on-time payment %), calendar widget showing due date, recent activity feed
2. **Payments** — Monthly stats row (this month count, total paid, on-time %), searchable paginated payment history table with status badges
3. **Requests** — Filterable (all/open/resolved) list of maintenance requests. New request form (title, description, priority selector) in a bottom drawer
4. **More** — Full profile card, lease info, manager info with WhatsApp link, change password, sign out

**Notable:** The tenant dashboard is already designed as a mobile-responsive bottom-tab layout. Much of it could wrap directly in a WebView or translate cleanly to React Native.

### 4.4 Public/Landing Pages (no auth required)

| Page | Route | Purpose |
|------|-------|---------|
| Home/Landing | `/` | Hero section, feature highlights, how-it-works, district search, popular properties grid, demo accounts listing |
| Properties | `/properties` | Public listing with filters (state, type, price range), search |
| Property Detail | `/properties/:id` | Full property details, images, amenities, manager contact |
| Login | `/login` | Email/password sign-in, password reset support |
| Register | `/register` | Shows invite-only notice + link to login |
| Accept Invite | `/accept-invite?token=` | Form to set name/password and complete invitation |
| About | `/about` | Static about page |
| Contact | `/contact` | Static contact page |
| Privacy | `/privacy` | Static privacy policy |
| Terms | `/terms` | Static terms of service |
| Forgot Password | `/forgot-password` | Password reset form |
| Boost | `/dashboard/manager/boost/:id` | Self-service boost purchase with NylonPay |

### 4.5 Feature Completeness Summary

| Feature | Web Status | Notes |
|---------|-----------|-------|
| Super Admin dashboard/charts | **Built** — some charts use mock data | TODO: real Supabase queries |
| Manager CRUD (invite/create/suspend) | **Built** | Fully functional |
| Manager detail view | **Built** — activity log uses mock data | |
| Property CRUD with images | **Built** | Through Supabase directly |
| Rental unit CRUD | **Built** | |
| Tenant CRUD | **Built** | |
| Lease/tenancy creation | **Built** | Creates both tenant + lease |
| Payment upload (tenant) | **Built** | Supabase storage payment-proofs bucket |
| Payment confirm/reject (manager) | **Built** | Via Supabase Edge Function SMS |
| Maintenance requests (create/view) | **Built** | |
| Messaging | **Built** (API only) | No frontend UI for message composition |
| WhatsApp integration | **Built** | Deep links only |
| SMS notifications | **Built** | Via Supabase Edge Function + SMS provider API |
| Property boosts (NylonPay) | **Built** | Mobile money payment flow |
| Manager subscriptions | **Built** | Via NylonPay |
| Data exports (CSV/XLSX) | **Built** | |
| Voice notes in messages | **Stubbed** | Column exists, `VoiceRecorder` component exists, not integrated |
| Audit log | **Mock** | Frontend has mock data, no backend table |
| Activity log | **Mock** | Frontend has mock data, no backend table |
| Real-time notifications | **Not built** | No push notification infrastructure |
| Payment gateway (Pesapal) | **Stubbed** | Webhook endpoint exists, no frontend integration |
| Public property search | **Built** | With filters |

---

## 5. API ENDPOINTS

### 5.1 Base URL

- Configured via `VITE_API_URL` env var (empty = same origin in dev)
- FastAPI served on port 8000, with `/docs` and `/redoc` in non-production
- Health: `GET /health`, `GET /health/ready`, `GET /`, `GET /metrics`, `GET /api/endpoints`

### 5.2 Auth Endpoints

All under `/auth`:

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/auth/signup` | None | Public tenant signup |
| POST | `/auth/signin` | None | Email/password login |
| POST | `/auth/signin/form` | None | OAuth2 form login |
| POST | `/auth/refresh` | None | Refresh token |
| POST | `/auth/signout` | Bearer | Sign out |
| POST | `/auth/reset-password` | None | Send password reset email |
| POST | `/auth/invite` | Bearer (SA/Manager) | Create invitation |
| POST | `/auth/accept-invite` | None | Complete invitation |
| GET | `/auth/me` | Bearer | Current user info + role |
| GET | `/auth/profile` | Bearer | Full profile |
| PATCH | `/auth/profile` | Bearer | Update profile |
| GET | `/auth/roles` | Bearer | Get role + status |

### 5.3 Admin Endpoints

All under `/admin`:

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/admin/create-manager` | Bearer (SA) | Create manager account with temp password |
| GET | `/admin/users` | Bearer (SA) | List all users, filterable by role |
| PATCH | `/admin/users/{user_id}/status` | Bearer (SA) | Suspend/reactivate user |
| GET | `/admin/stats` | Bearer (SA) | Dashboard stats (counts, financial) |

### 5.4 Property Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/properties` | Bearer | List own properties (authenticated) |
| GET | `/properties/public` | None | Public property listings with filters |
| GET | `/properties/{id}` | Bearer | Get single property |
| GET | `/properties/public/{id}` | None | Get public property |
| POST | `/properties` | Bearer (SA/Manager) | Create property |
| PATCH | `/properties/{id}` | Bearer (SA/Manager) | Update property |
| DELETE | `/properties/{id}` | Bearer (SA/Manager) | Delete property |

### 5.5 Tenant Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/tenants` | Bearer | List own tenants |
| GET | `/tenants/resolve-by-email` | Bearer | Lookup or create tenant by email |
| GET | `/tenants/{id}` | Bearer | Get single tenant |
| POST | `/tenants` | Bearer | Create tenant record |
| PATCH | `/tenants/{id}` | Bearer | Update tenant |
| DELETE | `/tenants/{id}` | Bearer | Delete tenant |

### 5.6 Lease Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/leases` | Bearer | List own leases (or tenant's leases) |
| GET | `/leases/{id}` | Bearer | Get single lease |
| POST | `/leases` | Bearer | Create lease |
| PATCH | `/leases/{id}` | Bearer | Update lease |
| DELETE | `/leases/{id}` | Bearer | Delete lease |

### 5.7 Payment Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/payments` | Bearer (SA/Manager) | List payments |
| GET | `/payments/{id}` | Bearer (SA/Manager) | Get single payment |
| POST | `/payments` | Bearer (SA/Manager) | Create payment record |
| PATCH | `/payments/{id}` | Bearer (SA/Manager) | Update payment |

**Note:** The `POST /payments` and `PATCH /payments` endpoints require SA/manager. Tenants create payments via the Supabase client directly (RLS allows it). The backend does NOT have a "tenant creates payment" endpoint — tenants use the Supabase JS SDK directly.

### 5.8 Maintenance Request Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/maintenance/property/{property_id}` | Bearer | List requests by property |
| GET | `/maintenance/{id}` | Bearer | Get single request |
| POST | `/maintenance` | Bearer | Create request |
| PATCH | `/maintenance/{id}` | Bearer | Update request |
| DELETE | `/maintenance/{id}` | Bearer | Delete request |

### 5.9 Message Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/messages` | Bearer | List own messages |
| GET | `/messages/conversations` | Bearer | List conversations |
| GET | `/messages/unread` | Bearer | Get unread count |
| GET | `/messages/{id}` | Bearer | Get single message |
| POST | `/messages` | Bearer | Send message |
| PATCH | `/messages/{id}` | Bearer | Mark as read |

### 5.10 Rental Unit Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/rental-units/property/{property_id}` | None | List units for a property |
| GET | `/rental-units/{id}` | None | Get single unit |
| POST | `/rental-units` | Bearer | Create unit |
| PATCH | `/rental-units/{id}` | Bearer | Update unit |
| DELETE | `/rental-units/{id}` | Bearer | Delete unit |

### 5.11 Boost Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/boosts` | Bearer (SA) | Create boost (admin, offline payment) |
| GET | `/boosts` | Bearer (SA) | List all boosts |
| GET | `/boosts/stats` | Bearer (SA) | Boost revenue stats |
| GET | `/boosts/{id}` | Bearer (SA) | Get boost |
| PATCH | `/boosts/{id}/cancel` | Bearer (SA) | Cancel boost |
| POST | `/boosts/expire-old` | Bearer (SA) | Expire overdue boosts |
| POST | `/boosts/initiate` | Bearer (SA/Manager) | Self-service boost with NylonPay |
| GET | `/boosts/price/default` | None | Get default boost price |

### 5.12 Subscription Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/subscriptions` | Bearer (SA) | List all subscriptions |
| GET | `/subscriptions/my` | Bearer (SA/Manager) | Get own subscription |
| GET | `/subscriptions/stats` | Bearer (SA) | Subscription stats |
| GET | `/subscriptions/{id}` | Bearer (SA) | Get subscription |
| POST | `/subscriptions/expire-old` | Bearer (SA) | Expire overdue |
| PATCH | `/subscriptions/{id}/cancel` | Bearer (SA) | Cancel |
| POST | `/subscriptions/initiate` | Bearer (SA/Manager) | Self-service with NylonPay |

### 5.13 Other Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/uploads/payment-proof` | Bearer | Upload payment proof (signed URL) |
| POST | `/uploads/property-image` | Bearer | Upload property image (public URL) |
| GET | `/exports/properties` | Bearer (SA/Manager) | CSV/XLSX export |
| GET | `/exports/tenants` | Bearer (SA/Manager) | CSV/XLSX export |
| GET | `/exports/leases` | Bearer (SA/Manager) | CSV/XLSX export |
| GET | `/exports/payments` | Bearer (SA/Manager) | CSV/XLSX export |
| GET | `/exports/boosts` | Bearer (SA) | CSV/XLSX export |
| GET | `/exports/managers` | Bearer (SA) | CSV/XLSX export |
| POST | `/payments/webhook/pesapal` | Webhook | Pesapal payment callback |
| POST | `/webhooks/nylonpay` | Webhook | NylonPay payment callback |
| POST | `/sms/send` | Internal/Webhook | Send SMS |

---

## 6. THIRD-PARTY INTEGRATIONS

### 6.1 NylonPay (LIVE)

- **Purpose:** Mobile money payment collection for property boosts and manager subscriptions
- **Status:** **Live and operational** — integrated via `nylonpay` Python SDK
- **Flow:**
  1. Manager enters phone number on BoostPage, selects duration
  2. Frontend calls `POST /boosts/initiate` with `property_id`, `duration_days`, `phone_number`
  3. Backend calls `nylonpay.collect_payment()` which sends a mobile money prompt
  4. NylonPay sends webhook to `POST /webhooks/nylonpay`
  5. Backend verifies webhook signature, activates the boost/subscription
- **Config:** API key + secret, sandbox/live toggle, sandbox: `https://sandbox-api.nylonpay.com`
- **Frontend:** `BoostPage.tsx` handles the initiation form

### 6.2 Pesapal (STUBBED)

- **Purpose:** Card payment processing
- **Status:** **Not live** — only the webhook handler exists (`POST /payments/webhook/pesapal`)
- The webhook verifies HMAC-SHA256 signature and updates payment status
- No frontend integration exists; no Pesapal SDK integration visible

### 6.3 SMS Notifications

- **Provider:** Generic SMS provider via HTTP API (configured per env)
- **Status:** **Partially live** — `POST /sms/send` endpoint exists, but provider URL is `https://api.example.com/sms/send` (placeholder) in config
- Frontend sends SMS via Supabase Edge Function (`supabase.functions.invoke('send-sms')`) 
- Used for: payment confirm/reject notifications, rent reminders, welcome messages

### 6.4 Supabase (CORE)

- **Auth:** User management, JWT, password reset, admin user creation
- **Database:** PostgreSQL with Row-Level Security
- **Storage:** Three buckets for images/documents/payment-proofs

### 6.5 Sentry (OPTIONAL)

- Error tracking, configured via `sentry_dsn` env var. Only initializes in non-development environments.

### 6.6 WhatsApp

- Deep links only (e.g., `https://wa.me/2567xxxxxxxx`). No WhatsApp Business API integration.

---

## 7. DESIGN/BRANDING NOTES

### 7.1 Design System Name

"Warm Industrial" — Terracotta-dominant, Teal accent, Editorial data typography

### 7.2 Color Palette

| Token | HSL Value | Description |
|-------|-----------|-------------|
| `--background` | `38 30% 96%` | Warm ivory |
| `--foreground` | `20 12% 14%` | Warm charcoal |
| `--primary` | `14 62% 52%` | **Terracotta** (dominant brand color) |
| `--primary-foreground` | `38 30% 96%` | Light text on terracotta |
| `--secondary` | `38 25% 88%` | Warm stone |
| `--accent` | `182 48% 30%` | **Deep teal** (stability accent) |
| `--gold` | `38 85% 50%` | Gold (CTA, highlights) |
| `--destructive` | `0 68% 50%` | Red (errors, delete) |
| `--success` | `142 48% 32%` | Green (confirmed) |
| `--card` | `0 0% 100%` | White cards |
| `--sidebar-background` | `20 15% 10%` | Deep charcoal sidebar |

### 7.3 Typography

| Usage | Font | Fallback |
|-------|------|----------|
| Body (sans) | **Karla** | system-ui, sans-serif |
| Headings (display) | **DM Serif Display** | Georgia, serif |
| Monospace | ui-monospace | SFMono-Regular |

Headings use `font-display` class with DM Serif Display, lighter weight (400), tight letter-spacing. Monetary amounts use the serif display font with tabular numbers (`font-feature-settings: "tnum" 1`).

### 7.4 Visual Style

- **Shapes:** Generous `rounded-2xl` (16px) on cards, `rounded-xl` on buttons and small containers
- **Shadows:** Terracotta-tinted (`hsl(14 62% 52% / 0.08-0.15)`)
- **Gradients:** `gradient-primary` class — terracotta darkening slightly
- **Texture:** Subtle noise/grain overlay on background (`var(--noise-svg)`)
- **Status badges:** Pill-shaped with colored backgrounds and borders
- **Icons:** `lucide-react` icon library
- **Animation:** Tailwind keyframes for `fade-up`, `fade-in`, `slide-in-left`

### 7.5 Dark Mode

Full dark mode supported via `.dark` class with adjusted HSL values (darker backgrounds, slightly brighter primary).

### 7.6 Logo

- File: `src/assets/logo.png` — referenced in UI
- Brand name: "Afodabo Housing" with tagline "Uganda's Housing Platform"

### 7.7 Component Library

- **shadcn/ui** with custom styling (Terracotta/Teal overrides)
- Chart library: **Recharts** for dashboard charts
- Date formatting: **date-fns**
- Toast/sonner notifications

---

## 8. GAPS & OPEN QUESTIONS

### 8.1 Backend Gaps for Mobile

| Gap | Impact | Suggested Solution |
|-----|--------|--------------------|
| **No push notification system** | Mobile app needs push for payment confirmations, maintenance updates, rent reminders | Add Firebase Cloud Messaging (FCM) or OneSignal; store device tokens; add webhook to send push |
| **No real-time WebSocket/Supabase Realtime** | Live updates for payment status, new messages | Use Supabase Realtime subscriptions (client already supports it) |
| **No dedicated "tenant creates payment" endpoint** | Frontend calls Supabase directly — mobile app needs an API endpoint | Create `POST /payments/tenant` endpoint for mobile (with RLS-checked tenant validation) |
| **No image resize/optimization** | Large camera uploads from mobile | Add image compression on mobile client or backend processing |
| **SMS provider configured with placeholder URL** | SMS may not work in production | Needs actual SMS provider API key and URL (e.g., Twilio, Africa's Talking) |
| **Pesapal integration not wired** | No card payment option | Complete Pesapal integration or replace with mobile-focused gateway |
| **No dedicated mobile auth flow** | OTP/Social login may be expected | Could keep email/password + token; may want phone+OTP for Africa market |
| **No offline support** | Mobile app unusable without connectivity | Either accept online-only or add local storage with sync |

### 8.2 Frontend Observations for Mobile

| Observation | Implication |
|-------------|-------------|
| **Tenant dashboard is already mobile-first** (bottom tabs, drawers) | This can serve as the UX blueprint — translate directly |
| **Manager dashboard uses sidebar + table layouts** | Needs rethinking for mobile: use bottom tabs + card lists |
| **Super Admin dashboard uses multi-column tables + Recharts** | Simplify to mobile-friendly chart components (victory-native or similar) |
| **Image upload uses Supabase client directly** | Wrap in mobile-specific picker (react-native-image-picker) |
| **Forms are full-screen dialogs** | Convert to scrollable mobile screens |
| **Many TODO: mock data placeholders** | Ensure all endpoint responses are real before building mobile |
| **PropertyCard component already responsive** | Good for mobile reuse |
| **VoiceRecorder component exists, not wired** | Opportunity for mobile: native voice recording is simpler |
| **SMS notifications go through Supabase Edge Function** | Mobile push is the real requirement |

### 8.3 Features That May Not Make Sense on Mobile

| Web Feature | Mobile Suitability |
|-------------|-------------------|
| CSV/XLSX exports | Not useful on mobile — skip or offer email delivery |
| Super Admin complex charts (Recharts multi-line) | Simplify to summary KPIs with sparklines |
| Direct Supabase DB queries from frontend | Must go through API in mobile app for security |
| Avatar upload UI complexity | Simplify to camera roll picker + crop |

### 8.4 Features Missing Entirely (both web and mobile)

| Missing Feature | Notes |
|----------------|-------|
| Real payment integration for tenants (online payment initiation) | Only manager boosts/subscriptions use NylonPay; tenants submit proof manually |
| Lease agreement upload/download | Column `agreement_url` in legacy tenancies, not consistently used |
| Rent invoice/receipt generation | No PDF generation endpoint |
| Automated late fee calculation | Not implemented |
| Property visit scheduling | Not implemented |
| Multi-language / i18n | Not implemented |
| Unit testing on frontend | Only few test files exist (Navbar, PropertyCard, ProtectedRoute) |
| E2E testing | Not implemented |

### 8.5 Key Architecture Decisions for AppGen

1. **API layer:** Consume existing FastAPI endpoints directly. No need for a BFF — endpoints are already organized by resource.
2. **Auth flow:** Use Supabase Auth client SDK in mobile app (same as web). Handle JWT storage natively.
3. **File uploads:** Use Supabase Storage SDK directly (signed URLs for payment-proofs, public for property images).
4. **Offline-first:** Optional — current web app online-only. Mobile could add SQLite + background sync.
5. **Navigation structure:**
   - Unauthenticated: Landing → Login → Accept Invite → Forgot Password
   - Tenant: Bottom tabs (Home, Payments, Requests, More)
   - Manager: Bottom tabs (Dashboard, Properties, Tenants, Payments, Profile) — replace sidebar
   - Super Admin: Bottom tabs (Overview, Managers, Settings) — simplify from sidebar
6. **Push notifications:** Needs new backend work (device token registration endpoint, FCM integration) — out of scope for web backend currently.
7. **Currency:** All amounts in UGX (Ugandan Shillings). Locale formatting throughout.
8. **Phone format:** Uganda format (+256 XXX XXX XXX). WhatsApp links use international format.
