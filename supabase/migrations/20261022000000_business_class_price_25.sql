-- Business Class (6mo) is $25. The UGX figure is what Pesapal charges, kept at
-- the platform rate of 4,000 UGX per US$ like the other plans.
update public.subscription_plans
set price_usd = 25, price_ugx = 100000
where id = '6mo';
