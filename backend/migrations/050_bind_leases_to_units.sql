-- A tenancy is for a specific unit, not a free-text label. unit_label held a
-- string nothing validated or joined on, so there was no reliable way to tell
-- which units were occupied. Already applied to the live project, along with
-- backfilling units from the labels managers had been using.
ALTER TABLE public.leases
  ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.rental_units(id) ON DELETE SET NULL;

UPDATE public.leases l SET unit_id = u.id FROM public.rental_units u
 WHERE u.property_id = l.property_id AND l.unit_id IS NULL
   AND l.unit_label IS NOT NULL
   AND lower(btrim(u.unit_number)) = lower(btrim(l.unit_label));

UPDATE public.leases l SET unit_id = u.id FROM public.rental_units u
 WHERE u.property_id = l.property_id AND l.unit_id IS NULL
   AND (SELECT count(*) FROM public.rental_units x WHERE x.property_id = l.property_id) = 1;

CREATE INDEX IF NOT EXISTS idx_leases_unit_id ON public.leases(unit_id);
