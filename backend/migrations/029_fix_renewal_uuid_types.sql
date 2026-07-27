-- Fix renewal tables: lease_id/tenant_id should be UUID with FK, not TEXT

-- Drop existing indexes first
DROP INDEX IF EXISTS idx_renewal_requests_lease_id;
DROP INDEX IF EXISTS idx_renewal_requests_tenant_id;
DROP INDEX IF EXISTS idx_renewal_requests_status;
DROP INDEX IF EXISTS idx_renewal_history_lease_id;

-- Cast text to uuid (safe: all values are valid UUIDs stored as text)
ALTER TABLE renewal_requests ALTER COLUMN lease_id TYPE uuid USING lease_id::uuid;
ALTER TABLE renewal_requests ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
ALTER TABLE renewal_history ALTER COLUMN lease_id TYPE uuid USING lease_id::uuid;

-- Add foreign keys
ALTER TABLE renewal_requests ADD CONSTRAINT fk_renewal_requests_lease FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE CASCADE;
ALTER TABLE renewal_requests ADD CONSTRAINT fk_renewal_requests_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE renewal_history ADD CONSTRAINT fk_renewal_history_lease FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE CASCADE;

-- Recreate indexes on new uuid columns
CREATE INDEX IF NOT EXISTS idx_renewal_requests_lease_id ON renewal_requests(lease_id);
CREATE INDEX IF NOT EXISTS idx_renewal_requests_tenant_id ON renewal_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_renewal_requests_status ON renewal_requests(status);
CREATE INDEX IF NOT EXISTS idx_renewal_history_lease_id ON renewal_history(lease_id);
