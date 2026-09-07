/** Maintenance request hooks. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { maintenanceService, type MaintenanceStatus } from "@/src/services/maintenance";

export function useMaintenanceRequests(status?: MaintenanceStatus) {
  return useQuery({
    queryKey: ["maintenance", status ?? "all"],
    queryFn: () => maintenanceService.list(status),
  });
}

export function useCreateMaintenanceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: maintenanceService.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["maintenance"] }),
  });
}

export function useUpdateMaintenanceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof maintenanceService.update>[1] }) =>
      maintenanceService.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["maintenance"] }),
  });
}
