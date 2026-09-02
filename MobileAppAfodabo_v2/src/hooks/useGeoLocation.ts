import { useQuery } from "@tanstack/react-query";
import { geoService } from "../services/geo";

export function useCountries() {
  return useQuery({
    queryKey: ["countries"],
    queryFn: () => geoService.fetchCountries(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRegions(countryId: string) {
  return useQuery({
    queryKey: ["regions", countryId],
    queryFn: () => geoService.fetchRegions(countryId),
    staleTime: 5 * 60 * 1000,
    enabled: !!countryId,
  });
}
