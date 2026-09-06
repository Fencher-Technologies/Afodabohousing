import type { BackendProperty, Property, PropertyListItem, PropertyType } from "@/src/types";

function mapBackendStatus(status: string): "active" | "inactive" {
  switch (status) {
    case "available":
    case "occupied":
      return "active";
    default:
      return "inactive";
  }
}

function mapBackendPropertyType(type: string, slug?: string | null): PropertyType {
  if (slug) return slug;
  if (type === "Residential") return "Residential";
  if (type === "Office Space") return "Office Space";
  return type;
}

export function fromBackendProperty(b: BackendProperty): Property {
  return {
    id: b.id,
    manager_id: b.owner_id,
    title: b.title,
    district: b.state || "",
    address: b.address || "",
    city: b.city || "",
    area: b.city || b.state || "",
    type: mapBackendPropertyType(b.property_type, b.property_type_slug),
    rent_amount: (b.rent_amount ?? b.monthly_rent ?? 0),
    rent_currency: b.rent_currency ?? "UGX",
    rent_period: "monthly",
    beds: b.bedrooms ?? 1,
    baths: b.bathrooms ?? 1,
    sitting_rooms: (b as any).sitting_rooms ?? 1,
    kitchens: (b as any).kitchens ?? 0,
    description: b.description ?? "",
    amenities: (b.amenities ?? []) as Property["amenities"],
    images: b.images ?? [],
    status: b.is_active ? mapBackendStatus(b.status) : "inactive",
    lat: b.latitude ?? undefined,
    lng: b.longitude ?? undefined,
    country: b.country ?? null,
    region_id: b.region_id ?? null,
    manager_email: b.manager_email ?? undefined,
    manager_phone: b.manager_phone ?? undefined,
    square_feet: b.square_feet ?? undefined,
    security_deposit: b.security_deposit ?? undefined,
    units: [],
    created_at: b.created_at ?? "",
    occupancy_status: b.status,
    is_boosted: b.is_boosted ?? false,
    boosted_until: b.boosted_until ?? null,
    boost_days_remaining: b.boost_days_remaining ?? 0,
    boost_package_label: b.boost_package_label ?? null,
  };
}

export function fromBackendPropertyList(items: BackendProperty[]): Property[] {
  return items.map(fromBackendProperty);
}

export function fromBackendToListItem(b: BackendProperty): PropertyListItem {
  return {
    id: b.id,
    title: b.title,
    district: b.state || "",
    city: b.city || "",
    type: mapBackendPropertyType(b.property_type, b.property_type_slug),
    rent_amount: (b.rent_amount ?? b.monthly_rent ?? 0),
    rent_currency: b.rent_currency ?? "UGX",
    rent_period: "monthly",
    beds: b.bedrooms ?? 1,
    baths: b.bathrooms ?? 1,
    images: b.images ?? [],
    status: b.is_active ? mapBackendStatus(b.status) : "inactive",
    occupied_units: 0,
    total_units: 0,
    occupancy_status: b.status,
    is_boosted: b.is_boosted ?? false,
    boosted_until: b.boosted_until ?? null,
    boost_days_remaining: b.boost_days_remaining ?? 0,
    boost_package_label: b.boost_package_label ?? null,
  };
}
