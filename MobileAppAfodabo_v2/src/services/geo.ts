import { api } from "../lib/api-client";

export interface Country {
  id: string;
  iso2: string;
  name: string;
}

export interface Region {
  id: string;
  country_id: string;
  name: string;
  admin_level: string;
  geonames_id: string;
  effective_date?: string;
}

export const geoService = {
  fetchCountries: () => api.get<Country[]>("/regions/countries"),

  fetchRegions: (countryId: string) =>
    api.get<Region[]>(
      `/regions/regions?country_id=${encodeURIComponent(countryId)}&active_only=true`
    ),
};
