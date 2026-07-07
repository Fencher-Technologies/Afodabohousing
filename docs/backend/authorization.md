# Authorization Matrix

## Auth Model

The backend uses Supabase bearer tokens. Routes that depend on `get_current_user` require an `Authorization: Bearer <token>` header. Supabase Auth resolves the token into `CurrentUser(id, email, role)`.

Role information is stored in `profiles.role`. The API currently recognizes landlord/owner, tenant, house manager, and admin style access patterns. Route-level ownership checks are enforced in routers and services; Supabase RLS policies provide the database backstop.

## Access Legend

| Term | Meaning |
| --- | --- |
| Public | No bearer token required. |
| Authenticated | Any valid Supabase user token. |
| Owner/manager | The authenticated user owns the property/lease/resource through `owner_id` or a related lease/property. |
| Tenant self | The authenticated user is linked to `tenants.user_id` and can only access their own records. |
| Service role | Uses the service client for trusted server-side operations or external callbacks. |
| Admin | Requires admin role through `require_admin` or a profiles/RPC role check. |

## Endpoint Matrix

| Area | Endpoint Pattern | Access | Enforcement Notes |
| --- | --- | --- | --- |
| Health | `GET /`, `GET /health`, `GET /metrics`, `GET /api/endpoints` | Public | Operational visibility endpoints. |
| Auth | `POST /auth/signup`, `/auth/signin`, `/auth/signin/form`, `/auth/refresh`, `/auth/reset-password` | Public | Calls Supabase Auth; role validation happens in auth router. |
| Auth profile | `POST /auth/signout`, `GET /auth/me`, `GET/PATCH /auth/profile`, `GET /auth/roles` | Authenticated | Uses `get_current_user`; profile reads/writes scoped to current user. |
| Role assignment | `POST /auth/roles` | Admin | Uses admin guard and service client. |
| Properties public | `GET /properties/public`, `GET /properties/public/{id}` | Public | Public listing access; filters are query based. |
| Properties private | `GET/POST/PATCH/DELETE /properties...` | Owner/manager | `owner_id` is current user for create/list/update/delete. |
| Rental units public reads | `GET /rental-units/property/{property_id}`, `GET /rental-units/{unit_id}` | Public | RLS should restrict available/active rows in production. |
| Rental units writes | `POST/PATCH/DELETE /rental-units...` | Owner/manager | Router checks property/unit `owner_id` against current user. |
| Tenants | `GET/POST/PATCH/DELETE /tenants...` | Owner/manager | Owner-scoped through `owner_id`; tenant email resolution is owner-scoped. |
| Managers | `GET /managers` | Authenticated | Returns profiles with `role = house_manager`; endpoint requires a token. |
| Leases | `GET /leases`, `GET /leases/{id}` | Owner/manager or tenant self | Tenant users see their own leases; owners see leases where `owner_id` is current user. |
| Lease writes | `POST/PATCH/DELETE /leases...` | Owner/manager | Service methods require current user as `owner_id`. |
| Payments | `GET /payments`, `GET /payments/{id}` | Owner/manager or tenant self | Tenant users see their own payments; owners see payments through owned leases. |
| Payment writes | `POST/PATCH /payments...` | Owner/manager or tenant self | Tenants can create/update only their own payment path; owners must own the linked lease. |
| Receipts | `GET /payments/{id}/receipt.pdf`, `GET /payments/{id}/receipt` | Owner/manager or tenant self | Reuses payment/lease/tenant ownership checks before rendering PDF/HTML. |
| Pesapal initiation | `POST /payments/initiate-pesapal` | Authenticated | Creates Pesapal order request using configured credentials. |
| Pesapal webhook | `POST /payments/webhook/pesapal` | Service/external callback | Validates signature if secret configured, idempotency key supported. |
| Maintenance | `GET/POST/PATCH/DELETE /maintenance...` | Owner/manager or tenant self | Owners access by property ownership; tenants can create/view own requests via RLS. |
| Messages | `GET/POST/PATCH /messages...` | Authenticated participant | Users can list sent/received messages; receivers can mark messages read. |
| Uploads | `POST /uploads/payment-proof`, `/uploads/property-image` | Authenticated | Uses service client to write Supabase Storage objects under user-scoped paths. |
| SMS | `POST /sms/send` | Service/external integration | Uses service client and provider configuration; no user token dependency in router. |

## Supabase RLS Responsibilities

| Table | Primary RLS Intent |
| --- | --- |
| `profiles` | Users manage their own profile; admins can view all profiles. |
| `properties` | Owners manage their properties; admins can read all. |
| `rental_units` | Owners manage units; public read policy exposes available active units. |
| `tenants` | Owners manage their tenants; linked tenant users can view their own tenant record. |
| `leases` | Owners manage leases; linked tenant users can view their own leases. |
| `payments` | Owners manage payments through owned leases; tenants can view their own payments. |
| `maintenance_requests` | Owners manage requests for their properties; tenants can create/view own requests. |
| `messages` | Participants can read messages they sent or received; receivers can mark read. |
| `notifications` | Recipients can view and update their notifications. |
| `notification_deliveries` | Admins can inspect delivery records. |

## Security Notes

- Keep service-role client usage limited to server-only paths that require elevated Supabase access.
- External callbacks should use shared-secret verification or provider signatures where supported.
- If the backend is horizontally scaled, replace in-memory rate-limit and webhook idempotency stores with Redis or another shared store.
- Any endpoint that exposes cross-user data should have both router-level checks and RLS coverage.
