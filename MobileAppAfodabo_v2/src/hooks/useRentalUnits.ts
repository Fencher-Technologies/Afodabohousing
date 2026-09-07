/**
 * Rental unit hooks. Units are edited as a set on the property form, so the
 * mutations invalidate both the units query and the property list (whose
 * cards show a price range derived from units).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { rentalUnitsService, type RentalUnitInput } from "@/src/services/rental-units";

export function usePropertyUnits(propertyId: string | undefined) {
  return useQuery({
    queryKey: ["rental-units", propertyId],
    queryFn: () => rentalUnitsService.listForProperty(propertyId as string),
    enabled: !!propertyId,
  });
}

export function useCreateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ propertyId, data }: { propertyId: string; data: RentalUnitInput }) =>
      rentalUnitsService.create(propertyId, data),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ["rental-units", v.propertyId] });
      qc.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

export function useUpdateUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ unitId, data }: { unitId: string; data: Partial<RentalUnitInput> }) =>
      rentalUnitsService.update(unitId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rental-units"] });
      qc.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

export function useDeleteUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (unitId: string) => rentalUnitsService.remove(unitId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rental-units"] });
      qc.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}
