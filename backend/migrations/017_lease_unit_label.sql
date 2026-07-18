-- Add unit_label to leases so the "Unit" field captured in the mobile
-- create-tenancy flow is persisted and returned to clients.
ALTER TABLE leases ADD COLUMN IF NOT EXISTS unit_label TEXT;

CREATE INDEX IF NOT EXISTS idx_leases_unit_label ON leases (unit_label);
