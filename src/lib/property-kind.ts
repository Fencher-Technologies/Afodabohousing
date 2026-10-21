/**
 * Commercial properties (shops, warehouses, offices...) are described by floor
 * area, floors, parking and washrooms, not bedrooms, sitting rooms or kitchens.
 * `property_type` is the legacy ENUM kept in sync with the category:
 * 'Office Space' = commercial, 'Residential' = residential.
 */
export function isCommercial(p?: { property_type?: string | null } | null): boolean {
  return (p?.property_type || '').toLowerCase() === 'office space';
}

/** "250 sq ft · 2 floors · 5 parking · 2 washrooms" for a commercial listing. */
export function commercialSummary(p: {
  square_feet?: number | null; floors?: number | null;
  parking_spaces?: number | null; bathrooms?: number | null;
}): string[] {
  const out: string[] = [];
  if (p.square_feet) out.push(`${Number(p.square_feet).toLocaleString()} sq ft`);
  if (p.floors) out.push(`${p.floors} floor${p.floors === 1 ? '' : 's'}`);
  if (p.parking_spaces) out.push(`${p.parking_spaces} parking`);
  if (p.bathrooms) out.push(`${p.bathrooms} washroom${Number(p.bathrooms) === 1 ? '' : 's'}`);
  return out;
}
