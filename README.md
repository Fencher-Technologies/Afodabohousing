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

SQL migrations live in `backend/migrations/` and run in order via the Supabase SQL Editor:

```bash
# Open Supabase Dashboard → SQL Editor → paste and run each file in order
backend/migrations/001_initial_schema.sql
backend/migrations/002_properties_schema.sql
...
backend/migrations/011_boosts.sql        # Property boosts (added last)
```

## Role System

| Role | Access |
|------|--------|
| `super_admin` | Full access, create managers, dashboard analytics |
| `house_manager` | CRUD own properties/leases/tenants |
| `tenant` | View own lease, pay rent, submit maintenance |

- Public signup creates tenant accounts only
- Super admin creates managers directly (password generated server-side)
- Managers invite tenants via email token

## Project Structure

```
backend/
  main.py              # FastAPI app, middleware, router registration
  config.py            # Settings from env vars (pydantic-settings)
  dependencies/        # Auth guards, Supabase clients
  routers/             # API route handlers (auth, admin, boosts, properties, ...)
  models/              # Pydantic models (includes boost models)
  services/            # Business logic (boost service, crud, scheduler)
  tests/               # Pytest test suite
  migrations/          # SQL migrations (applied in order via Supabase SQL Editor)
    011_boosts.sql     # Property boost table + indexes

src/                   # React frontend
  pages/               # Route pages
  components/          # Reusable components
  integrations/        # Supabase client config
  hooks/               # React hooks
  lib/                 # Utilities

supabase/
  migrations/          # SQL migrations (applied in order)
```
