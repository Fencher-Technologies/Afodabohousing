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

