-- ── 039_add_country_currency_to_properties.sql ──────────────────────────────────────────────
-- Add country and rent_currency columns to properties table

ALTER TABLE properties ADD COLUMN IF NOT EXISTS country CHAR(2) DEFAULT 'UG';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS rent_currency VARCHAR(3) DEFAULT 'UGX';

