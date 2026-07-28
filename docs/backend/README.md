# Backend Engineering Guide

This guide is the entry point for engineers working on the Afodabo Housing backend. The backend is a FastAPI service backed by Supabase/Postgres and Supabase Storage. It exposes REST endpoints for authentication, properties, rental units, tenants, managers, leases, agreements, payments, receipts, maintenance, messaging, uploads, webhooks, metrics, background reminder workflows, and new v0.3 features: terms & consent, page-view tracking, phone auth, agreement generation, currency exchange, and PDF portfolio reports.

## Quick Links

| Document | Purpose |
| --- | --- |
| [Architecture](architecture.md) | Runtime architecture, request lifecycle, service boundaries, background jobs, observability, and operational notes. |
| [Authorization Matrix](authorization.md) | Endpoint access rules, ownership checks, public routes, service-role routes, and Supabase RLS responsibilities. |
| [Database Schema And ERD](database-schema.md) | Core tables, relationships, indexes, RLS policies, and module-to-table mapping. |
| [Services And Modules](services-and-modules.md) | Router, service, model, dependency, and external integration map. |
| [OpenAPI Contract](openapi.json) | Generated API contract from the live FastAPI application. |

## Running API Documentation

FastAPI serves interactive API documentation automatically when the backend is running:

```bash
cd backend
uv run uvicorn main:app --reload
```

Then open:

- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`
- Raw OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`

The checked-in OpenAPI contract is generated directly from FastAPI routing:

```bash
cd backend
uv run python scripts/generate_openapi.py
```

Regenerate [openapi.json](openapi.json) whenever router paths, request bodies, response models, tags, or auth dependencies change.

## Backend Stack

| Layer | Technology | Notes |
| --- | --- | --- |
| API | FastAPI | Routers live in `backend/routers`; OpenAPI is generated from route declarations and Pydantic models. |
| Data access | Supabase Python client | Most services use PostgREST table queries through `backend/services`. |
| Database | Supabase Postgres | Schema migrations are in `backend/migrations` and mirrored in `supabase/migrations` for Supabase deployments. |
| Auth | Supabase Auth bearer tokens | `get_current_user` validates bearer tokens through Supabase Auth. |
| Storage | Supabase Storage | Upload routes write payment proofs, property images, and tenancy agreements. |
| Jobs | APScheduler | Scheduler starts during FastAPI lifespan outside test mode. |
| Observability | JSON logs, request IDs, metrics, Sentry hooks | Implemented in `main.py` and `services/observability.py`. |
| PDF receipts | ReportLab | Payment receipt PDFs are rendered server-side in `services/receipts.py`. |
| PDF agreements | ReportLab | Tenancy agreements are generated server-side in `services/agreement_generator.py`. |
| Forex | open.er-api.com | Currency exchange rates cached in `services/forex.py` (6h TTL). |

## Engineering Conventions

- Keep API contract changes in routers and Pydantic models so OpenAPI remains authoritative.
- Keep business/data orchestration in services instead of routers when it spans multiple tables.
- Enforce tenant/owner access at the API layer and preserve Supabase RLS as the database backstop.
- Add tests for every new route, permission branch, filter combination, and scheduled workflow.
- Regenerate OpenAPI and update the relevant docs when behavior changes.
