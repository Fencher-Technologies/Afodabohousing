import { api } from "../lib/api-client";
import type { BackendProperty } from "@/src/types";
import { mapPropertyTypeToBackend } from "../mappers/property-mapper";

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

interface PropertyCreateData {
  title: string;
  district: string;
  address?: string;
  city?: string;
  type: string;
  rent_amount: number;
  rent_period?: string;
  beds: number;
  baths: number;
  sitting_rooms?: number;
  kitchens?: number;
  description?: string;
  amenities?: string[];
  images?: string[];
  status?: string;
}

function mapPropertyTypeInData(data: PropertyCreateData | Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...data };
  // Handle both "type" (mobile format) and "property_type" (backend format)
  const typeKey = result.type ? "type" : result.property_type ? "property_type" : null;
  if (typeKey && typeof result[typeKey] === "string") {
    result[typeKey] = mapPropertyTypeToBackend(result[typeKey] as any);
  }
  return result;
}

export async function uploadPropertyImage(uri: string): Promise<string> {
  const formData = new FormData();
  const filename = uri.split("/").pop() || "property-image.jpg";
  formData.append("file", {
    uri,
    type: "image/jpeg",
    name: filename,
  } as any);
  const result = await api.upload<{ path: string; url: string }>("/uploads/property-image", formData);
  return result.url;
}

export async function ensureImagesUploaded(images: string[]): Promise<string[]> {
  const results = await Promise.all(
    images.map(async (uri) => {
      if (uri.startsWith("file://")) {
        return uploadPropertyImage(uri);
      }
      return uri;
    })
  );
  return results;
}

export const propertiesService = {
  /** Authenticated: list manager's own properties */
  list: (skip = 0, limit = 100) =>
    api.get<PaginatedResponse<BackendProperty>>(`/properties?skip=${skip}&limit=${limit}`),

  /** Authenticated: get single property by ID */
  getById: (id: string) =>
    api.get<BackendProperty>(`/properties/${id}`),

  /** Public: browse all available properties (no auth required) */
  listPublic: (params?: { state?: string; property_type?: string; min_price?: number; max_price?: number; skip?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.state) query.set("state", params.state);
    if (params?.property_type) query.set("property_type", params.property_type);
    if (params?.min_price !== undefined) query.set("min_price", String(params.min_price));
    if (params?.max_price !== undefined) query.set("max_price", String(params.max_price));
    if (params?.skip) query.set("skip", String(params.skip));
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString();
    return api.get<PaginatedResponse<BackendProperty>>(`/properties/public${qs ? `?${qs}` : ""}`);
  },

  /** Public: get single property (no auth required) */
  getByIdPublic: (id: string) =>
    api.get<BackendProperty>(`/properties/public/${id}`),

  create: (data: PropertyCreateData) =>
    api.post<BackendProperty>("/properties", mapPropertyTypeInData(data)),

  update: (id: string, data: Record<string, unknown>) =>
    api.patch<BackendProperty>(`/properties/${id}`, mapPropertyTypeInData(data)),

  delete: (id: string) =>
    api.delete<void>(`/properties/${id}`),
};
