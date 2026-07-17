-- Renewal support (Option B: in-place lease renewal)
-- 1) renewal_requests: tenant-initiated renewal requests awaiting manager review
-- 2) renewal_history: audit trail of manager-performed in-place renewals

CREATE TABLE IF NOT EXISTS renewal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_renewal_requests_lease_id ON renewal_requests(lease_id);
CREATE INDEX IF NOT EXISTS idx_renewal_requests_tenant_id ON renewal_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_renewal_requests_status ON renewal_requests(status);

CREATE TABLE IF NOT EXISTS renewal_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_id TEXT NOT NULL,
    previous_end_date DATE,
    new_end_date DATE NOT NULL,
    monthly_rent NUMERIC(12,2),
    notes TEXT,
    renewed_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_renewal_history_lease_id ON renewal_history(lease_id);

COMMENT ON TABLE renewal_requests IS 'Tenant-initiated lease renewal requests for manager review';
COMMENT ON TABLE renewal_history IS 'Audit trail of in-place lease renewals performed by managers';
