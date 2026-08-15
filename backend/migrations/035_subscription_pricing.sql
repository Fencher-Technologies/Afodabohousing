-- 035_subscription_pricing.sql
-- Client's final subscription pricing. UGX is the authoritative payment amount
-- (what reaches Pesapal); price_usd is display/reference only and is never
-- converted to/from UGX.
--
-- Idempotent: safe to run more than once. Existing benefits, sort_order,
-- is_active and popular flags are preserved for the 3mo/6mo/12mo plans.
-- 6mo keeps its "popular" flag.

-- Add the 1-month plan if it does not exist.
INSERT INTO subscription_plans (id, name, duration_days, price_usd, price_ugx, benefits, sort_order, popular) VALUES
    ('1mo', '1 Month', 30, 5.00, 20000, '["List up to 3 properties", "Manage up to 10 tenants", "Payment tracking", "Basic reports"]'::jsonb, 0, false)
ON CONFLICT (id) DO NOTHING;

-- Update pricing/duration/display name to the client's final values.
-- Runs regardless of whether the INSERT succeeded, so re-running stays correct.
UPDATE subscription_plans SET name = '1 Month',   duration_days = 30,  price_usd = 5.00,  price_ugx = 20000  WHERE id = '1mo';
UPDATE subscription_plans SET name = '3 Months',  duration_days = 90,  price_usd = 10.00, price_ugx = 40000  WHERE id = '3mo';
UPDATE subscription_plans SET name = '6 Months',  duration_days = 180, price_usd = 20.00, price_ugx = 80000  WHERE id = '6mo';
UPDATE subscription_plans SET name = '1 Year',    duration_days = 365, price_usd = 25.00, price_ugx = 100000 WHERE id = '12mo';
