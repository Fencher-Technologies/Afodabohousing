-- Drop unused duplicated price column
ALTER TABLE properties DROP COLUMN IF EXISTS price;

-- Indexes for heavily-queried FK and filter columns
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON properties (owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties (status);
CREATE INDEX IF NOT EXISTS idx_leases_owner_id ON leases (owner_id);
CREATE INDEX IF NOT EXISTS idx_leases_property_id ON leases (property_id);
CREATE INDEX IF NOT EXISTS idx_payments_lease_id ON payments (lease_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments (tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles (role);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_property_id ON maintenance_requests (property_id);
