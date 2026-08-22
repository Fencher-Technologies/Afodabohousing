-- ============================================================================
-- 1. COUNTRIES TABLE
-- ============================================================================
-- Stores sovereign countries sourced from GeoNames countryInfo.txt
-- =============================================================================

CREATE TABLE IF NOT EXISTS countries (
    iso_code CHAR(2) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for active countries lookup
CREATE INDEX IF NOT EXISTS idx_countries_active ON countries(is_active) WHERE is_active = true;

-- ============================================================================
-- 2. REGIONS TABLE
-- ============================================================================
-- Stores administrative divisions (states/provinces/districts) sourced from
-- GeoNames admin1CodesASCII.txt and admin2Codes.txt dumps.
-- geonames_id provides the external reference for future sync matching.
-- effective_date tracks when a region version became active.
-- deprecated_at is null when currently active; populated when retired.
-- superseded_by_region_id links to a replacement region if a split/rename occurred.
-- =============================================================================

CREATE TABLE IF NOT EXISTS regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_id CHAR(2) NOT NULL REFERENCES countries(iso_code) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    admin_level VARCHAR(100) NOT NULL,
    geonames_id VARCHAR(50) NOT NULL,
    effective_date DATE NOT NULL,
    deprecated_at TIMESTAMPTZ,
    superseded_by_region_id UUID REFERENCES regions(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common lookup patterns
CREATE INDEX IF NOT EXISTS idx_regions_country ON regions(country_id);
CREATE INDEX IF NOT EXISTS idx_regions_geonames ON regions(geonames_id);
CREATE INDEX IF NOT EXISTS idx_regions_active ON regions(deprecated_at) WHERE deprecated_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_regions_superseded ON regions(superseded_by_region_id);

-- Trigger to keep updated_at in sync
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS
$$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_regions_updated_at ON regions;
CREATE TRIGGER update_regions_updated_at
    BEFORE UPDATE ON regions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. PENDING REGION REVIEW TABLE
-- ============================================================================
-- Changes flagged as ambiguous by the sync job land here for Super Admin
-- confirmation before being applied.
-- =============================================================================

CREATE TABLE IF NOT EXISTS pending_region_review (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    change_type VARCHAR(50) NOT NULL,
    old_name VARCHAR(255) NOT NULL,
    new_name VARCHAR(255) NOT NULL,
    geonames_id VARCHAR(50) NOT NULL,
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    reviewed_at TIMESTAMPTZ,
    -- reviewed_by references profiles table; column will be added later if profiles exists
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- Index for pending reviews needing attention
CREATE INDEX IF NOT EXISTS idx_pending_review_status ON pending_region_review(status) WHERE status = 'pending';

-- ============================================================================
-- 4. SYNC HISTORY TABLE
-- ============================================================================
-- Logs every sync run for auditability and troubleshooting.
-- =============================================================================

CREATE TABLE IF NOT EXISTS sync_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    source VARCHAR(100) NOT NULL,
    records_added INTEGER NOT NULL DEFAULT 0,
    records_updated INTEGER NOT NULL DEFAULT 0,
    records_deprecated INTEGER NOT NULL DEFAULT 0,
    records_reviewed INTEGER NOT NULL DEFAULT 0,
    notes TEXT
);

-- Index for looking up sync runs
CREATE INDEX IF NOT EXISTS idx_sync_history_timestamp ON sync_history(run_timestamp DESC);

-- ============================================================================
-- 5. ADD region_id TO properties TABLE
-- ============================================================================
-- Links each property to its primary administrative region (state/province/district).
-- The existing free-text city/state/zip fields remain as fallback/supplement
-- for detail GeoNames doesn't capture (neighborhoods, plot numbers, etc.).
-- =============================================================================

-- Check if region_id column already exists; if not, add it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'region_id') THEN
        ALTER TABLE properties ADD COLUMN region_id UUID REFERENCES regions(id);
        CREATE INDEX IF NOT EXISTS idx_properties_region ON properties(region_id);
        RAISE NOTICE 'Added region_id column to properties table';
    ELSE
        RAISE NOTICE 'region_id column already exists on properties table';
    END IF;
END
$$;

-- Comment explaining the column
COMMENT ON COLUMN properties.region_id IS 'FK to regions table (GeoNames-sourced administrative division). Free-text city/state/zip fields remain as fallback for sub-region detail.';

-- ============================================================================
-- 6. RLS POLICIES (best-effort; skip if profiles table doesn't exist)
-- =============================================================================

-- These policies reference profiles(user_id); they'll be applied if the table exists.
-- We use a conditional block so the whole migration doesn't fail if profiles is missing.
DO $$
BEGIN
    -- Only try to create policies if profiles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        CREATE POLICY "Users can view active countries" ON countries FOR SELECT
            USING (is_active = true);

        CREATE POLICY "Admins can manage countries" ON countries FOR ALL
            USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

        CREATE POLICY "Users can view active regions" ON regions FOR SELECT
            USING (deprecated_at IS NULL);

        CREATE POLICY "Admins can manage regions" ON regions FOR ALL
            USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

        CREATE POLICY "Admins can review pending changes" ON pending_region_review FOR ALL
            USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));

        CREATE POLICY "Admins can view sync history" ON sync_history FOR SELECT
            USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'));
    END IF;
END
$$;

-- Migration 037 completed successfully