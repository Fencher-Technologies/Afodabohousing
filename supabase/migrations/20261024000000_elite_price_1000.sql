-- Elite (unlimited listings) is now $1,000 per year.
-- price_ugx is kept in step at the gateway rate of 4,000 UGX per USD.
update public.subscription_plans
set price_usd = 1000, price_ugx = 4000000
where id = '12mo';
