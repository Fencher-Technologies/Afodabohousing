import { useQuery } from "@tanstack/react-query";
import { propertyTypesService } from "../services/property-types";

export function usePropertyCategories() {
  return useQuery({
    queryKey: ["property-categories"],
    queryFn: () => propertyTypesService.fetchCategories(),
    staleTime: 30 * 60_000,
  });
}

export function usePropertyTypes(categorySlug?: string) {
  return useQuery({
    queryKey: ["property-types", categorySlug ?? ""],
    queryFn: () => propertyTypesService.fetchTypes(categorySlug),
    staleTime: 30 * 60_000,
  });
}
