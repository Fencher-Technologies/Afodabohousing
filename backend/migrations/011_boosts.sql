-- 011: Property Boosts — separate payment flow for listing visibility
-- Schema designed for future monetization (tiers, priority scoring)

CREATE TABLE IF NOT EXISTS property_boosts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    manager_id UUID NOT NULL REFERENCES auth.users(id),
    amount_paid NUMERIC(10,2) NOT NULL,
    duration_days INTEGER NOT NULL DEFAULT 7,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    transaction_id TEXT,
    payment_method TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE property_boosts IS 'One-time property visibility boosts. Separate from rent/subscription payments.';
COMMENT ON COLUMN property_boosts.status IS 'pending | active | expired | cancelled';
COMMENT ON COLUMN property_boosts.duration_days IS 'Boost duration in days';
COMMENT ON COLUMN property_boosts.amount_paid IS 'Amount paid for this boost';

-- Speed up ranking queries: find active boosts per property
CREATE INDEX IF NOT EXISTS idx_boosts_active_property
    ON property_boosts(property_id, expires_at)
    WHERE status = 'active';

-- Manager's boost history
CREATE INDEX IF NOT EXISTS idx_boosts_manager
    ON property_boosts(manager_id, created_at DESC);

-- Expiry sweep: find boosts to expire
CREATE INDEX IF NOT EXISTS idx_boosts_expiry_sweep
    ON property_boosts(status, expires_at)
    WHERE status = 'active';

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_boosts_updated_at ON property_boosts;
CREATE TRIGGER update_boosts_updated_at
    BEFORE UPDATE ON property_boosts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS: managers can read their own boosts
ALTER TABLE property_boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "managers_select_own_boosts" ON property_boosts
    FOR SELECT
    USING (manager_id = auth.uid());

CREATE POLICY "super_admin_all_boosts" ON property_boosts
    FOR ALL
    USING (auth.uid() IN (
        SELECT user_id FROM profiles WHERE role = 'super_admin'
    ));

-- Future-ready: columns for tier support (uncomment when needed)
-- ALTER TABLE property_boosts ADD COLUMN IF NOT EXISTS tier_id UUID;
-- ALTER TABLE property_boosts ADD COLUMN IF NOT EXISTS priority_score INTEGER DEFAULT 1;
