-- ──────────────────────────────────────────────────────────────
-- House Managers — dedicated table, FK anchors, auto-sync
-- ──────────────────────────────────────────────────────────────

-- 1. Core table
CREATE TABLE house_managers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name   TEXT NOT NULL,
    phone       TEXT NOT NULL,
    email       TEXT,
    photo_url   TEXT,
    status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
    created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    property_count INTEGER NOT NULL DEFAULT 0,
    tenant_count   INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. FK anchors on existing tables
ALTER TABLE properties ADD COLUMN house_manager_id UUID REFERENCES house_managers(id) ON DELETE SET NULL;
ALTER TABLE tenants     ADD COLUMN house_manager_id UUID REFERENCES house_managers(id) ON DELETE SET NULL;

-- 3. Indexes
CREATE INDEX idx_house_managers_user_id   ON house_managers(user_id);
CREATE INDEX idx_house_managers_phone     ON house_managers(phone);
CREATE INDEX idx_house_managers_status    ON house_managers(status);
CREATE INDEX idx_properties_house_manager ON properties(house_manager_id);
CREATE INDEX idx_tenants_house_manager    ON tenants(house_manager_id);

-- 4. Backfill from existing profiles
INSERT INTO house_managers (user_id, full_name, phone, email, photo_url, status, created_by)
SELECT
    p.user_id,
    COALESCE(p.full_name, ''),
    COALESCE(p.phone, ''),
    CASE WHEN p.email LIKE 'phone_%@afodabo.app' THEN NULL ELSE p.email END,
    p.photo_url,
    COALESCE(p.status, 'active'),
    p.created_by
FROM profiles p
WHERE p.role = 'house_manager'
ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone     = EXCLUDED.phone,
    email     = EXCLUDED.email,
    status    = EXCLUDED.status;

-- 5. Link existing properties and tenants
UPDATE properties pr
SET house_manager_id = hm.id
FROM house_managers hm
WHERE hm.user_id = pr.owner_id;

UPDATE tenants t
SET house_manager_id = hm.id
FROM house_managers hm
WHERE hm.user_id = t.owner_id;

-- 6. Auto-create / sync when a profile becomes house_manager
CREATE OR REPLACE FUNCTION sync_house_manager_from_profile()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'house_manager' THEN
        INSERT INTO house_managers (user_id, full_name, phone, email, photo_url, status, created_by)
        VALUES (
            NEW.user_id,
            COALESCE(NEW.full_name, ''),
            COALESCE(NEW.phone, ''),
            CASE WHEN NEW.email LIKE 'phone_%@afodabo.app' THEN NULL ELSE NEW.email END,
            NEW.photo_url,
            COALESCE(NEW.status, 'active'),
            NEW.created_by
        )
        ON CONFLICT (user_id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            phone     = EXCLUDED.phone,
            email     = EXCLUDED.email,
            photo_url = EXCLUDED.photo_url,
            status    = EXCLUDED.status;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_house_manager ON profiles;
CREATE TRIGGER trg_sync_house_manager
    AFTER INSERT OR UPDATE OF role ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_house_manager_from_profile();

-- 7. Auto-count properties and tenants
CREATE OR REPLACE FUNCTION refresh_house_manager_counts()
RETURNS TRIGGER AS $$
DECLARE
    target_id UUID;
BEGIN
    target_id := COALESCE(NEW.house_manager_id, OLD.house_manager_id);
    IF target_id IS NULL THEN RETURN NULL; END IF;

    UPDATE house_managers hm SET
        property_count = (SELECT COUNT(*) FROM properties WHERE house_manager_id = target_id),
        tenant_count   = (SELECT COUNT(*) FROM tenants     WHERE house_manager_id = target_id),
        updated_at     = now()
    WHERE hm.id = target_id;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_refresh_property_count ON properties;
CREATE TRIGGER trg_refresh_property_count
    AFTER INSERT OR DELETE OR UPDATE OF house_manager_id ON properties
    FOR EACH ROW
    EXECUTE FUNCTION refresh_house_manager_counts();

DROP TRIGGER IF EXISTS trg_refresh_tenant_count ON tenants;
CREATE TRIGGER trg_refresh_tenant_count
    AFTER INSERT OR DELETE OR UPDATE OF house_manager_id ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION refresh_house_manager_counts();

-- 8. RLS
ALTER TABLE house_managers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin full access" ON house_managers
    USING (get_user_role(auth.uid()) = 'super_admin')
    WITH CHECK (get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "House managers read own" ON house_managers
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Tenants read their manager" ON house_managers
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tenants t
            JOIN leases l ON l.tenant_id = t.id
            WHERE t.user_id = auth.uid()
              AND l.owner_id = house_managers.user_id
        )
    );
