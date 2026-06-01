-- Tenancies table (links tenants to properties with rent terms)
CREATE TABLE IF NOT EXISTS tenancies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    manager_id UUID NOT NULL,
    rent_amount NUMERIC(12,2) NOT NULL,
    rent_period rent_period NOT NULL DEFAULT 'monthly',
    rent_start_date DATE NOT NULL,
    rent_end_date DATE NOT NULL,
    status tenancy_status NOT NULL DEFAULT 'active',
    agreement_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenancies_property ON tenancies(property_id);
CREATE INDEX IF NOT EXISTS idx_tenancies_tenant ON tenancies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenancies_manager ON tenancies(manager_id);
CREATE INDEX IF NOT EXISTS idx_tenancies_status ON tenancies(status);

ALTER TABLE tenancies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "managers_can_manage_tenancies" ON tenancies
    FOR ALL USING (manager_id = auth.uid());

CREATE POLICY "tenants_can_view_own_tenancies" ON tenancies
    FOR SELECT USING (tenant_id = auth.uid());

CREATE POLICY "admins_can_view_all_tenancies" ON tenancies
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE TRIGGER update_tenancies_updated_at
    BEFORE UPDATE ON tenancies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
