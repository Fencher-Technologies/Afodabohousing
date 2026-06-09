import { useMutation, useQueryClient } from '@tanstack/react-query';
import { attachTenantPaymentProof } from '../../services/payments.service';
import { uploadPaymentProof, type UploadAsset } from '../../services/uploads.service';

interface UploadPaymentProofPayload {
  asset: UploadAsset;
  paymentId: string;
  userId: string;
}

export function useUploadPaymentProof() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ asset, paymentId, userId }: UploadPaymentProofPayload) => {
      const proofPath = await uploadPaymentProof(userId, asset);
      await attachTenantPaymentProof({
        paymentId,
        proofPath,
        userId,
      });
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: ['tenant-payments', variables.userId],
      });
      await queryClient.invalidateQueries({
        queryKey: ['tenant-dashboard', variables.userId],
      });
    },
  });
}
