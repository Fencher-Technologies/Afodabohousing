import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchTenantMessages,
  markTenantMessagesRead,
  sendTenantMessage,
} from '../../services/messages.service';

export function useTenantMessages(userId?: string) {
  return useQuery({
    enabled: Boolean(userId),
    queryFn: () => fetchTenantMessages(userId as string),
    queryKey: ['tenant-messages', userId],
  });
}

export function useSendTenantMessage(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendTenantMessage,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['tenant-messages', userId],
      });
    },
  });
}

export function useMarkTenantMessagesRead(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markTenantMessagesRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['tenant-messages', userId],
      });
    },
  });
}
