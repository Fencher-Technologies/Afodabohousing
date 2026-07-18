import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { paymentsService } from "../services/payments";
import type { Payment } from "../types";

export function usePaymentList() {
  return useQuery({
    queryKey: ["payments"],
    queryFn: () => paymentsService.list(),
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

export function useInitiateNylonPay() {
  return useMutation({
    mutationFn: paymentsService.initiateNylonPay,
  });
}
