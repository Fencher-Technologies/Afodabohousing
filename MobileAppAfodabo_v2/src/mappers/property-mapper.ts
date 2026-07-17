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

function mapBackendPropertyType(type: string): Property["type"] {
  const valid: Property["type"][] = ["apartment", "house", "studio", "shop", "single_room"];
  return valid.includes(type as Property["type"]) ? (type as Property["type"]) : "apartment";
}

/** Map frontend PropertyType to backend enum value ('Residential' | 'Office Space') */
export function mapPropertyTypeToBackend(type: PropertyType): "Residential" | "Office Space" {
  switch (type) {
    case "shop":
      return "Office Space";
    case "apartment":
    case "house":
    case "studio":
    case "single_room":
    default:
      return "Residential";
  }
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
    type: mapBackendPropertyType(b.property_type),
    rent_amount: (b.rent_amount ?? b.monthly_rent ?? 0),
    rent_period: "monthly",
    beds: b.bedrooms ?? 0,
    baths: b.bathrooms ?? 0,
    sitting_rooms: 0,
    kitchens: 0,
    description: b.description ?? "",
    amenities: (b.amenities ?? []) as Property["amenities"],
    images: b.images ?? [],
    status: b.is_active ? mapBackendStatus(b.status) : "inactive",
    lat: b.latitude ?? undefined,
    lng: b.longitude ?? undefined,
    manager_email: b.manager_email ?? undefined,
    manager_phone: b.manager_phone ?? undefined,
    square_feet: b.square_feet ?? undefined,
    security_deposit: b.security_deposit ?? undefined,
    units: [],
    created_at: b.created_at ?? "",
    occupancy_status: b.status,
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
    type: mapBackendPropertyType(b.property_type),
    rent_amount: (b.rent_amount ?? b.monthly_rent ?? 0),
    rent_period: "monthly",
    beds: b.bedrooms ?? 0,
    baths: b.bathrooms ?? 0,
    images: b.images ?? [],
    status: b.is_active ? mapBackendStatus(b.status) : "inactive",
    occupied_units: 0,
    total_units: 0,
    occupancy_status: b.status,
  };
}
