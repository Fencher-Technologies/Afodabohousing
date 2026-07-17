import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { tenantsService } from "../services/tenants";

export function useTenantList(search?: string) {
  return useQuery({
    queryKey: ["tenants", search],
    queryFn: () => tenantsService.list(0, 100, search),
  });
}

export function useTenant(id: string) {
  return useQuery({
    queryKey: ["tenants", id],
    queryFn: () => tenantsService.getById(id),
    enabled: !!id,
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tenantsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      tenantsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
}

export function useResolveTenantByEmail() {
  return useMutation({
    mutationFn: (email: string) => tenantsService.resolveByEmail(email),
  });
}
