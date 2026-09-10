# DEPRECATED — Do Not Add New Migrations Here

**Canonical migrations are `supabase/migrations/` (27 files).** This `backend/migrations/` directory is legacy and **must not receive new files**.

## Status 2026-09-02 — NOT YET DELETABLE

`supabase/migrations/` is missing at least 11 migrations that exist only here:

- `035_subscription_pricing.sql`
- `036_boost_packages.sql`
- `037_countries_regions_tables.sql`
- `038_storage_policies.sql`
- `039_add_country_currency_to_properties.sql`
- `040_fix_nullable_columns.sql`
- `041_null_safe_unused_columns.sql`
- `042_make_state_nullable.sql`
- `043_property_types_catalog.sql`
- plus `001_*` … `034_*` legacy naming

These have not been consolidated into timestamped `supabase/migrations/*.sql` files. Until they are, deleting this directory would lose schema.

## Required Before Deletion

1. For each file above, create a timestamped `supabase/migrations/YYYYMMDDHHmmss_*.sql` copy (idempotent `IF NOT EXISTS` already).
2. Verify `supabase db diff` shows no drift after consolidation.
3. Then `git rm -r backend/migrations/` and add CI check `diff <(ls supabase/migrations) <(ls backend/migrations)` to prevent resurrection.

**No Phase 2 schema migration may land until this consolidation is complete.**
