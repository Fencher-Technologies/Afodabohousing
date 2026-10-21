-- Database-backed idempotency for payment webhooks.
--
-- The API used to remember processed webhooks in a Python dict, which a
-- restart or a second worker/instance silently emptied. The primary key below
-- is what makes a claim atomic: of any number of concurrent deliveries of the
-- same event, exactly one INSERT succeeds.
--
-- Written and read only by the backend with the service role, which bypasses
-- RLS. RLS is enabled with no policies so no other role can see or touch it.

create table if not exists public.webhook_events (
  provider    text        not null,
  event_key   text        not null,
  status      text        not null default 'processing'
              check (status in ('processing', 'processed')),
  claim_token text,
  response    jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (provider, event_key)
);

alter table public.webhook_events enable row level security;
revoke all on public.webhook_events from anon, authenticated;

create index if not exists idx_webhook_events_created_at
  on public.webhook_events (created_at);
