-- Retire the Test plan: hidden from purchase, but the row stays because
-- manager_subscriptions history (and one still-running subscription) reference it.
UPDATE subscription_plans SET is_active = false WHERE id = '1mo';

-- Plan order is now Essential, Business Class, Elite.
UPDATE subscription_plans SET sort_order = 0 WHERE id = '3mo';
UPDATE subscription_plans SET sort_order = 1 WHERE id = '6mo';
UPDATE subscription_plans SET sort_order = 2 WHERE id = '12mo';

-- Business Class: US$100 (UGX at the same 4,000/USD rate as the other plans).
UPDATE subscription_plans SET price_usd = 100, price_ugx = 400000 WHERE id = '6mo';
