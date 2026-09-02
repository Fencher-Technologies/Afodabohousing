import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { paymentsService } from "../services/payments";
import type { Payment } from "../types";

export function usePaymentList(filters: { leaseId?: string; tenantId?: string } = {}) {
  return useQuery({
    queryKey: ["payments", filters],
    queryFn: () =>
      paymentsService.list(0, 100, {
        lease_id: filters.leaseId,
        tenant_id: filters.tenantId,
      }),
    staleTime: 30_000,
  });
}

export function usePayment(id: string) {
  return useQuery<Payment>({
    queryKey: ["payments", id],
    queryFn: () => paymentsService.getById(id) as Promise<Payment>,
    enabled: !!id,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: paymentsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["tenancies"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      paymentsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["tenancies"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => paymentsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["tenancies"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}


