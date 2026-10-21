-- Commercial listings are described by floor area, floors and parking rather than
-- bedrooms/kitchens. square_feet already exists; add the other two.
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS floors integer,
  ADD COLUMN IF NOT EXISTS parking_spaces integer;

ALTER TABLE public.properties
  ADD CONSTRAINT properties_floors_check CHECK (floors IS NULL OR floors >= 0),
  ADD CONSTRAINT properties_parking_spaces_check CHECK (parking_spaces IS NULL OR parking_spaces >= 0);

COMMENT ON COLUMN public.properties.floors IS 'Number of floors (commercial listings). NULL = not stated.';
COMMENT ON COLUMN public.properties.parking_spaces IS 'Parking spaces on site (commercial listings). NULL = not stated.';
