import { api } from "../lib/api-client";
import type { BackendProperty } from "@/src/types";

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
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
  listPublic: (params?: { state?: string; property_type?: string; property_type_slug?: string; min_price?: number; max_price?: number; skip?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.state) query.set("state", params.state);
    if (params?.property_type) query.set("property_type", params.property_type);
    if (params?.property_type_slug) query.set("property_type_slug", params.property_type_slug);
    if (params?.min_price !== undefined) query.set("min_price", String(params.min_price));
    if (params?.max_price !== undefined) query.set("max_price", String(params.max_price));
    if (params?.skip !== undefined) query.set("skip", String(params.skip));
    if (params?.limit !== undefined) query.set("limit", String(params.limit));
    const qs = query.toString();
    return api.get<PaginatedResponse<BackendProperty>>(`/properties/public${qs ? `?${qs}` : ""}`);
  },

  /** Public: get single property (no auth required) */
  getByIdPublic: (id: string) =>
    api.get<BackendProperty>(`/properties/public/${id}`),

  create: (data: Record<string, unknown>) =>
    api.post<BackendProperty>("/properties", data),

  update: (id: string, data: Record<string, unknown>) =>
    api.patch<BackendProperty>(`/properties/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/properties/${id}`),
};
