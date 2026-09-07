-- Units are let separately at their own rents, so they carry their own
-- deposit. Already applied to the live project.
ALTER TABLE public.rental_units
  ADD COLUMN IF NOT EXISTS security_deposit NUMERIC DEFAULT 0;
