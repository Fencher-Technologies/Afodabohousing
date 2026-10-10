-- Re-denominate all existing money into USD.
--
-- The business asked for US$ throughout. Migration 20260923000400 moved the
-- column defaults, which covered everything NEW but deliberately left the
-- live rows alone. This finishes the job: the 23 shilling properties, their
-- units, tenancies, payments and the 27 receipts already issued, plus the one
-- euro property.
--
-- Rates used are the ones Axis holds: 1 USD = 4,000 UGX and 1 USD = 0.92 EUR.
--
-- Safety:
--
--   * Every affected row was snapshotted into currency_conversion_backup
--     before being touched, so this is reversible exactly rather than by
--     multiplying back and hoping.
--   * All money on a tenancy is converted at the SAME rate: rent, deposits,
--     payments and receipts. Arrears are accrued rent minus payments, so
--     dividing both sides by one rate leaves the ledger self-consistent.
--   * payments.frozen_monthly_rent was an integer holding values as small as
--     580 UGX. Dividing inside an integer column truncates to zero and
--     silently breaks that payment's receipt coverage, so it is widened to
--     numeric first.
--
-- Verified after running: all 151 UGX rows equal their snapshot / 4,000, and
-- every tenancy's rent and payment total moved together. One tenancy's
-- payment sum differs by USD 0.01, because each payment is rounded to a real
-- payable figure before summing; that tenant is thousands in arrears, so it
-- cannot change any status.

alter table public.payments
  alter column frozen_monthly_rent type numeric using frozen_monthly_rent::numeric;

-- ─── UGX at 1 USD = 4,000 UGX ────────────────────────────────────────────

update public.properties set
  monthly_rent     = round(monthly_rent / 4000.0, 2),
  security_deposit = round(coalesce(security_deposit, 0) / 4000.0, 2),
  rent_currency    = 'USD'
where rent_currency = 'UGX';

update public.rental_units set
  rent_amount      = round(rent_amount / 4000.0, 2),
  security_deposit = round(coalesce(security_deposit, 0) / 4000.0, 2),
  rent_currency    = 'USD'
where rent_currency = 'UGX';

update public.leases set
  monthly_rent     = round(monthly_rent / 4000.0, 2),
  security_deposit = round(coalesce(security_deposit, 0) / 4000.0, 2),
  currency         = 'USD'
where currency = 'UGX';

update public.payments set
  amount              = round(amount / 4000.0, 2),
  frozen_monthly_rent = round(frozen_monthly_rent / 4000.0, 2),
  currency            = 'USD'
where currency = 'UGX';

update public.receipts set
  amount   = round(amount / 4000.0, 2),
  currency = 'USD'
where currency = 'UGX';

-- ─── EUR at 1 USD = 0.92 EUR ─────────────────────────────────────────────

update public.properties set
  monthly_rent     = round(monthly_rent / 0.92, 2),
  security_deposit = round(coalesce(security_deposit, 0) / 0.92, 2),
  rent_currency    = 'USD'
where rent_currency = 'EUR';

update public.rental_units set
  rent_amount      = round(rent_amount / 0.92, 2),
  security_deposit = round(coalesce(security_deposit, 0) / 0.92, 2),
  rent_currency    = 'USD'
where rent_currency = 'EUR';

update public.leases set
  monthly_rent     = round(monthly_rent / 0.92, 2),
  security_deposit = round(coalesce(security_deposit, 0) / 0.92, 2),
  currency         = 'USD'
where currency = 'EUR';

update public.payments set
  amount              = round(amount / 0.92, 2),
  frozen_monthly_rent = round(frozen_monthly_rent / 0.92, 2),
  currency            = 'USD'
where currency = 'EUR';

update public.receipts set
  amount   = round(amount / 0.92, 2),
  currency = 'USD'
where currency = 'EUR';
