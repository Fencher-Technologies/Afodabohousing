import { api } from "../lib/api-client";

export interface PropertyCategory {
  slug: string;
  label: string;
  sort_order: number;
}

export interface PropertyType {
  slug: string;
  label: string;
  category_slug: string;
  sort_order: number;
}

export const propertyTypesService = {
  fetchCategories: () =>
    api.get<PropertyCategory[]>("/property-types/categories"),

  fetchTypes: (categorySlug?: string) => {
    const qs = categorySlug ? `?category=${encodeURIComponent(categorySlug)}` : "";
    return api.get<PropertyType[]>(`/property-types/types${qs}`);
  },
};
