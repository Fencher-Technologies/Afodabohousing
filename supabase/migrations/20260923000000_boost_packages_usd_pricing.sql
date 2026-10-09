-- Boost packages gain a US$ price, mirroring subscription_plans, and Premium
-- is corrected to the rate the business set.
--
-- The business's rate card is Basic $1 (2 weeks), Standard $2 (1 month) and
-- Premium $5 (3 months). Basic and Standard already matched at UGX 4,000 and
-- 8,000, but Premium sat at UGX 12,000, which is $3 rather than $5.
--
-- Charging stays in UGX; price_usd records the published rate and lets the
-- apps show a US$ figure to managers outside Uganda, the same way
-- subscription_plans already does.

alter table public.boost_packages
  add column if not exists price_usd numeric(12, 2);

update public.boost_packages set price_usd = 1.00,  price_ugx = 4000.00  where id = '14d';
update public.boost_packages set price_usd = 2.00,  price_ugx = 8000.00  where id = '30d';
update public.boost_packages set price_usd = 5.00,  price_ugx = 20000.00 where id = '90d';
-- The 500 UGX test package the business asked to keep.
update public.boost_packages set price_usd = 0.13,  price_ugx = 500.00   where id = '7d';

comment on column public.boost_packages.price_usd is
  'Published US$ rate. Charging happens in price_ugx; this is the reference rate shown to managers pricing in US$.';
