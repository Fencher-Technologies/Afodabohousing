-- ============================================================================
-- Migration: Make zip_code nullable, drop redundant rent_period CHECK constraint
-- ============================================================================

ALTER TABLE public.properties ALTER COLUMN zip_code DROP NOT NULL;
ALTER TABLE public.properties ALTER COLUMN zip_code SET DEFAULT '';

ALTER TABLE public.properties ALTER COLUMN country SET DEFAULT 'UG';

-- Drop redundant CHECK constraint — rent_period ENUM already validates
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_rent_period_check;
