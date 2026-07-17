-- Drop and recreate manager_subscriptions to ensure correct schema
DROP TABLE IF EXISTS manager_subscriptions;

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    duration_days INTEGER NOT NULL,
    price_usd NUMERIC(10,2) NOT NULL,
    price_ugx NUMERIC(12,2) NOT NULL,
    benefits JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    popular BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE manager_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'expired', 'pending', 'cancelled', 'grace')),
    started_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    auto_renew BOOLEAN DEFAULT true,
    payment_reference TEXT,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manager_subscriptions_manager_id ON manager_subscriptions(manager_id);
CREATE INDEX IF NOT EXISTS idx_manager_subscriptions_status ON manager_subscriptions(status);

-- Insert plans (will not overwrite existing rows)
INSERT INTO subscription_plans (id, name, duration_days, price_usd, price_ugx, benefits, sort_order, popular) VALUES
    ('3mo', 'Quarterly', 90, 10.00, 37000, '["List up to 5 properties", "Manage up to 20 tenants", "Payment tracking", "Basic reports", "WhatsApp integration"]'::jsonb, 1, false),
    ('6mo', 'Bi-Quarterly', 180, 20.00, 74000, '["List up to 15 properties", "Unlimited tenants", "Payment tracking", "Advanced reports", "WhatsApp integration", "Priority support"]'::jsonb, 2, true),
    ('12mo', 'Annual', 365, 35.00, 129500, '["Unlimited properties", "Unlimited tenants", "Payment tracking", "Advanced reports", "WhatsApp integration", "Priority support", "Bulk SMS", "Dedicated account manager"]'::jsonb, 3, false)
ON CONFLICT (id) DO NOTHING;

-- Update existing plans with correct prices (runs regardless of whether insert succeeded)
UPDATE subscription_plans SET name = 'Quarterly',    price_usd = 10.00, price_ugx = 37000,  duration_days = 90,  popular = false WHERE id = '3mo';
UPDATE subscription_plans SET name = 'Bi-Quarterly', price_usd = 20.00, price_ugx = 74000,  duration_days = 180, popular = true  WHERE id = '6mo';
UPDATE subscription_plans SET name = 'Annual',       price_usd = 35.00, price_ugx = 129500, duration_days = 365, popular = false WHERE id = '12mo';

COMMENT ON TABLE subscription_plans IS 'Available subscription plans for house managers';
COMMENT ON TABLE manager_subscriptions IS 'Active and historical subscriptions for house managers';
