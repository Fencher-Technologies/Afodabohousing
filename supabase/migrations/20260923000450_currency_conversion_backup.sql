-- Snapshot table for currency re-denomination.
--
-- Converting money between currencies rewrites agreed rents, recorded
-- payments and receipts already issued to tenants. A conversion that cannot
-- be undone is not one worth making, so the whole pre-state of every affected
-- row is kept as jsonb rather than trusting that multiplying back by the rate
-- reproduces it exactly.
--
-- Populated immediately before 20260923000500 runs.
--
-- To reverse a conversion, read the snapshot back:
--
--   update properties p
--      set monthly_rent     = (b.snapshot->>'monthly_rent')::numeric,
--          security_deposit = (b.snapshot->>'security_deposit')::numeric,
--          rent_currency    = b.snapshot->>'rent_currency'
--     from currency_conversion_backup b
--    where b.table_name = 'properties' and b.row_id = p.id;

create table if not exists public.currency_conversion_backup (
  id            bigserial primary key,
  converted_at  timestamptz not null default now(),
  rate          numeric     not null,
  from_currency text        not null,
  to_currency   text        not null,
  table_name    text        not null,
  row_id        uuid        not null,
  snapshot      jsonb       not null
);

create index if not exists currency_conversion_backup_table_row_idx
  on public.currency_conversion_backup (table_name, row_id);

-- No policies: it holds financial history, so only the service role reaches it.
alter table public.currency_conversion_backup enable row level security;

comment on table public.currency_conversion_backup is
  'Pre-conversion snapshots of rows re-denominated between currencies. Restore by reading values back out of snapshot where row_id matches.';
