-- Renewal history / audit trail for tenancy agreement extensions.
-- Renewal never creates a new lease record and never changes rent
-- accounting: it only extends the end date and reactivates the lease.
-- This table records each extension for accountability and clarity.

CREATE TABLE IF NOT EXISTS renewal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  previous_end_date DATE,
  new_end_date DATE NOT NULL,
  monthly_rent DECIMAL(12,2),
  notes TEXT,
  renewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_renewal_history_lease_created ON renewal_history(lease_id, created_at DESC);

ALTER TABLE renewal_history ADD COLUMN IF NOT EXISTS previous_end_date DATE;
ALTER TABLE renewal_history ADD COLUMN IF NOT EXISTS new_end_date DATE;
ALTER TABLE renewal_history ADD COLUMN IF NOT EXISTS monthly_rent DECIMAL(12,2);
ALTER TABLE renewal_history ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE renewal_history ADD COLUMN IF NOT EXISTS renewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE renewal_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers can view renewal history on their leases" ON renewal_history;
CREATE POLICY "Managers can view renewal history on their leases"
  ON renewal_history FOR SELECT
  USING (
    lease_id IN (
      SELECT id FROM leases WHERE owner_id = auth.uid()
    )
    OR auth.uid() IN (
      SELECT user_id FROM profiles WHERE role IN ('super_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Tenants can view renewal history on their own leases" ON renewal_history;
CREATE POLICY "Tenants can view renewal history on their own leases"
  ON renewal_history FOR SELECT
  USING (
    lease_id IN (
      SELECT id FROM leases
      WHERE tenant_id IN (
        SELECT id FROM tenants WHERE user_id = auth.uid()
      )
    )
  );
