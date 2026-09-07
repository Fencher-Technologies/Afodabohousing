-- A property is its units: one or many, each with its own specs and price.
-- The listing price is the range across them.
--
-- Pricing used to live on the property while rental_units sat unused (17
-- properties, 0 units), so the two concepts competed with nothing saying which
-- was authoritative. This gives every property a unit carrying its current
-- specs and price, without changing what any listing shows.
--
-- Already applied to the live project. PropertyService._ensure_default_unit
-- does the same for newly created properties.

INSERT INTO public.rental_units (
  property_id, owner_id, unit_number, bedrooms, bathrooms,
  sitting_rooms, rent_amount, rent_currency, security_deposit, status
)
SELECT
  p.id, p.owner_id,
  COALESCE(
    NULLIF((SELECT l.unit_label FROM public.leases l
             WHERE l.property_id = p.id AND l.unit_label IS NOT NULL
             ORDER BY l.created_at LIMIT 1), ''),
    'Main unit'
  ),
  COALESCE(p.bedrooms, 1), COALESCE(p.bathrooms, 1), COALESCE(p.sitting_rooms, 1),
  COALESCE(p.monthly_rent, 0), COALESCE(p.rent_currency, 'UGX'),
  COALESCE(p.security_deposit, 0),
  CASE WHEN p.status = 'occupied' THEN 'occupied' ELSE 'available' END
FROM public.properties p
WHERE NOT EXISTS (SELECT 1 FROM public.rental_units u WHERE u.property_id = p.id);
