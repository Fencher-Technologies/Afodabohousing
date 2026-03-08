CREATE TABLE IF NOT EXISTS public.rental_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_number text NOT NULL,
  floor_level text,
  bedrooms integer NOT NULL DEFAULT 1,
  bathrooms integer NOT NULL DEFAULT 1,
  sitting_rooms integer NOT NULL DEFAULT 0,
  kitchens integer NOT NULL DEFAULT 1,
  rent_amount bigint NOT NULL,
  rent_currency text NOT NULL DEFAULT 'UGX',
  status public.property_status NOT NULL DEFAULT 'available',
  description text,
  amenities text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rental_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Units are publicly viewable" ON public.rental_units FOR SELECT USING (status <> 'inactive'::property_status);
CREATE POLICY "Managers can insert their units" ON public.rental_units FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.properties WHERE id = property_id AND manager_id = auth.uid()));
CREATE POLICY "Managers can update their units" ON public.rental_units FOR UPDATE USING (EXISTS (SELECT 1 FROM public.properties WHERE id = property_id AND manager_id = auth.uid()));
CREATE POLICY "Managers can delete their units" ON public.rental_units FOR DELETE USING (EXISTS (SELECT 1 FROM public.properties WHERE id = property_id AND manager_id = auth.uid()));
CREATE POLICY "Admins can view all units" ON public.rental_units FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update all units" ON public.rental_units FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_rental_units_updated_at BEFORE UPDATE ON public.rental_units FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
