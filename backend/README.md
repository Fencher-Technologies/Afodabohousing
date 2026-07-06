# Afodabo Housing API

FastAPI backend for the Afodabo Housing rental management platform.

## Architecture

- **Framework**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL with Row-Level Security)
- **Auth**: Bearer tokens validated against Supabase Auth; role-based access control via `profiles.role`
- **Role hierarchy**: `super_admin` → `house_manager` → `tenant`
  - `super_admin`: full access to all data + create managers
  - `house_manager`: CRUD own properties, leases, tenants
  - `tenant`: view own leases, make payments, submit maintenance requests
- **Invite-only registration**: Public signup restricted to `tenant` role; `house_manager` and `super_admin` created via invite or direct creation
- **Resilience**: Retry with exponential backoff + jitter on all Supabase calls (handles transient DNS failures)
- **Observability**: Per-request structured JSON logging, request ID tracking, metrics endpoint
- **Property boosts**: Paid visibility — boosted properties ranked first in public listings via boost recency sort

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

| Method | Path                   | Auth          | Description                                 |
| ------ | ---------------------- | ------------- | ------------------------------------------- |
| POST   | `/auth/signup`         | No            | Register new user (tenant role only)        |
| POST   | `/auth/signin`         | No            | Email/password sign-in                      |
| POST   | `/auth/signin/form`    | No            | OAuth2 form-based sign-in                   |
| POST   | `/auth/signout`        | Yes           | Sign out                                    |
| POST   | `/auth/reset-password` | No            | Request password reset                      |
| POST   | `/auth/invite`         | Super Admin   | Create invitation token                     |
| POST   | `/auth/accept-invite`  | No (token)    | Accept invitation, create account + session |
| GET    | `/auth/me`             | Yes           | Current user info with full profile         |
| GET    | `/auth/profile`        | Yes           | Get user profile                            |
| PATCH  | `/auth/profile`        | Yes           | Update user profile                         |
| GET    | `/auth/roles`          | Yes           | Get current user role                       |

### Admin (super_admin only)

| Method | Path                              | Description                               |
| ------ | --------------------------------- | ----------------------------------------- |
| POST   | `/admin/create-manager`           | Create house_manager account + temp pass  |
| GET    | `/admin/users`                    | List all users (filterable by `?role=`)   |
| PATCH  | `/admin/users/{user_id}/status`   | Suspend or activate a user                |
| GET    | `/admin/stats`                    | Dashboard stats (financial/property/user) |

### Boosts (super_admin only)

Property visibility boosts — paid placements that appear first in search results.

| Method | Path                          | Auth         | Description                           |
| ------ | ----------------------------- | ------------ | ------------------------------------- |
| POST   | `/boosts`                     | Super Admin  | Create boost for a property           |
| GET    | `/boosts`                     | Super Admin  | List all boosts                       |
| GET    | `/boosts/stats`               | Super Admin  | Boost revenue and usage stats         |
| GET    | `/boosts/{id}`                | Super Admin  | Get boost details                     |
| PATCH  | `/boosts/{id}/cancel`         | Super Admin  | Cancel an active boost                |
| POST   | `/boosts/expire-old`          | Super Admin  | Sweep expired boosts                  |
| GET    | `/boosts/price/default`       | No           | Default pricing (UGX 10K/day)         |

> **Ranking**: Boosted properties appear first on `/properties/public`, sorted by boost recency (newest first). Multiple managers' boosted properties compete equally — newer boost wins. Future tiered priority is supported via the migration's commented columns.

### Properties

| Method | Path                      | Auth  | Description                    |
| ------ | ------------------------- | ----- | ------------------------------ |
| GET    | `/properties`             | Yes   | List my properties (paginated) |
| GET    | `/properties/public`      | No    | List public listings (boosted first) |
| GET    | `/properties/{id}`        | Yes   | Get my property by ID          |
| GET    | `/properties/public/{id}` | No    | Get public property listing    |
| POST   | `/properties`             | Yes   | Create property                |
| PATCH  | `/properties/{id}`        | Yes   | Update my property             |
| DELETE | `/properties/{id}`        | Yes   | Delete my property             |

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
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# or: uv sync

uvicorn main:app --reload
# Server starts at http://localhost:8000
# API docs at http://localhost:8000/docs
```

## Testing

```bash
cd backend
source .venv/bin/activate
pytest
```

## Environment Variables

See `backend/.env.example` (or `backend/.env` for local overrides).

| Variable                     | Default                                       | Description                  |
| ---------------------------- | --------------------------------------------- | ---------------------------- |
| `SUPABASE_URL`               | —                                             | Supabase project URL         |
| `SUPABASE_ANON_KEY`          | —                                             | Supabase anon/public key     |
| `SUPABASE_SERVICE_ROLE_KEY`  | —                                             | Supabase service_role key    |
| `SECRET_KEY`                 | `change-me-in-production`                     | JWT secret                   |
| `ENVIRONMENT`                | `development`                                 | `development`/`production`   |
| `CORS_ORIGINS`               | `["http://localhost:5173","http://localhost:8080"]` | Allowed CORS origins   |
| `DATABASE_URL`               | —                                             | Direct DB connection string  |
| `PESAPAL_CONSUMER_KEY`       | —                                             | PesaPal API key              |
| `PESAPAL_CONSUMER_SECRET`    | —                                             | PesaPal API secret           |
| `PESAPAL_ENVIRONMENT`        | `sandbox`                                     | `sandbox` or `live`          |
