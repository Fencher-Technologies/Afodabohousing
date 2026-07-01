# Super Admin: Manager Creation & Analytics Dashboard

## Understanding Summary

- **What:** A super admin dashboard where the admin manually creates manager accounts (immediate creation, no invite flow), and a full analytics dashboard covering financial, property, and user metrics
- **Why:** Super admin wants full control over who becomes a manager, and a single-pane view of platform health
- **Who:** Single super admin managing the platform
- **Constraints:** 100s of properties/tenants, page-load refresh (room for real-time later), full data visibility
- **Non-goals:** Public registration, self-service manager onboarding, tenant-facing analytics

## Assumptions

- Supabase backend stores payments, leases, properties, profiles data in existing tables
- Email delivery uses Supabase built-in auth emails or the existing SMS/email service
- Existing `GET /admin/stats` endpoint is expanded significantly
- Frontend stays at `/dashboard/super-admin`

---

## Architecture

### Backend

#### 1. `POST /admin/create-manager` (new)

**Auth:** `require_super_admin`

**Request:**
```json
{
  "email": "manager@example.com",
  "full_name": "John Mukasa",
  "phone": "+256 700 000000"
}
```

**Flow:**
1. Validate inputs, check for duplicate email in profiles
2. Generate random password via `secrets.token_urlsafe(12)`
3. `supabase.auth.admin.create_user(email, password, email_confirm=True, user_metadata={full_name})`
4. Insert profile: role=`house_manager`, status=`active`, created_by=super_admin.id
5. Send welcome email with credentials
6. Return `{ message, email, temporary_password }`

**Error states:** 400 (duplicate email, missing fields), 502 (upstream Supabase failure)

#### 2. `GET /admin/stats` (expanded)

**Auth:** `require_super_admin`

**Response structure:**
```json
{
  "financial": {
    "total_collected": 45200000,
    "total_outstanding": 8200000,
    "monthly_revenue": [{ "month": "2026-01", "amount": 3800000 }],
    "recent_payments": 25,
    "avg_collection_rate": 0.84
  },
  "property": {
    "total": 48,
    "occupied": 41,
    "vacant": 7,
    "occupancy_rate": 0.854,
    "by_district": [{ "district": "Kampala", "count": 22 }],
    "recently_added": 3
  },
  "users": {
    "total_managers": 8,
    "active_managers": 7,
    "suspended_managers": 1,
    "total_tenants": 64,
    "active_tenants": 60,
    "new_this_month": 5,
    "total": 72
  }
}
```

Uses 6–8 sequential queries on existing tables. No materialized views needed at this scale.

### Frontend

#### Create Manager Dialog

Combined with existing invite dialog via tab/radio:
- **Invite tab** — current email-only invite flow (unchanged)
- **Create tab** — form with Full Name, Email, Phone fields

On success: displays temporary password with Copy button + note that email was sent.

#### Analytics Layout

- **Row 1 (4 KPI cards):** Total Collected, Occupancy Rate, Active Tenants, Outstanding Payments
- **Row 2 (full-width):** Monthly revenue bars (last 6–12 months, plain divs, no chart library)
- **Row 3 (2-col):** Occupancy breakdown + top districts (left), user summary (right)

Refresh via existing button in header.

---

## Decision Log

| Decision | Options | Chosen |
|---|---|---|
| Manager creation | Extend invite vs new endpoint | New `POST /admin/create-manager` |
| Analytics delivery | Single vs multi-endpoint | Single expanded `GET /admin/stats` |
| Chart dependency | recharts vs plain divs | Plain divs (YAGNI) |
| Analytics scope | Phased vs all-at-once | All-at-once |
| Credential delivery | Email-only vs email+display | Both |

---

## Implementation Order

1. Backend: `POST /admin/create-manager` endpoint
2. Backend: Expand `GET /admin/stats` with financial + property + user queries
3. Frontend: Update invite dialog to add "Create" tab
4. Frontend: Replace stat cards with full analytics layout
5. Test: creation flow, stats accuracy, role isolation
