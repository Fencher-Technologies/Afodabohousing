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
