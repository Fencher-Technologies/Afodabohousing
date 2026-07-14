-- 012: Manager Subscriptions — recurring plan payments for listing management
-- Separates rental revenue from platform access fees

CREATE TABLE IF NOT EXISTS manager_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id UUID NOT NULL REFERENCES auth.users(id),
    plan_type TEXT NOT NULL DEFAULT '3mo',
    status TEXT NOT NULL DEFAULT 'pending',
    start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    expiry_date TIMESTAMPTZ NOT NULL,
    amount_paid NUMERIC(10,2) NOT NULL,
    payment_method TEXT,
    transaction_id TEXT,
    auto_renew BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE manager_subscriptions IS 'Manager subscription plans for platform access. Separate from rent/boost payments.';
COMMENT ON COLUMN manager_subscriptions.plan_type IS '3mo | 6mo | 12mo';
COMMENT ON COLUMN manager_subscriptions.status IS 'active | expired | cancelled | pending';

CREATE INDEX IF NOT EXISTS idx_subscriptions_active_manager
    ON manager_subscriptions(manager_id, expiry_date)
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_subscriptions_expiry_sweep
    ON manager_subscriptions(status, expiry_date)
    WHERE status = 'active';

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON manager_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE manager_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "managers_select_own_subscription" ON manager_subscriptions
    FOR SELECT
    USING (manager_id = auth.uid());

CREATE POLICY "super_admin_all_subscriptions" ON manager_subscriptions
    FOR ALL
    USING (auth.uid() IN (
        SELECT user_id FROM profiles WHERE role = 'super_admin'
    ));
