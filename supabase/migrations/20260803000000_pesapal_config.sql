-- Single row per environment: stores the Pesapal IPN registration so it
-- survives server restarts. Registered at runtime via API, not typed by hand.
-- Only the backend service role (bypasses RLS) may access this table.
create table if not exists pesapal_config (
  id bigint generated always as identity primary key,
  environment text not null unique,
  ipn_url text not null,
  ipn_id text not null,
  registered_at timestamptz not null default now()
);

revoke all on pesapal_config from anon, authenticated;
alter table pesapal_config enable row level security;
