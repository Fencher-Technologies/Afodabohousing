-- US$ becomes the platform's standard currency.
--
-- The business asked that US$ be the currency used throughout: subscribing,
-- listing a property, updating a tenant's payment, the reports generated and
-- what the tenant sees on their dashboard.
--
-- Only the DEFAULTS move. Existing rows keep the currency they were created
-- with, deliberately: an amount is a number plus a currency, so relabelling
-- UGX 500,000 as USD 500,000 would misstate every live rent ledger and every
-- receipt already issued to a tenant. Properties already priced in shillings
-- stay in shillings until their manager re-prices them; new ones default to
-- dollars. The currency picker still offers every currency, so a manager in
-- any country can still price in their own.

alter table public.properties    alter column rent_currency    set default 'USD';
alter table public.rental_units  alter column rent_currency    set default 'USD';
alter table public.leases        alter column currency         set default 'USD';
alter table public.payments      alter column currency         set default 'USD';
alter table public.receipts      alter column currency         set default 'USD';
alter table public.profiles      alter column display_currency set default 'USD';

comment on column public.properties.rent_currency is
  'ISO 4217 code this property is priced in. Defaults to USD, the platform standard; a manager may price in any currency.';
comment on column public.profiles.display_currency is
  'ISO 4217 code this person sees dashboard and report totals in, converted at current rates. Defaults to USD.';
