-- The currency a manager's dashboard and report totals are reported in.
-- Properties can be listed in any currency, and their rent, payments and
-- receipts keep that currency; only summary figures are converted.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_currency text NOT NULL DEFAULT 'UGX';

COMMENT ON COLUMN public.profiles.display_currency IS
  'Currency for dashboard and report totals. Individual rents, payments and receipts keep the currency of their property.';
