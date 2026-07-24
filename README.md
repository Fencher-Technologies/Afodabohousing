# Afodabo Housing

Rental management platform with invite-only registration, role-based access (super_admin → house_manager → tenant), and PesaPal payment integration.

## Stack

| Layer    | Technology |
|----------|-----------|
| Frontend | React, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend  | Python, FastAPI |
| Database | Supabase (PostgreSQL, RLS, Auth) |
| Payments | PesaPal |

## Quick Start

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Copy `backend/.env.example` to `backend/.env` and fill in your Supabase project credentials.

```bash
uvicorn main:app --reload
# http://localhost:8000 | docs at /docs
```

### Frontend

```bash
npm install
npm run dev
# http://localhost:8080
```

## Migrations

SQL migrations live in `backend/migrations/` and are run in order. Also mirrored under `supabase/migrations/` for Supabase CLI.

```bash
# Open Supabase Dashboard → SQL Editor → paste and run each file in order
backend/migrations/001_initial_schema.sql
...
backend/migrations/011_boosts.sql        # Property boosts
backend/migrations/012_agreements.sql     # Tenancy agreement upload + consent
...
backend/migrations/016_fix_zip_code_nullable.sql  # zip_code nullable, country default UG
```

## Role System

| Role | Access |
|------|--------|
| `super_admin` | Full access, create managers, dashboard analytics |
| `house_manager` | CRUD own properties/leases/tenants |
| `tenant` | View own lease, payments (manager-recorded, view-only), submit maintenance requests |

- Public signup creates tenant accounts only (invite-only, must be invited by manager)
- Super admin creates managers directly (password generated server-side)
- Managers create tenant accounts directly via dashboard (password generated server-side, shown once)
- Managers can generate new OTP (one-time password) for existing tenants via dashboard
- Tenants receive temporary password from their manager at signup

## Project Structure

```
backend/
  main.py              # FastAPI app, middleware, router registration
  config.py            # Settings from env vars (pydantic-settings)
  dependencies/        # Auth guards, Supabase clients
  routers/             # API route handlers (auth, admin, managers, properties, ...)
  models/              # Pydantic models (includes boost models)
  services/            # Business logic (boost service, crud, scheduler)
  tests/               # Pytest test suite
  migrations/          # SQL migrations (applied in order via Supabase SQL Editor)
     016_fix_zip_code_nullable.sql  # zip_code nullable, country default UG, drop redundant CHECK

src/                   # React frontend
  pages/               # Route pages (ManagerDashboard, TenantDashboard, SuperAdminDashboard ...)
  components/          # Reusable components (AvatarUpload, Navbar, PropertyCard, ...)
  integrations/        # Supabase client config & generated types
  hooks/               # React hooks (use-mobile, use-toast)
  lib/                 # Utilities
  services/            # External API services (payments)
  contexts/            # AuthContext (user, session, role)

supabase/
  migrations/          # SQL migrations (applied in order)

## Tenant Dashboard

Four bottom tabs (mobile-first, simple):

| Tab | Purpose |
|-----|---------|
| **Home** | Welcome banner, property details (My Home card), rent summary, lease agreement with payment progress bar, profile, payment reliability ring, calendar, activity feed |
| **Payments** | Payment history (manager-recorded, view-only), search, pagination |
| **Requests** | Maintenance requests — submit new, track status |
| **More** | Profile details, lease info, manager contact, change password, sign out |

Designed for simplicity — large targets, color-coded statuses, minimal text.
```
