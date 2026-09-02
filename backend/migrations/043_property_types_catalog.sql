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
