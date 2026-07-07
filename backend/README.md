# Afodabo Housing API

FastAPI backend for the Afodabo Housing rental management platform.

## Architecture

- **Framework**: FastAPI (async Python)
- **Database**: Supabase (PostgreSQL with Row-Level Security)
- **Auth**: Protected routes validate bearer tokens against Supabase Auth using the existing project credentials
- **Roles**: Stored on `profiles.role` and enforced by Supabase RLS

## Key Design Decisions

1. **Schema alignment**: Models match the current Supabase schema (properties, tenants, leases, payments, maintenance requests)
2. **Resilience**: Retry with exponential backoff + jitter on all Supabase calls
3. **Observability**: Per-request structured JSON logging, real-time latency metrics, request ID tracking
4. **Rate limiting**: Configurable per-client-IP rate limiting middleware
5. **Auth**: Token validation is delegated to Supabase Auth so the backend stays aligned with the project's real token format without extra secrets
6. **Client caching**: Supabase client instances are cached and reused (not recreated per request)

## API Endpoints

### Health

| Method | Path             | Description                   |
| ------ | ---------------- | ----------------------------- |
| GET    | `/`              | Root info                     |
| GET    | `/health`        | Health check                  |
| GET    | `/health/ready`  | Readiness check (includes DB) |
| GET    | `/metrics`       | Real-time request metrics     |
| GET    | `/api/endpoints` | List all registered endpoints |

### Auth

| Method | Path                   | Auth  | Description                                 |
| ------ | ---------------------- | ----- | ------------------------------------------- |
| POST   | `/auth/signup`         | No    | Register new user                           |
| POST   | `/auth/signin`         | No    | Email/password sign-in                      |
| POST   | `/auth/signin/form`    | No    | OAuth2 form-based sign-in                   |
| POST   | `/auth/signout`        | Yes   | Sign out                                    |
| POST   | `/auth/reset-password` | No    | Request password reset                      |
| GET    | `/auth/me`             | Yes   | Current user info + roles                   |
| GET    | `/auth/profile`        | Yes   | Get user profile                            |
| PATCH  | `/auth/profile`        | Yes   | Update user profile                         |
| GET    | `/auth/roles`          | Yes   | Get current user role from profiles         |
| POST   | `/auth/roles`          | Admin | Assign role to user (updates profiles.role) |

### Properties

| Method | Path                      | Auth | Description                    |
| ------ | ------------------------- | ---- | ------------------------------ |
| GET    | `/properties`             | Yes  | List my properties (paginated) |
| GET    | `/properties/public`      | No   | List public listings           |
| GET    | `/properties/{id}`        | Yes  | Get my property by ID          |
| GET    | `/properties/public/{id}` | No   | Get public property listing    |
| POST   | `/properties`             | Yes  | Create property                |
| PATCH  | `/properties/{id}`        | Yes  | Update my property             |
| DELETE | `/properties/{id}`        | Yes  | Delete my property             |

`property_type` is restricted to `Residential` or `Office Space`. Create and update requests with any other value fail request validation before reaching the database.

Property and public listing list endpoints support combined filters: `property_type`, `status`, `occupancy`, `is_active`, `city`, `state`, `country`, `min_rent`, `max_rent`, `min_bedrooms`, `min_bathrooms`, `created_from`, `created_to`, and `search`.

### Managers

| Method | Path        | Auth | Description                |
| ------ | ----------- | ---- | -------------------------- |
| GET    | `/managers` | No   | List house managers        |

Manager list filters: `search`, `user_id`, `email`, and `phone`.

### Tenants

| Method | Path            | Auth | Description              |
| ------ | --------------- | ---- | ------------------------ |
| GET    | `/tenants`      | Yes  | List tenants (paginated) |
| GET    | `/tenants/{id}` | Yes  | Get tenant by ID         |
| POST   | `/tenants`      | Yes  | Create tenant            |
| PATCH  | `/tenants/{id}` | Yes  | Update tenant            |
| DELETE | `/tenants/{id}` | Yes  | Delete tenant            |

Tenant list filters: `status`, `search`, `has_user_account`, `created_from`, and `created_to`.

### Leases

| Method | Path           | Auth | Description             |
| ------ | -------------- | ---- | ----------------------- |
| GET    | `/leases`      | Yes  | List leases (paginated) |
| GET    | `/leases/{id}` | Yes  | Get lease by ID         |
| POST   | `/leases`      | Yes  | Create lease            |
| PATCH  | `/leases/{id}` | Yes  | Update lease            |
| DELETE | `/leases/{id}` | Yes  | Delete lease            |

Lease list filters: `status`, `property_id`, `tenant_id` for manager views, `start_from`, `start_to`, `end_from`, and `end_to`.

### Payments

| Method | Path                         | Auth | Description                               |
| ------ | ---------------------------- | ---- | ----------------------------------------- |
| GET    | `/payments`                  | Yes  | List my payments (paginated)              |
| GET    | `/payments/{id}`             | Yes  | Get payment by ID                         |
| GET    | `/payments/{id}/receipt.pdf` | Yes  | Download a rent payment receipt PDF       |
| GET    | `/payments/{id}/receipt`     | Yes  | View a printable rent payment receipt     |
| POST   | `/payments`                  | Yes  | Create payment (tenant or manager)        |
| PATCH  | `/payments/{id}`             | Yes  | Update payment                            |

Payment list filters: `property_id`, `lease_id`, `tenant_id` for manager views, `status`, `payment_type`, `payment_method`, `due_from`, `due_to`, `paid_from`, `paid_to`, `created_from`, and `created_to`.

Receipts include the receipt number, tenant, property, manager, amount, payment date, payment method, status, and transaction ID. Tenants can download receipts for their own payments; managers/owners can download receipts for payments on leases they own. The PDF endpoint returns `application/pdf` with an attachment filename, while the printable endpoint returns `text/html`.

### Maintenance Requests

| Method | Path                                  | Auth | Description                  |
| ------ | ------------------------------------- | ---- | ---------------------------- |
| GET    | `/maintenance/property/{property_id}` | Yes  | List requests for a property |
| GET    | `/maintenance/{id}`                   | Yes  | Get request by ID            |
| POST   | `/maintenance`                        | Yes  | Create request               |
| PATCH  | `/maintenance/{id}`                   | Yes  | Update request               |
| DELETE | `/maintenance/{id}`                   | Yes  | Delete request               |

## Background Jobs

The API starts an APScheduler async worker outside the test environment.

- Rent reminders run on the existing schedule.
- Tenancy expiry reminders run daily at 06:00 in production. The job checks active leases expiring in exactly `30`, `14`, `7`, `1`, or `0` days.
- Each reminder writes an in-app row to `notifications` and attempts push/email delivery when `PUSH_PROVIDER_URL`/`PUSH_PROVIDER_API_KEY` or `EMAIL_PROVIDER_URL`/`EMAIL_PROVIDER_API_KEY` are configured.
- Delivery idempotency is enforced by `notification_deliveries(event_key, channel)`, so rerunning the job does not spam tenants with duplicate in-app, email, or push reminders for the same lease milestone.

## Rate Limiting

All non-health endpoints are protected by global per-client-IP rate limiting. Authentication endpoints (`/auth/signin`, `/auth/signin/form`, `/auth/signup`, plus `/login` and `/register` aliases) and payment endpoints (`/payments*`) use stricter buckets. Limit responses return HTTP `429` with `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `X-RateLimit-Policy` headers. Blocked requests are logged with the matched policy.

Local load probe:

```bash
uv run python scripts/load_test_rate_limit.py --base-url http://127.0.0.1:8000 --requests 40
```

## Running

```bash
uv sync
uv run uvicorn main:app --reload
uv run python -m uvicorn main:app --reload
```

## Testing

```bash
uv run pytest
```

## Environment Variables

See `.env.example` for all configuration options.

### Sentry

Set `SENTRY_ENDPOINT` or `SENTRY_DSN` to the Sentry DSN from your project settings.
Leave it empty locally if you do not want crash reporting enabled.

For automated tests, keep `TESTING=true` so Sentry stays disabled.
