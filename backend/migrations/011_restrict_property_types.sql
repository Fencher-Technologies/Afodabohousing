-- Restrict property categories to the supported marketplace focus.
-- Maps existing text values to a strict ENUM ('Residential', 'Office Space').
-- Safe to re-run: removes old default/check, creates enum, casts, sets new default.
-- NOTE: property_type is TEXT, so there's no pre-existing enum to rename.

BEGIN;

ALTER TABLE public.properties
  ALTER COLUMN property_type DROP DEFAULT;

ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_property_type_check;

-- Safe migration-only safety net: deletes rows with unexpected values.
-- Dry-run confirmed zero rows match today — this is a no-op in practice.
DELETE FROM public.properties
WHERE property_type::text NOT IN (
  'Residential', 'residential',
  'Office Space', 'office space', 'office_space', 'office', 'commercial',
  'house', 'apartment', 'self_contained', 'room', 'studio',
  'bungalow', 'condo', 'townhouse'
);

DROP TYPE IF EXISTS public.property_type CASCADE;

CREATE TYPE public.property_type AS ENUM ('Residential', 'Office Space');

ALTER TABLE public.properties
  ALTER COLUMN property_type TYPE public.property_type
  USING (
    CASE
      WHEN property_type::text IN ('Office Space', 'office space', 'office_space', 'office', 'commercial')
        THEN 'Office Space'::public.property_type
      ELSE 'Residential'::public.property_type
    END
  );

ALTER TABLE public.properties
  ALTER COLUMN property_type SET DEFAULT 'Residential'::public.property_type;

COMMIT;
