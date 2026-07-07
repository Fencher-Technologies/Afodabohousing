-- Restrict property categories to the supported marketplace focus.
-- Existing residential-like legacy values are mapped to Residential.
-- Commercial/office-like legacy values are mapped to Office Space.
-- Any other unexpected values are removed before the enum is narrowed.

BEGIN;

ALTER TABLE public.properties
  ALTER COLUMN property_type DROP DEFAULT;

ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_property_type_check;

DELETE FROM public.properties
WHERE property_type::text NOT IN (
  'Residential',
  'residential',
  'Office Space',
  'office space',
  'office_space',
  'office',
  'commercial',
  'house',
  'apartment',
  'self_contained',
  'room',
  'studio',
  'bungalow',
  'condo',
  'townhouse'
);

ALTER TYPE public.property_type RENAME TO property_type_old;

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

DROP TYPE public.property_type_old;

COMMIT;
