# Afodabo Housing

Rental management platform with role-based access (super_admin → house_manager → tenant → free user), PesaPal payment integration, digital tenancy agreements, and automated workflows.

## Stack

| Layer    | Technology |
|----------|-----------|
| Frontend | React, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend  | Python, FastAPI, ReportLab (PDF), APScheduler |
| Database | Supabase (PostgreSQL, RLS, Auth, Storage) |
| Payments | PesaPal |

## Quick Start

### Backend

```bash
cd backend
uv sync        # or: pip install -r requirements.txt
```

Copy `backend/.env.example` to `backend/.env` and fill in your Supabase project credentials.

```bash
uv run uvicorn main:app --reload
# http://localhost:8000 | docs at /docs
```

### Frontend

```bash
npm install
npm run dev
# http://localhost:8080
```

## Migrations

SQL migrations live in `backend/migrations/` and run in numeric order via Supabase SQL Editor.

```bash
# Apply via Dashboard → SQL Editor, one file at a time in order
```

Latest migration:

| File | Purpose |
|------|---------|
| `028_drop_price_add_indexes.sql` | Drop duplicated `properties.price`, add FK indexes |
| `029_fix_renewal_uuid_types.sql` | Fix renewal tables: text → uuid with FK constraints |

## Role System

| Role | Access |
|------|--------|
| `super_admin` | Full access, create managers, dashboard analytics |
| `house_manager` | CRUD own properties/leases/tenants, review payments |
| `tenant` | View own lease/payments, submit maintenance requests, sign agreements |
| `free` | Browse properties, bookmark listings, contact managers |

- Phone users register via OTP verification + PIN setup
- Public signup creates `free` or `tenant` accounts
- Super admin creates managers directly (password generated server-side)
- Managers create tenant accounts via dashboard (password shown once)
- Managers can generate new OTP for existing tenants

## New Features (v0.3+)

| Feature | Backend | Frontend | Mobile |
|---------|---------|----------|--------|
| T&C Consent | `routers/terms.py`, `services/` | — | Pending |
| GPS Required | `models/property.py` (lat/lng required) | Add lat/lng in PropertyForm | Pending |
| Guest → Free User | `routers/auth.py` (free role) | Bookmark button on `PropertyCard` | Pending |
| Page Views / Clicks | `routers/tracking.py`, `services/tracking.py` | — | Pending |
| Effective Dates | `services/crud.py` (tenancy_progress fields) | — | Pending |
| Overdue Tenant List | `routers/leases.py` (`GET /leases/overdue`) | Overdue card in dashboard | Pending |
| Phone Auth | `routers/phone_auth.py` (OTP/PIN signin + register) | Phone OTP/PIN signin, phone registration | Pending |
| PDF Reports | `routers/exports.py` (`GET /exports/report-pdf`) | — | Pending |
| Currency Exchange | `routers/forex.py`, `services/forex.py` | — | Pending |
| Auto Agreement Gen | `routers/agreement_generator.py`, `services/agreement_generator.py` | — | Pending |
| Auto Signatures | Names embedded in generated PDFs | — | Pending |
| Onboarding Benefits | — | Role-specific cards on landing page | Pending |
| Simplify Dashboard | — | Overdue section, property summary | Pending |
| Progress Colors | — | CSS classes in `index.css` | Pending |

## Project Structure

```
backend/
  main.py                   # FastAPI app, middleware, router registration
  config.py                 # Settings from env vars (pydantic-settings)
  dependencies/             # Auth guards, Supabase clients
  routers/                  # API route handlers (19 routers)
  models/                   # Pydantic models
  services/                 # Business logic (crud, scheduler, forex, receipts, etc.)
  tests/                    # Pytest test suite
  migrations/               # Legacy SQL migrations
  scripts/                  # Utilities

src/                        # React frontend
  pages/                    # Route pages
  components/               # Reusable components
  integrations/             # Supabase client config & generated types
  hooks/                    # React hooks
  lib/                      # Utilities
  services/                 # External API services
  contexts/                 # AuthContext

supabase/
  migrations/               # SQL migrations (single source of truth)
```

## Mobile App

Two mobile codebases exist:
- `MobileAppAfodabo_v2/` — Rork (Expo Router + React Native) app
- `afodabo-housing-mobile/` — React Native app

See `docs/mobile-implementation.md` for the mobile API integration guide.
