import type { Database, PropertyRow, RentalUnitRow } from '../types/supabase';
import { apiRequest, type PaginatedResponse } from './backend-api';
import {
  mapBackendPropertyToPropertyRow,
  mapBackendRentalUnitToRentalUnitRow,
} from './backend-mappers';

export interface PropertyFilters {
  amenities?: string[];
  bathrooms?: string;
  bedrooms?: string;
  district?: string;
  maxPrice?: string;
  minPrice?: string;
  propertyType?: Database['public']['Enums']['property_type'] | 'all';
  rentPeriod?: Database['public']['Enums']['rent_period'] | 'all';
}

export interface ExploreStats {
  properties: number;
  tenancies: number;
  users: number;
}

export interface PropertyDetailsPayload {
  property: PropertyRow | null;
  units: RentalUnitRow[];
}

export async function fetchExploreStats(): Promise<ExploreStats> {
  const properties = await apiRequest<PaginatedResponse<Record<string, unknown>>>(
    '/properties/public',
    {
      query: { limit: 1, skip: 0 },
    },
  );

  return {
    properties: properties.total ?? 0,
    tenancies: 0,
    users: 0,
  };
}

export async function fetchProperties(filters: PropertyFilters = {}) {
  const response = await apiRequest<
    PaginatedResponse<{
      address: string;
      amenities?: string[] | null;
      bathrooms: number;
      bedrooms: number;
      city: string;
      created_at: string;
      description?: string | null;
      id: string;
      images?: string[] | null;
      monthly_rent: number | string;
      owner_id: string;
      property_type: string;
      state: string;
      status: string;
      title?: string | null;
      updated_at: string;
      zip_code?: string;
    }>
  >('/properties/public', {
    query: { limit: 100, skip: 0 },
  });

  let properties = response.items.map(mapBackendPropertyToPropertyRow);

  if (filters.district) {
    const district = filters.district.toLowerCase();
    properties = properties.filter((property) =>
      property.district.toLowerCase().includes(district),
    );
  }

  if (filters.propertyType && filters.propertyType !== 'all') {
    properties = properties.filter((property) => property.property_type === filters.propertyType);
  }

  if (filters.rentPeriod && filters.rentPeriod !== 'all') {
    properties = properties.filter((property) => property.rent_period === filters.rentPeriod);
  }

  if (filters.minPrice) {
    properties = properties.filter((property) => property.rent_amount >= Number(filters.minPrice));
  }

  if (filters.maxPrice) {
    properties = properties.filter((property) => property.rent_amount <= Number(filters.maxPrice));
  }

  if (filters.bedrooms) {
    properties = properties.filter((property) => property.bedrooms >= Number(filters.bedrooms));
  }

  if (filters.bathrooms) {
    properties = properties.filter((property) => property.bathrooms >= Number(filters.bathrooms));
  }

  if (filters.amenities?.length) {
    properties = properties.filter((property) => {
      const propertyAmenities = property.amenities ?? [];
      return filters.amenities?.every((amenity) => propertyAmenities.includes(amenity));
    });
  }

  return {
    count: properties.length,
    properties,
  };
}

export async function fetchPropertyDetails(propertyId: string): Promise<PropertyDetailsPayload> {
  const [property, units] = await Promise.all([
    apiRequest<{
      address: string;
      amenities?: string[] | null;
      bathrooms: number;
      bedrooms: number;
      city: string;
      created_at: string;
      description?: string | null;
      id: string;
      images?: string[] | null;
      monthly_rent: number | string;
      owner_id: string;
      property_type: string;
      state: string;
      status: string;
      title?: string | null;
      updated_at: string;
      zip_code?: string;
    }>(`/properties/public/${propertyId}`),
    apiRequest<
      PaginatedResponse<{
        amenities?: string[] | null;
        bathrooms: number;
        bedrooms: number;
        created_at: string;
        description?: string | null;
        floor_level?: string | null;
        id: string;
        kitchens?: number;
        owner_id: string;
        property_id: string;
        rent_amount: number | string;
        rent_currency?: string;
        sitting_rooms?: number;
        status: string;
        unit_number: string;
        updated_at: string;
      }>
    >(`/rental-units/property/${propertyId}`, {
      query: { limit: 50, skip: 0 },
    }),
  ]);

  return {
    property: mapBackendPropertyToPropertyRow(property),
    units: units.items.map(mapBackendRentalUnitToRentalUnitRow),
  };
}
