import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { propertiesService } from "../services/properties";
import { fromBackendProperty, fromBackendPropertyList, fromBackendToListItem } from "../mappers/property-mapper";
import type { Property, PropertyListItem } from "@/src/types";

export function usePropertyList() {
  return useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const res = await propertiesService.list();
      return {
        items: fromBackendPropertyList(res.items),
        total: res.total,
        skip: res.skip,
        limit: res.limit,
      };
    },
  });
}

export function useProperty(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["properties", id],
    queryFn: async () => {
      const res = await propertiesService.getById(id);
      return fromBackendProperty(res);
    },
    enabled: !!id && (options?.enabled ?? true),
  });
}

/** Public property list (no auth required) — used by guest explore */
export function usePublicProperties(params?: { state?: string; property_type?: string; min_price?: number; max_price?: number }) {
  return useQuery({
    queryKey: ["properties", "public", params],
    queryFn: async () => {
      const res = await propertiesService.listPublic(params);
      return {
        items: fromBackendPropertyList(res.items),
        total: res.total,
        skip: res.skip,
        limit: res.limit,
      };
    },
  });
}

/** Public property detail (no auth required) — used by guest detail view */
export function usePublicProperty(id: string) {
  return useQuery({
    queryKey: ["properties", "public", id],
    queryFn: async () => {
      const res = await propertiesService.getByIdPublic(id);
      return fromBackendProperty(res);
    },
    enabled: !!id,
  });
}

/** List items for manager properties screen */
export function usePropertyListItems() {
  return useQuery({
    queryKey: ["properties", "list-items"],
    queryFn: async () => {
      const res = await propertiesService.list(0, 100);
      return res.items.map(fromBackendToListItem);
    },
  });
}

export function useCreateProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => propertiesService.create(data as never),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

export function useUpdateProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      propertiesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

export function useDeleteProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => propertiesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}
