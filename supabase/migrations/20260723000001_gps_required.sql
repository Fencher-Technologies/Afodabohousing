UPDATE properties SET latitude = 0.0 WHERE latitude IS NULL;
UPDATE properties SET longitude = 0.0 WHERE longitude IS NULL;

ALTER TABLE properties
    ALTER COLUMN latitude SET NOT NULL,
    ALTER COLUMN longitude SET NOT NULL;

ALTER TABLE properties
    ADD CONSTRAINT check_lat_range CHECK (latitude >= -90 AND latitude <= 90),
    ADD CONSTRAINT check_lng_range CHECK (longitude >= -180 AND longitude <= 180);
