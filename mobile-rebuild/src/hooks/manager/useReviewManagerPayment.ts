import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  confirmManagerPayment,
  rejectManagerPayment,
} from '../../services/manager-payments.service';

interface ReviewPaymentPayload {
  managerId: string;
  paymentId: string;
}

export function useConfirmManagerPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: confirmManagerPayment,
    onSuccess: async (_data, variables: ReviewPaymentPayload) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['manager-payments', variables.managerId] }),
        queryClient.invalidateQueries({ queryKey: ['manager-dashboard', variables.managerId] }),
      ]);
    },
  });
}

export function useRejectManagerPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rejectManagerPayment,
    onSuccess: async (_data, variables: ReviewPaymentPayload) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['manager-payments', variables.managerId] }),
        queryClient.invalidateQueries({ queryKey: ['manager-dashboard', variables.managerId] }),
      ]);
    },
  });
}
