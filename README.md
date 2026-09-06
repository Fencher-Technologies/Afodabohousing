# Axis

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

### Frontend (Docker)

```bash
# Build — loads VITE_* vars from .env, then builds the image.
# Override VITE_API_URL to point at your backend (Render URL or http://localhost:8000).
set -a && . ./.env && set +a
docker build \
  --build-arg VITE_API_URL=https://afodabohousing.onrender.com \
  --build-arg VITE_SUPABASE_URL \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY \
  --build-arg VITE_MOBILE_APK_URL \
  -t axis-web .

# Run
docker run -p 8080:8080 axis-web
# http://localhost:8080
```

The Supabase URL + publishable key and `VITE_API_URL` are baked in at build
time (Vite embeds `VITE_*` vars), so the `VITE_SUPABASE_URL` /
`VITE_SUPABASE_PUBLISHABLE_KEY` build args must be set or the app white-screens.
Override the container port with `docker run -p <host>:8080` or `-e PORT=<port>`.

### Backend & Frontend (Docker Compose)

`docker-compose.yml` builds **both** services and starts the backend first
(its healthcheck gates the web service):

```bash
# One command — builds backend + web, then runs both
docker compose up --build -d
# Frontend: http://localhost:8080  |  Backend API: http://localhost:8000 (docs at /docs)
```

- The web service bakes `VITE_API_URL=http://localhost:8000` from your `./.env`
  when run locally (so API calls land on the local backend, not Render).
- Backend config (`SUPABASE_*`, `DATABASE_URL`, etc.) comes from a copied
  `backend/.env`; if it's missing the backend still boots with defaults.

```bash
docker compose logs -f        # follow logs
docker compose ps             # show services
docker compose restart web    # rebuild only after editing src (omit --build to skip rebuild)
docker compose up --build web # rebuild + restart the web service
```

### Stop / Clean up

```bash
docker compose down            # stop + remove containers/networks (keeps images)
docker compose down -v         # also remove named volumes
docker builder prune -f        # reclaim ~build cache (~3.9GB)
docker system df               # show what's using space
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
- `MobileAppAfodabo_v2/` — Rork (Expo Router + React Native) app (branding in-progress: Axis)
- `afodabo-housing-mobile/` — React Native app

See `MobileAppAfodabo_v2/README.md` for Pesapal local vs Render wiring and `.env.example`.

## Pesapal Payment Integration

Backend uses Pesapal API 3.0 for property boosts and manager subscriptions.

**Permanent backend (Render):** Register the IPN once against the deployed URL:
```bash
python backend/scripts/register_ipn.py https://afodabohousing.onrender.com/payments/webhook/pesapal
```
Set `PESAPAL_IPN_URL=https://afodabohousing.onrender.com/payments/webhook/pesapal`
in the backend `.env` (used as a fallback only; the stored `ipn_id` is what
matters). The deployed URL is already public.

<!-- Local development only (ngrok): register the tunnel URL every time ngrok restarts.
python backend/scripts/register_ipn.py https://YOUR_NGROK_URL/payments/webhook/pesapal
-->

See `docs/pesapal-setup.md` for full setup guide.
