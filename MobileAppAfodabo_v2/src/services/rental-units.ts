/**
 * Rental units — a property can hold several units at different rents.
 *
 * The backend has had full CRUD for units since the start and the web app
 * uses it, but the mobile app only carried the type: managers could not add
 * or edit units from their phone, so a multi-unit building could only be
 * listed at one price.
 */

import { api } from "../lib/api-client";

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export type RentalUnitStatus = "available" | "occupied" | "maintenance" | "archived";

export interface RentalUnit {
  id: string;
  property_id: string;
  owner_id: string;
  unit_number: string;
  floor_level: string | null;
  bedrooms: number;
  bathrooms: number;
  sitting_rooms: number;
  kitchens: number;
  rent_amount: number;
  rent_currency: string;
  status: RentalUnitStatus;
  description: string | null;
  amenities: string[] | null;
}

export interface RentalUnitInput {
  unit_number: string;
  floor_level?: string | null;
  bedrooms: number;
  bathrooms: number;
  sitting_rooms?: number;
  kitchens?: number;
  rent_amount: number;
  /** Omitted so the unit inherits the property's currency. */
  rent_currency?: string;
  status?: RentalUnitStatus;
  description?: string | null;
}

export const rentalUnitsService = {
  listForProperty: (propertyId: string) =>
    api.get<PaginatedResponse<RentalUnit>>(`/rental-units/property/${propertyId}`),

  create: (propertyId: string, data: RentalUnitInput) =>
    api.post<RentalUnit>("/rental-units", { ...data, property_id: propertyId }),

  update: (unitId: string, data: Partial<RentalUnitInput>) =>
    api.patch<RentalUnit>(`/rental-units/${unitId}`, data),

  remove: (unitId: string) => api.delete<void>(`/rental-units/${unitId}`),
};
