import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { paymentVerificationsService } from "../services/payment-verifications";

export function useMySubmissions(status?: string) {
  return useQuery({
    queryKey: ["my-payment-verifications", status],
    queryFn: () => paymentVerificationsService.getMySubmissions(status),
  });
}

export function useOwnerSubmissions(status?: string, search?: string) {
  return useQuery({
    queryKey: ["owner-payment-verifications", status, search],
    queryFn: () => paymentVerificationsService.getOwnerSubmissions(status, search),
  });
}

export function useCreateVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: paymentVerificationsService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-payment-verifications"] });
    },
  });
}

export function useApproveVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => paymentVerificationsService.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owner-payment-verifications"] });
      qc.invalidateQueries({ queryKey: ["my-payment-verifications"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["tenancies"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      // A receipt is issued on approval; without this the tenant waits out
      // the receipts staleTime before seeing it.
      qc.invalidateQueries({ queryKey: ["receipts"] });
    },
  });
}

export function useRejectVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      paymentVerificationsService.reject(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["owner-payment-verifications"] });
      qc.invalidateQueries({ queryKey: ["my-payment-verifications"] });
    },
  });
}
