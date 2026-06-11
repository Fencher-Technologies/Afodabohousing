import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchManagerMessages,
  markManagerMessagesRead,
  sendManagerMessage,
} from '../../services/messages.service';

export function useManagerMessages(managerId?: string) {
  return useQuery({
    enabled: Boolean(managerId),
    queryFn: () => fetchManagerMessages(managerId as string),
    queryKey: ['manager-messages', managerId],
  });
}

export function useSendManagerMessage(managerId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendManagerMessage,
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['manager-messages', managerId] }),
        queryClient.invalidateQueries({ queryKey: ['manager-dashboard', managerId] }),
        queryClient.invalidateQueries({ queryKey: ['tenant-messages', variables.receiverId] }),
      ]);
    },
  });
}

export function useMarkManagerMessagesRead(managerId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markManagerMessagesRead,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['manager-messages', managerId] }),
        queryClient.invalidateQueries({ queryKey: ['manager-dashboard', managerId] }),
      ]);
    },
  });
}
