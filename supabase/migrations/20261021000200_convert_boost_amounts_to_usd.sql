-- property_boosts.amount_paid mixed shillings (legacy checkouts) and dollars.
-- Smallest dollar boost is US$0.13 and the largest US$5, so any value of 100 or
-- more is a shilling amount. Convert those at Axis's rate (1 USD = 4,000 UGX),
-- snapshotting each row first so the change is exactly reversible.
insert into public.currency_conversion_backup (rate, from_currency, to_currency, table_name, row_id, snapshot)
select 4000, 'UGX', 'USD', 'property_boosts', b.id, to_jsonb(b)
from public.property_boosts b
where b.amount_paid >= 100;

update public.property_boosts
set amount_paid = round(amount_paid / 4000.0, 2)
where amount_paid >= 100;
