# Mobile App Implementation Guide — v0.3 Features

This doc maps each new v0.3 backend feature to the mobile app screens and API calls required.

## API Base

```
EXPO_PUBLIC_API_BASE_URL=https://your-backend.onrender.com
```

Auth: Bearer token from Supabase Auth session.

## Feature-by-Feature Breakdown

### 1. T&C Consent

**Backend endpoints:**
- `GET /terms/current` — fetch active terms version
- `GET /terms/consent-status` — check if current user has consented
- `POST /terms/accept` — record consent (`{ terms_version_id }`)

**Mobile steps:**
1. On first login / app launch, call `GET /terms/consent-status`
2. If `has_consented == false`, show a full-screen T&C modal with the `current_version.content`
3. Add a "I Accept" button that calls `POST /terms/accept`
4. Store `has_consented` locally; re-check on each app cold start
5. Re-check when `current_version.version > consented_version`

### 2. GPS Required

**Backend change:** `latitude` and `longitude` are now required in `PropertyCreate` (Pydantic validation) and DB NOT NULL.

**Mobile steps:**
1. In "Add Property" form, add two required fields: latitude / longitude
2. Use the device GPS (expo-location) to auto-fill when "Use current location" is tapped
3. Validate: lat ±90, lng ±180 before submitting
4. For existing properties, display lat/lng on the property detail map

### 3. Guest → Free User

**Backend change:** Public signup accepts `role: "free"`. Free users can bookmark.

**Mobile steps:**
1. Add "Sign Up Free" flow — calls `POST /auth/signup` with `role: "free"`
2. Free users see a "Save" (bookmark) icon on property cards
3. Bookmark API: `GET /bookmarks`, `POST /bookmarks/{property_id}`, `DELETE /bookmarks/{property_id}`
4. "My Saved" tab on the home screen shows bookmarked properties

### 4. Page Views / Click Tracking

**Backend endpoint:**
- `POST /tracking/page-view` — record a page view (`{ path, referrer?, session_id?, metadata? }`)

**Mobile steps:**
1. Create a tracking hook/utility that fires on every screen navigation
2. Call `POST /tracking/page-view` with the current route path and optional metadata
3. Include `session_id` (UUID generated per app session) to group views
4. Include `metadata.property_id` on property detail screens for popular-property analytics
5. Fire-and-forget — no blocking, no retry

### 5. Effective Dates (Tenancy Progress)

**Backend change:** Lease responses now include `tenancy_total_days`, `tenancy_elapsed_days`, `tenancy_remaining_days`, `tenancy_progress_pct`.

**Mobile steps:**
1. In "My Tenancy" / lease detail screen, display a progress bar using `tenancy_progress_pct`
2. Show "X days remaining" below the bar
3. Apply progress color coding:
   - `< 25%` → accent/teal (just started)
   - `25-50%` → primary/terracotta (mid-term)
   - `50-75%` → gold (nearing end)
   - `> 75%` → destructive/red (expiring soon)
   - Expired → muted gray

### 6. Overdue Tenant List

**Backend endpoint:**
- `GET /leases/overdue` — returns list of overdue leases with balance info

**Mobile steps:**
1. Manager dashboard: add "Overdue Tenants" card on the home tab
2. Card shows total count and total balance due
3. Tapping opens a list: tenant name, property, balance, days past due
4. Each row has a "Send Reminder" button

### 7. Phone Auth

**Backend endpoints:**
- `POST /auth/phone/signin` — request OTP (`{ phone }`)
- `POST /auth/phone/verify` — verify OTP (`{ phone, token }`)

**Mobile steps:**
1. Add "Sign in with Phone" option on the login screen
2. Phone input → calls `POST /auth/phone/signin`
3. OTP input screen → calls `POST /auth/phone/verify`
4. On success, store the returned `access_token` and `refresh_token`
5. Fall back to email/password for existing users

### 8. PDF Reports

**Backend endpoint:**
- `GET /exports/report-pdf` — download full portfolio PDF report

**Mobile steps:**
1. Manager dashboard "Reports" tab: add "Download PDF Report" button
2. Use `expo-file-system` to download the PDF:
   ```ts
   const uri = FileSystem.cacheDirectory + 'portfolio_report.pdf';
   await FileSystem.downloadAsync(
     `${API_BASE}/exports/report-pdf`,
     uri
   );
   ```
3. Open with `expo-sharing` or `expo-intent-launcher`

### 9. Currency Exchange

**Backend endpoints:**
- `GET /forex/rates` — all rates
- `GET /forex/convert?amount=100000&from=UGX&to=USD`

**Mobile steps:**
1. Property detail: show rent in UGX + estimated USD/EUR below
2. Settings: "Preferred Currency" option
3. Cache rates locally (6h matches backend cache TTL)

### 10. Auto Agreement Generation

**Backend endpoint:**
- `POST /agreements/generate` — generate PDF agreement for a lease (`{ lease_id, tenant_signature? }`)

**Mobile steps:**
1. After creating a tenancy, show "Generate Agreement" button
2. Call `POST /agreements/generate` with the lease ID
3. Download the returned PDF via `expo-file-system`
4. Show "Share Agreement" options (WhatsApp, email, print)
5. Optionally upload the generated PDF to Supabase Storage and link it via `POST /agreements/{lease_id}/upload`

### 11. Auto Signatures

Already handled server-side — tenant and manager names are embedded in generated agreement PDFs (signature fields).

**Mobile steps:** None — just ensure `tenant_signature` field is passed when generating an agreement (can default to full name).

### 12. Onboarding Benefits

Frontend-only — three role-specific benefit cards on the landing page (Tenant, House Manager, Free User).

**Mobile steps:**
1. First-launch onboarding carousel: "For Tenants", "For Managers", "For Free Users"
2. Each slide lists the role-specific features
3. Final slide: "Sign Up Free" CTA

### 13. Simplify Manager Dashboard

**Backend endpoint:**
- `GET /leases/overdue` feeds the overdue card

**Mobile steps:**
1. Dashboard home: stat row (properties, tenants, revenue)
2. Alert: pending payments count (tap → payments tab)
3. Alert: expiring tenancies (≤14 days)
4. Card: overdue tenants with balances
5. Quick actions: Add Property, Add Tenant

### 14. Progress Color Codes

CSS classes for tenancy progress: `tenancy-early`, `tenancy-mid`, `tenancy-late`, `tenancy-expiring`, `tenancy-expired`.

**Mobile steps:**
1. Map to React Native colors in the theme:
   ```ts
   const progressColor = (pct: number) => {
     if (pct < 25) return '#0F766E'    // teal
     if (pct < 50) return '#C8644A'    // terracotta
     if (pct < 75) return '#E8A838'    // gold
     return '#DC2626'                  // red
   }
   ```

## Implementation Priority

| Priority | Features | Effort |
|----------|----------|--------|
| P0 (MVP) | Guest → Free User (bookmarks), Page Views, Agreement Generation, Effective Dates | 2-3 days |
| P1 | T&C Consent, Phone Auth, Overdue List, Progress Colors | 2 days |
| P2 | PDF Reports, Onboarding Screens, Simplify Dashboard | 1 day |
| P3 | Currency Exchange, GPS detail display | 0.5 day |

## API Client Example

```ts
const API = {
  terms: {
    current: () => fetch(`${BASE}/terms/current`).then(r => r.json()),
    status: () => fetch(`${BASE}/terms/consent-status`, { headers: AUTH }).then(r => r.json()),
    accept: (id: string) => fetch(`${BASE}/terms/accept`, { method: 'POST', headers: AUTH, body: JSON.stringify({ terms_version_id: id }) }).then(r => r.json()),
  },
  tracking: {
    pageView: (path: string, meta?: object) =>
      fetch(`${BASE}/tracking/page-view`, { method: 'POST', headers: AUTH, body: JSON.stringify({ path, ...meta }) }).catch(() => {}),
  },
  phoneAuth: {
    signin: (phone: string) => fetch(`${BASE}/auth/phone/signin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone }) }).then(r => r.json()),
    verify: (phone: string, token: string) => fetch(`${BASE}/auth/phone/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, token }) }).then(r => r.json()),
  },
  agreements: {
    generate: (leaseId: string, signature?: string) =>
      fetch(`${BASE}/agreements/generate`, { method: 'POST', headers: AUTH, body: JSON.stringify({ lease_id: leaseId, tenant_signature: signature }) }),
  },
  forex: {
    rates: () => fetch(`${BASE}/forex/rates`, { headers: AUTH }).then(r => r.json()),
    convert: (amount: number, to: string) => fetch(`${BASE}/forex/convert?amount=${amount}&to_currency=${to}`, { headers: AUTH }).then(r => r.json()),
  },
  leases: {
    overdue: () => fetch(`${BASE}/leases/overdue`, { headers: AUTH }).then(r => r.json()),
  },
  exports: {
    reportPdf: () => `${BASE}/exports/report-pdf`,
  },
};
```
