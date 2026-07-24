CREATE TABLE payment_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL,
  transaction_reference TEXT,
  payment_date DATE NOT NULL,
  screenshot_url TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_verifications_tenant_status ON payment_verifications(tenant_id, status);
CREATE INDEX idx_payment_verifications_owner_status ON payment_verifications(owner_id, status);
CREATE INDEX idx_payment_verifications_status_created ON payment_verifications(status, created_at DESC);

ALTER TABLE payment_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can insert their own verifications"
  ON payment_verifications FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can view their own verifications"
  ON payment_verifications FOR SELECT
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can view verifications on their properties"
  ON payment_verifications FOR SELECT
  USING (
    owner_id = auth.uid()
    OR auth.uid() IN (
      SELECT user_id FROM profiles WHERE role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Managers can update verifications on their properties"
  ON payment_verifications FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR auth.uid() IN (
      SELECT user_id FROM profiles WHERE role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    owner_id = auth.uid()
    OR auth.uid() IN (
      SELECT user_id FROM profiles WHERE role IN ('super_admin', 'admin')
    )
  );

CREATE TRIGGER update_payment_verifications_updated_at
  BEFORE UPDATE ON payment_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
