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
