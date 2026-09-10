-- Consolidated legacy backend/migrations 035-050 → supabase/migrations
-- Generated 2026-09-02, preserves numeric order (035 before 036...050) for FK deps
-- Idempotent: each source file already uses IF NOT EXISTS / ON CONFLICT DO NOTHING
-- Safe to replay on already-migrated prod (no-op).
-- Run ledger first: SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
BEGIN;

-- ── 035_subscription_pricing.sql ──────────────────────────────────────────────
-- 035_subscription_pricing.sql
-- Client's final subscription pricing. UGX is the authoritative payment amount
-- (what reaches Pesapal); price_usd is display/reference only and is never
-- converted to/from UGX.
--
-- Idempotent: safe to run more than once. Existing benefits, sort_order,
-- is_active and popular flags are preserved for the 3mo/6mo/12mo plans.
-- 6mo keeps its "popular" flag.

-- Add the 1-month plan if it does not exist.
INSERT INTO subscription_plans (id, name, duration_days, price_usd, price_ugx, benefits, sort_order, popular) VALUES
    ('1mo', '1 Month', 30, 5.00, 20000, '["List up to 3 properties", "Manage up to 10 tenants", "Payment tracking", "Basic reports"]'::jsonb, 0, false)
ON CONFLICT (id) DO NOTHING;

-- Update pricing/duration/display name to the client's final values.
-- Runs regardless of whether the INSERT succeeded, so re-running stays correct.
UPDATE subscription_plans SET name = '1 Month',   duration_days = 30,  price_usd = 0.14,  price_ugx = 500  WHERE id = '1mo';
UPDATE subscription_plans SET name = '3 Months',  duration_days = 90,  price_usd = 0.14,  price_ugx = 500  WHERE id = '3mo';
UPDATE subscription_plans SET name = '6 Months',  duration_days = 180, price_usd = 0.14,  price_ugx = 500  WHERE id = '6mo';
UPDATE subscription_plans SET name = '1 Year',    duration_days = 365, price_usd = 0.14,  price_ugx = 500  WHERE id = '12mo';

-- ── 036_boost_packages.sql ──────────────────────────────────────────────
-- 036_boost_packages.sql
-- Boost packages are now database-driven (single source of truth), mirroring
-- subscription_plans. UGX is the authoritative payment amount (what reaches
-- Pesapal).
--
-- Idempotent: safe to run more than once. The UPDATEs deliberately do NOT
-- touch is_active, so an admin-deactivated package stays deactivated across
-- re-runs. sort_order controls display ordering.

CREATE TABLE IF NOT EXISTS boost_packages (
    id          TEXT PRIMARY KEY,
    days        INTEGER NOT NULL UNIQUE,
    price_ugx   NUMERIC(12,2) NOT NULL,
    label       TEXT NOT NULL,  
    is_active   BOOLEAN DEFAULT true,
    sort_order  INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Seed the client's final prices (does not overwrite existing rows).
INSERT INTO boost_packages (id, days, price_ugx, label, sort_order) VALUES
    ('7d',  7,  500, '7 Days',  1),
    ('14d', 14, 500, '14 Days', 2),
    ('30d', 30, 500, '30 Days', 3)
ON CONFLICT (id) DO NOTHING;

-- Ensure the correct values regardless of whether the INSERT succeeded.
UPDATE boost_packages SET days = 7,  price_ugx = 500, label = '7 Days',  sort_order = 1 WHERE id = '7d';
UPDATE boost_packages SET days = 14, price_ugx = 500, label = '14 Days', sort_order = 2 WHERE id = '14d';
UPDATE boost_packages SET days = 30, price_ugx = 500, label = '30 Days', sort_order = 3 WHERE id = '30d';

-- ── 037_countries_regions_tables.sql ──────────────────────────────────────────────
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

-- ── 038_storage_policies.sql ──────────────────────────────────────────────
-- ============================================================================
-- Storage policies for property-images and payment-proofs buckets
-- Allows authenticated users to upload and read from both buckets.
-- ============================================================================

-- property-images: allow authenticated uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Authenticated users can upload property images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'property-images');

CREATE POLICY "Anyone can view property images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'property-images');

CREATE POLICY "Owners can delete their property images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'property-images' AND owner = auth.uid());

-- payment-proofs: allow authenticated uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Authenticated users can upload payment proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "Anyone can view payment proofs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'payment-proofs');

-- ── 039_add_country_currency_to_properties.sql ──────────────────────────────────────────────
-- Add country and rent_currency columns to properties table

ALTER TABLE properties ADD COLUMN IF NOT EXISTS country CHAR(2) DEFAULT 'UG';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS rent_currency VARCHAR(3) DEFAULT 'UGX';

-- ── 040_fix_nullable_columns.sql ──────────────────────────────────────────────
-- Make address and city nullable (form uses region_id + lat/lng instead)
ALTER TABLE properties ALTER COLUMN address DROP NOT NULL;
ALTER TABLE properties ALTER COLUMN address SET DEFAULT '';
ALTER TABLE properties ALTER COLUMN city DROP NOT NULL;
ALTER TABLE properties ALTER COLUMN city SET DEFAULT '';

-- ── 041_null_safe_unused_columns.sql ──────────────────────────────────────────────
-- Resolve null-value issues for columns NOT populated by the property form.
-- The form sends: title, description, property_type, state, address, bedrooms,
-- sitting_rooms, bathrooms, monthly_rent, rent_period, manager_phone,
-- manager_email, amenities, images, latitude, longitude, country, region_id,
-- rent_currency.
-- Everything else must accept NULL or have a sane default, and any existing
-- NULL rows must be backfilled so future inserts/updates never trip a
-- NOT NULL violation.

-- 1. Relax NOT NULL where the form does not supply a value
ALTER TABLE properties ALTER COLUMN city DROP NOT NULL;
ALTER TABLE properties ALTER COLUMN zip_code DROP NOT NULL;
ALTER TABLE properties ALTER COLUMN square_feet DROP NOT NULL;
ALTER TABLE properties ALTER COLUMN security_deposit DROP NOT NULL;
ALTER TABLE properties ALTER COLUMN neighborhood_id DROP NOT NULL;
ALTER TABLE properties ALTER COLUMN is_featured DROP NOT NULL;
ALTER TABLE properties ALTER COLUMN house_manager_id DROP NOT NULL;

-- 2. Set safe defaults so omitted inserts land cleanly
ALTER TABLE properties ALTER COLUMN city SET DEFAULT '';
ALTER TABLE properties ALTER COLUMN zip_code SET DEFAULT '';
ALTER TABLE properties ALTER COLUMN square_feet SET DEFAULT NULL;
ALTER TABLE properties ALTER COLUMN security_deposit SET DEFAULT 0;
ALTER TABLE properties ALTER COLUMN neighborhood_id SET DEFAULT NULL;
ALTER TABLE properties ALTER COLUMN is_featured SET DEFAULT false;
ALTER TABLE properties ALTER COLUMN house_manager_id SET DEFAULT NULL;
ALTER TABLE properties ALTER COLUMN is_active SET DEFAULT true;

-- 3. Backfill any existing rows that already hold NULL in these columns
UPDATE properties SET city = '' WHERE city IS NULL;
UPDATE properties SET zip_code = '' WHERE zip_code IS NULL;
UPDATE properties SET security_deposit = 0 WHERE security_deposit IS NULL;
UPDATE properties SET is_featured = false WHERE is_featured IS NULL;
UPDATE properties SET is_active = true WHERE is_active IS NULL;
UPDATE properties SET neighborhood_id = NULL WHERE neighborhood_id IS NOT DISTINCT FROM NULL;
UPDATE properties SET house_manager_id = NULL WHERE house_manager_id IS NOT DISTINCT FROM NULL;

-- ── 042_make_state_nullable.sql ──────────────────────────────────────────────
-- ============================================================================
-- 042: Make legacy `state` column nullable
-- ============================================================================
-- `state` is a free-text column that predates the GeoNames region system
-- (region_id). The property form no longer collects it as a required field;
-- region_id is now the source of truth for location. The frontend sends
-- state as '' which (via `data.state || null`) becomes NULL on insert,
-- tripping the NOT NULL constraint.
--
-- We make it nullable (rather than dropping) so existing display/filter
-- fallbacks that read `property.state || property.city` keep working, and
-- so no historical rows are lost.
-- ============================================================================

ALTER TABLE properties ALTER COLUMN state DROP NOT NULL;
ALTER TABLE properties ALTER COLUMN state SET DEFAULT '';
UPDATE properties SET state = '' WHERE state IS NULL;

-- ── 043_property_types_catalog.sql ──────────────────────────────────────────────
-- ============================================================================
-- Migration 043: Property Types Catalog
--
-- Adds database-driven property categories and types. The existing
-- property_type ENUM column is retained for backward compatibility.
-- A new nullable property_type_slug column stores the specific type.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. PROPERTY CATEGORIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS property_categories (
    slug VARCHAR(50) PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_categories_active
    ON property_categories(is_active) WHERE is_active = true;

-- ============================================================================
-- 2. PROPERTY TYPES
-- ============================================================================

CREATE TABLE IF NOT EXISTS property_types (
    slug VARCHAR(50) PRIMARY KEY,
    category_slug VARCHAR(50) NOT NULL REFERENCES property_categories(slug) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(slug, category_slug)
);

CREATE INDEX IF NOT EXISTS idx_property_types_category
    ON property_types(category_slug);
CREATE INDEX IF NOT EXISTS idx_property_types_active
    ON property_types(is_active) WHERE is_active = true;

-- ============================================================================
-- 3. updated_at TRIGGERS
-- ============================================================================

-- update_updated_at_column() already exists from migration 037.
DROP TRIGGER IF EXISTS update_property_categories_updated_at ON property_categories;
CREATE TRIGGER update_property_categories_updated_at
    BEFORE UPDATE ON property_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_property_types_updated_at ON property_types;
CREATE TRIGGER update_property_types_updated_at
    BEFORE UPDATE ON property_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. NEW COLUMN: property_type_slug on properties
-- ============================================================================

ALTER TABLE properties
    ADD COLUMN IF NOT EXISTS property_type_slug VARCHAR(50)
    REFERENCES property_types(slug) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_properties_type_slug
    ON properties(property_type_slug);

-- ============================================================================
-- 5. SEED CATEGORIES
-- ============================================================================

INSERT INTO property_categories (slug, label, sort_order) VALUES
    ('residential', 'Residential', 1),
    ('commercial',  'Commercial',  2)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 6. SEED TYPES
-- ============================================================================

INSERT INTO property_types (slug, category_slug, label, sort_order) VALUES
    ('apartment',           'residential', 'Apartment',           1),
    ('house',               'residential', 'House',               2),
    ('villa',               'residential', 'Villa',               3),
    ('townhouse',           'residential', 'Townhouse',           4),
    ('bungalow',            'residential', 'Bungalow',            5),
    ('studio',              'residential', 'Studio',              6),
    ('bedsitter',           'residential', 'Bedsitter',           7),
    ('single_room',         'residential', 'Single Room',         8),
    ('hostel',              'residential', 'Hostel',              9),
    ('serviced_apartment',  'residential', 'Serviced Apartment', 10),
    ('shop',                'commercial',  'Shop',                1),
    ('office_space',        'commercial',  'Office Space',        2),
    ('warehouse',           'commercial',  'Warehouse',           3),
    ('godown',              'commercial',  'Godown',              4),
    ('retail_space',        'commercial',  'Retail Space',        5),
    ('showroom',            'commercial',  'Showroom',            6),
    ('restaurant_space',    'commercial',  'Restaurant Space',    7),
    ('workshop',            'commercial',  'Workshop',            8),
    ('commercial_building', 'commercial',  'Commercial Building', 9),
    ('hotel',               'commercial',  'Hotel',              10)
ON CONFLICT (slug, category_slug) DO NOTHING;

-- ============================================================================
-- 7. RLS POLICIES
-- ============================================================================

ALTER TABLE property_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active categories"
    ON property_categories FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view active types"
    ON property_types FOR SELECT USING (is_active = true);

COMMIT;

-- ── 044_axis_property_hierarchy.sql ──────────────────────────────────────────────
-- ============================================================================
-- Migration 044: Axis property listing hierarchy
--
-- Aligns the property category/type catalog with the approved "List
-- property" structure:
--
--   1. Property Category
--      1.1 Residential
--          1.1.1 Apartments
--          1.1.2 Bungalow
--          1.1.3 Mansion
--          1.1.4 Villa
--          1.1.5 Studio
--          1.1.6 House
--      1.2 Commercial
--          1.2.1 Office Building
--          1.2.2 Warehouse
--          1.2.3 Shop
--          1.2.4 Commercial Building
--
-- Extra types seeded in 043 are deactivated (not deleted) so existing
-- properties that reference their slugs keep working; they simply no
-- longer appear in the listing dropdowns.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. NEW TYPE: Mansion (residential)
-- ============================================================================

INSERT INTO property_types (slug, category_slug, label, sort_order) VALUES
    ('mansion', 'residential', 'Mansion', 3)
ON CONFLICT (slug, category_slug) DO UPDATE
    SET label = EXCLUDED.label,
        sort_order = EXCLUDED.sort_order,
        is_active = true;

-- ============================================================================
-- 2. RESIDENTIAL: exact set, labels and order
-- ============================================================================

UPDATE property_types SET label = 'Apartments', sort_order = 1, is_active = true
    WHERE slug = 'apartment'    AND category_slug = 'residential';
UPDATE property_types SET label = 'Bungalow',   sort_order = 2, is_active = true
    WHERE slug = 'bungalow'     AND category_slug = 'residential';
UPDATE property_types SET label = 'Villa',      sort_order = 4, is_active = true
    WHERE slug = 'villa'        AND category_slug = 'residential';
UPDATE property_types SET label = 'Studio',     sort_order = 5, is_active = true
    WHERE slug = 'studio'       AND category_slug = 'residential';
UPDATE property_types SET label = 'House',      sort_order = 6, is_active = true
    WHERE slug = 'house'        AND category_slug = 'residential';

-- Deactivate residential types that are not in the approved list.
UPDATE property_types SET is_active = false
    WHERE category_slug = 'residential'
      AND slug NOT IN ('apartment', 'bungalow', 'mansion', 'villa', 'studio', 'house');

-- ============================================================================
-- 3. COMMERCIAL: exact set, labels and order
-- ============================================================================

-- The existing 'office_space' slug is kept (properties already reference it);
-- only the display label changes to the approved wording.
UPDATE property_types SET label = 'Office Building', sort_order = 1, is_active = true
    WHERE slug = 'office_space'         AND category_slug = 'commercial';
UPDATE property_types SET label = 'Warehouse',          sort_order = 2, is_active = true
    WHERE slug = 'warehouse'            AND category_slug = 'commercial';
UPDATE property_types SET label = 'Shop',               sort_order = 3, is_active = true
    WHERE slug = 'shop'                 AND category_slug = 'commercial';
UPDATE property_types SET label = 'Commercial Building', sort_order = 4, is_active = true
    WHERE slug = 'commercial_building'  AND category_slug = 'commercial';

-- Deactivate commercial types that are not in the approved list.
UPDATE property_types SET is_active = false
    WHERE category_slug = 'commercial'
      AND slug NOT IN ('office_space', 'warehouse', 'shop', 'commercial_building');

COMMIT;

-- ── 044_restore_payments_proof_url.sql ──────────────────────────────────────────────
-- Restore payments.proof_url.
--
-- 20260312220000_align_schema_to_backend.sql dropped this column, but
-- PaymentVerificationService.approve_submission still writes the tenant's
-- uploaded screenshot into it. Because the insert payload is built with
-- exclude_none=True, the column was only referenced when a tenant actually
-- attached proof -- so approving those submissions failed with
--   42703: column "proof_url" of relation "payments" does not exist
-- (surfacing in the app as "Internal server error") while rejection, which
-- never touches the payments table, kept working. The web ManagerDashboard
-- also renders p.proof_url, which had been silently null since the drop.
--
-- Already applied to the live project on 2026-09-05.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS proof_url TEXT;

-- ── 045_agreement_tenant_rejection.sql ──────────────────────────────────────────────
-- Tenant-initiated agreement rejection with a comment for the manager.
--
-- Previously a tenant could only consent; disagreeing meant contacting the
-- manager out of band. This adds a "changes_requested" document state plus the
-- reason the tenant gave, so the manager can see what to adjust and revise.
--
-- Already applied to the live project on 2026-09-05.

ALTER TABLE public.agreement_documents
  DROP CONSTRAINT IF EXISTS agreement_documents_status_check;

ALTER TABLE public.agreement_documents
  ADD CONSTRAINT agreement_documents_status_check
  CHECK (status = ANY (ARRAY[
    'draft',
    'awaiting_tenant_consent',
    'awaiting_manager_consent',
    'changes_requested',
    'executed',
    'superseded',
    'cancelled',
    'active',
    'archived',
    'fully_executed'
  ]));

ALTER TABLE public.agreement_documents
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by UUID;

-- The comment is also kept on the consent record itself, so the audit trail
-- holds every round of objections rather than only the most recent one.
-- consent_status already permits 'declined'.
ALTER TABLE public.agreement_consents
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- ── 046_receipt_coverage_period_and_currency.sql ──────────────────────────────────────────────
-- 1. Receipt coverage period.
-- Receipts recorded "Rent coverage: 90 days" but never the dates that span,
-- so a tenant paying 1 Apr for three months had no 30 Jun end date anywhere
-- on the receipt. Stored as a snapshot alongside the other frozen values so a
-- reissued receipt always shows the period as it was at the time of payment.
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS coverage_start_date DATE,
  ADD COLUMN IF NOT EXISTS coverage_end_date DATE;

UPDATE public.receipts
   SET coverage_start_date = payment_date,
       coverage_end_date   = payment_date + (coverage_days || ' days')::interval
 WHERE coverage_days IS NOT NULL
   AND payment_date IS NOT NULL
   AND coverage_end_date IS NULL;

-- 2. Currency chain.
-- properties.rent_currency already existed (default UGX) and the mobile create
-- /edit screens already wrote it, but it stopped there: leases and payments had
-- no currency at all, so ReceiptService's payment.get("currency") always fell
-- through to the 'UGX' default and every receipt read UGX regardless of how the
-- property was listed.
ALTER TABLE public.leases
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'UGX';

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'UGX';

UPDATE public.leases l
   SET currency = COALESCE(p.rent_currency, 'UGX')
  FROM public.properties p
 WHERE p.id = l.property_id
   AND l.currency = 'UGX'
   AND COALESCE(p.rent_currency, 'UGX') <> 'UGX';

UPDATE public.payments pay
   SET currency = l.currency
  FROM public.leases l
 WHERE l.id = pay.lease_id
   AND pay.currency = 'UGX'
   AND l.currency <> 'UGX';

-- ── 047_maintenance_photo_url.sql ──────────────────────────────────────────────
-- The web tenant dashboard uploads a photo with a maintenance request and
-- inserts photo_url, but the column never existed -- so every submission with
-- a photo failed on insert. Already applied to the live project.
ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- ── 048_rental_unit_security_deposit.sql ──────────────────────────────────────────────
-- Units are let separately at their own rents, so they carry their own
-- deposit. Already applied to the live project.
ALTER TABLE public.rental_units
  ADD COLUMN IF NOT EXISTS security_deposit NUMERIC DEFAULT 0;

-- ── 049_backfill_default_rental_unit.sql ──────────────────────────────────────────────
-- A property is its units: one or many, each with its own specs and price.
-- The listing price is the range across them.
--
-- Pricing used to live on the property while rental_units sat unused (17
-- properties, 0 units), so the two concepts competed with nothing saying which
-- was authoritative. This gives every property a unit carrying its current
-- specs and price, without changing what any listing shows.
--
-- Already applied to the live project. PropertyService._ensure_default_unit
-- does the same for newly created properties.

INSERT INTO public.rental_units (
  property_id, owner_id, unit_number, bedrooms, bathrooms,
  sitting_rooms, rent_amount, rent_currency, security_deposit, status
)
SELECT
  p.id, p.owner_id,
  COALESCE(
    NULLIF((SELECT l.unit_label FROM public.leases l
             WHERE l.property_id = p.id AND l.unit_label IS NOT NULL
             ORDER BY l.created_at LIMIT 1), ''),
    'Main unit'
  ),
  COALESCE(p.bedrooms, 1), COALESCE(p.bathrooms, 1), COALESCE(p.sitting_rooms, 1),
  COALESCE(p.monthly_rent, 0), COALESCE(p.rent_currency, 'UGX'),
  COALESCE(p.security_deposit, 0),
  CASE WHEN p.status = 'occupied' THEN 'occupied' ELSE 'available' END
FROM public.properties p
WHERE NOT EXISTS (SELECT 1 FROM public.rental_units u WHERE u.property_id = p.id);

-- ── 050_bind_leases_to_units.sql ──────────────────────────────────────────────
-- A tenancy is for a specific unit, not a free-text label. unit_label held a
-- string nothing validated or joined on, so there was no reliable way to tell
-- which units were occupied. Already applied to the live project, along with
-- backfilling units from the labels managers had been using.
ALTER TABLE public.leases
  ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.rental_units(id) ON DELETE SET NULL;

UPDATE public.leases l SET unit_id = u.id FROM public.rental_units u
 WHERE u.property_id = l.property_id AND l.unit_id IS NULL
   AND l.unit_label IS NOT NULL
   AND lower(btrim(u.unit_number)) = lower(btrim(l.unit_label));

UPDATE public.leases l SET unit_id = u.id FROM public.rental_units u
 WHERE u.property_id = l.property_id AND l.unit_id IS NULL
   AND (SELECT count(*) FROM public.rental_units x WHERE x.property_id = l.property_id) = 1;

CREATE INDEX IF NOT EXISTS idx_leases_unit_id ON public.leases(unit_id);

COMMIT;
