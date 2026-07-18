import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { tenanciesService } from "../services/tenancies";

export function useTenancyList() {
  return useQuery({
    queryKey: ["tenancies"],
    queryFn: () => tenanciesService.list(),
  });
}

export function useTenancy(id: string) {
  return useQuery({
    queryKey: ["tenancies", id],
    queryFn: () => tenanciesService.getById(id),
    enabled: !!id,
  });
}

export function useCreateTenancy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tenanciesService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenancies"] });
    },
  });
}

export function useUpdateTenancy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      tenanciesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenancies"] });
    },
  });
}

export function useDeleteTenancy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tenanciesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenancies"] });
    },
  });
}

export function useRequestRenewal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leaseId, notes }: { leaseId: string; notes?: string }) =>
      tenanciesService.requestRenewal(leaseId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenancies"] });
    },
  });
}

export function useRenewTenancy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      leaseId,
      newEndDate,
      monthlyRent,
      notes,
    }: {
      leaseId: string;
      newEndDate: string;
      monthlyRent?: number;
      notes?: string;
    }) => tenanciesService.renew(leaseId, { new_end_date: newEndDate, monthly_rent: monthlyRent, notes }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tenancies"] });
      queryClient.invalidateQueries({ queryKey: ["tenancies", variables.leaseId] });
    },
  });
}
