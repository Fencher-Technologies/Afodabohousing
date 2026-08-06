# Pesapal IPN Registration

## Why this exists

Pesapal notifies Afodabo about payment outcomes by POSTing to an **IPN
(Instant Payment Notification) URL**. This URL is registered through the
Pesapal **API** (`RegisterIPNURL`) — there is **no dashboard form** to set it.

Because the backend must know the `ipn_id` returned by that API call when it
submits orders (`submit_order` → `notification_id`), the registration is:

1. done via an admin endpoint or the included script, and
2. persisted in the `pesapal_config` table (one row per environment:
   `environment`, `ipn_url`, `ipn_id`, `registered_at`) so it survives server
   restarts. The value is generated at runtime, not typed into an env var.

## Production workflow (Render) — permanent default

The backend is deployed permanently at https://afodabohousing.onrender.com.
Register the real Render URL **once**:

```bash
python backend/scripts/register_ipn.py https://afodabohousing.onrender.com/payments/webhook/pesapal
```

(or call `POST /admin/pesapal/register-ipn` with `{"ipn_url": "..."}` while
authenticated as a super admin — the endpoint does exactly the same thing).

This generally never needs to change again unless the domain changes.

## Local development workflow (ngrok) — optional, local-only

> Kept for reference only. The mobile app now points at the Render backend,
> so this is only needed when running the backend locally via a tunnel.

Every time ngrok restarts, the public URL changes, so the IPN must be
re-registered:

```bash
# 1. Start ngrok pointing at the backend
ngrok http 8000

# 2. Copy the public URL and register it (webhook path included)
python backend/scripts/register_ipn.py https://abc123.ngrok-free.app/payments/webhook/pesapal
```

Expected output (ipn_id is the important bit):

```
Environment:    sandbox
IPN URL:        https://abc123.ngrok-free.app/payments/webhook/pesapal

Registering...
SUCCESS (registered):
  ipn_id = <uuid-from-pesapal>
  url    = https://abc123.ngrok-free.app/payments/webhook/pesapal
```

Running it twice with the same URL prints `SUCCESS (reused)` and reuses the
existing `ipn_id` (checked via `GetIPNList`) instead of creating a duplicate
registration.

## How it works

- `POST /admin/pesapal/register-ipn` (super admin only, body `{"ipn_url": ...}`)
  calls `services/pesapal.py::register_ipn_for_url()`, which:
  1. gets an auth token,
  2. calls `GetIPNList` — if the URL is already registered, reuses its `ipn_id`
     (no duplicate), otherwise calls `RegisterIPNURL`,
  3. persists `environment` / `ipn_url` / `ipn_id` to `pesapal_config`
     (upsert on `environment`),
  4. returns `{"ipn_id", "ipn_url", "status": "registered"|"reused"}`.
- `services/pesapal.py::get_ipn_id()` reads the stored `ipn_id`; `boosts.py`
  and `subscriptions.py` use it as `notification_id` on every `submit_order`.
  If nothing is registered yet, it raises a clear error telling you to run the
  script / endpoint first — it never submits an order without a valid IPN.

## Security

- The endpoint is guarded by `require_super_admin`.
- The `pesapal_config` table has RLS enabled with no anon/authenticated
  policies; only the backend service role (which bypasses RLS) can access it.
- Logs and script output contain only the `ipn_url` and `ipn_id` — never the
  consumer key or secret.
