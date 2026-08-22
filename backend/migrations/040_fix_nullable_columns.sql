-- Make address and city nullable (form uses region_id + lat/lng instead)
ALTER TABLE properties ALTER COLUMN address DROP NOT NULL;
ALTER TABLE properties ALTER COLUMN address SET DEFAULT '';
ALTER TABLE properties ALTER COLUMN city DROP NOT NULL;
ALTER TABLE properties ALTER COLUMN city SET DEFAULT '';
