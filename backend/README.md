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

### Tenants

| Method | Path            | Auth | Description              |
| ------ | --------------- | ---- | ------------------------ |
| GET    | `/tenants`      | Yes  | List tenants (paginated) |
| GET    | `/tenants/{id}` | Yes  | Get tenant by ID         |
| POST   | `/tenants`      | Yes  | Create tenant            |
| PATCH  | `/tenants/{id}` | Yes  | Update tenant            |
| DELETE | `/tenants/{id}` | Yes  | Delete tenant            |

### Leases

| Method | Path           | Auth | Description             |
| ------ | -------------- | ---- | ----------------------- |
| GET    | `/leases`      | Yes  | List leases (paginated) |
| GET    | `/leases/{id}` | Yes  | Get lease by ID         |
| POST   | `/leases`      | Yes  | Create lease            |
| PATCH  | `/leases/{id}` | Yes  | Update lease            |
| DELETE | `/leases/{id}` | Yes  | Delete lease            |

### Payments

| Method | Path             | Auth | Description                        |
| ------ | ---------------- | ---- | ---------------------------------- |
| GET    | `/payments`      | Yes  | List my payments (paginated)       |
| GET    | `/payments/{id}` | Yes  | Get payment by ID                  |
| POST   | `/payments`      | Yes  | Create payment (tenant or manager) |
| PATCH  | `/payments/{id}` | Yes  | Update payment                     |

### Maintenance Requests

| Method | Path                                  | Auth | Description                  |
| ------ | ------------------------------------- | ---- | ---------------------------- |
| GET    | `/maintenance/property/{property_id}` | Yes  | List requests for a property |
| GET    | `/maintenance/{id}`                   | Yes  | Get request by ID            |
| POST   | `/maintenance`                        | Yes  | Create request               |
| PATCH  | `/maintenance/{id}`                   | Yes  | Update request               |
| DELETE | `/maintenance/{id}`                   | Yes  | Delete request               |

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
