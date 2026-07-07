# Database Schema And ERD

The backend persists core marketplace, tenancy, payment, messaging, notification, and upload metadata in Supabase Postgres. Migrations live in `backend/migrations` and Supabase deployment copies live in `supabase/migrations`.

## ERD

```mermaid
erDiagram
    AUTH_USERS ||--o| PROFILES : owns
    PROFILES ||--o{ PROPERTIES : owner_id
    PROFILES ||--o{ TENANTS : owner_id
    PROPERTIES ||--o{ RENTAL_UNITS : contains
    PROPERTIES ||--o{ LEASES : leased_under
    TENANTS ||--o{ LEASES : signs
    LEASES ||--o{ PAYMENTS : bills
    TENANTS ||--o{ PAYMENTS : pays
    PROPERTIES ||--o{ MAINTENANCE_REQUESTS : receives
    TENANTS ||--o{ MAINTENANCE_REQUESTS : submits
    AUTH_USERS ||--o{ MESSAGES : sends
    AUTH_USERS ||--o{ MESSAGES : receives
    AUTH_USERS ||--o{ NOTIFICATIONS : receives
    NOTIFICATIONS ||--o{ NOTIFICATION_DELIVERIES : tracked_by
    PROPERTIES ||--o{ TENANCIES : has
    AUTH_USERS ||--o{ TENANCIES : manager

    AUTH_USERS {
        uuid id PK
        text email
    }
    PROFILES {
        uuid id PK
        uuid user_id UK
        text email
        text full_name
        text phone
        text role
    }
    PROPERTIES {
        uuid id PK
        uuid owner_id FK
        text title
        text address
        text property_type
        numeric monthly_rent
        text status
        boolean is_active
    }
    RENTAL_UNITS {
        uuid id PK
        uuid property_id FK
        uuid owner_id FK
        text unit_number
        numeric rent_amount
        text status
    }
    TENANTS {
        uuid id PK
        uuid owner_id FK
        uuid user_id FK
        text first_name
        text last_name
        text email
        text status
    }
    LEASES {
        uuid id PK
        uuid owner_id FK
        uuid property_id FK
        uuid tenant_id FK
        date start_date
        date end_date
        numeric monthly_rent
        text status
    }
    PAYMENTS {
        uuid id PK
        uuid lease_id FK
        uuid tenant_id FK
        numeric amount
        text payment_type
        text status
        date due_date
        date paid_date
    }
    MAINTENANCE_REQUESTS {
        uuid id PK
        uuid property_id FK
        uuid tenant_id FK
        text title
        text priority
        text status
    }
    MESSAGES {
        uuid id PK
        uuid sender_id FK
        uuid receiver_id FK
        uuid property_id FK
        text content
        boolean is_read
    }
    NOTIFICATIONS {
        uuid id PK
        uuid recipient_id FK
        text type
        text title
        jsonb metadata
        boolean is_read
    }
    NOTIFICATION_DELIVERIES {
        uuid id PK
        text event_key
        text channel
        uuid recipient_id FK
        text status
    }
    TENANCIES {
        uuid id PK
        uuid property_id FK
        uuid tenant_id
        uuid manager_id
        numeric rent_amount
        text status
    }
```

## Core Tables

| Table | Purpose | Primary Writers |
| --- | --- | --- |
| `profiles` | App profile for Supabase users, including role and contact data. | Auth signup trigger, auth profile routes. |
| `properties` | Marketplace property records and listing metadata. | Properties router/service. |
| `rental_units` | Unit-level records for multi-unit properties. | Rental units router. |
| `tenants` | Tenant records managed by owners/managers, optionally linked to an auth user. | Tenants router/service. |
| `leases` | Contractual link between owner, property, and tenant. | Leases router/service; scheduler reads active leases. |
| `payments` | Rent, deposits, late fees, and other payment records. | Payments router/service; Pesapal webhook updates. |
| `maintenance_requests` | Tenant/manager maintenance workflow. | Maintenance router/service. |
| `messages` | In-app messaging between users. | Messages router. |
| `notifications` | In-app notification inbox. | Scheduler notification dispatcher. |
| `notification_deliveries` | Idempotency and delivery audit for in-app, email, and push channels. | Scheduler notification dispatcher. |
| `tenancies` | Additional tenancy-period table used by newer tenancy workflows. | Migration-defined; currently background work primarily reads `leases`. |

## Important Constraints And Indexes

| Area | Constraint/Index |
| --- | --- |
| Property type | Restricted to supported marketplace categories in current migrations and models: `Residential`, `Office Space`. |
| Payment status | `pending`, `completed`, `failed`, `refunded`. |
| Lease status | `draft`, `active`, `expired`, `terminated`, `renewed`. |
| Notification idempotency | `UNIQUE(event_key, channel)` on `notification_deliveries`. |
| Filtering indexes | Composite indexes support multi-parameter filters for properties, tenants, leases, payments, and profiles. |
| Ownership indexes | Owner, tenant, property, lease, status, and date indexes support common API filters and authorization checks. |

## Module To Table Mapping

| Module | Tables Read | Tables Written |
| --- | --- | --- |
| Auth | `profiles`, Supabase `auth.users` | `profiles`, Supabase Auth |
| Properties | `properties` | `properties` |
| Rental Units | `rental_units`, `properties` | `rental_units` |
| Tenants | `tenants` | `tenants` |
| Managers | `profiles` | None |
| Leases | `leases`, `tenants` | `leases` |
| Payments | `payments`, `leases`, `tenants`, `properties`, `profiles` | `payments` |
| Receipts | `payments`, `leases`, `tenants`, `properties`, `profiles` | None |
| Maintenance | `maintenance_requests`, `properties` | `maintenance_requests` |
| Messages | `messages`, `profiles` | `messages` |
| Uploads | Supabase Storage | Supabase Storage |
| Webhooks | `payments` | `payments` |
| Scheduler | `leases`, `tenants`, `properties`, `notifications`, `notification_deliveries` | `notifications`, `notification_deliveries` |

## Migration Notes

- Apply migrations in timestamp/order sequence.
- Prefer additive migrations for production changes.
- When an API feature depends on indexes or new constraints, include both `backend/migrations` and Supabase migration copies when applicable.
- Keep Pydantic model constraints aligned with database constraints so invalid requests fail before reaching Postgres.
