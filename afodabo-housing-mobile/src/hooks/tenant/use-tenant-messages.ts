import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchTenantDashboard, markMessageRead, sendTenantMessage } from '../../services/tenant';
import type { TenantMessage } from '../../services/tenant';

interface TenantConversation {
  id: string;
  latestMessage: TenantMessage;
  messages: TenantMessage[];
  participantId: string;
  participantName: string;
  propertyId?: string;
  unreadCount: number;
}

export type { TenantConversation };

function buildConversations(messages: TenantMessage[], tenantUserId: string): TenantConversation[] {
  const conversationMap = new Map<string, TenantConversation>();

  messages.forEach((message) => {
    const incoming = message.sender_id !== tenantUserId;
    const participantId = incoming ? message.sender_id : message.receiver_id;
    const participantName = incoming
      ? message.sender_name || 'House Manager'
      : message.receiver_name || 'House Manager';
    const existing = conversationMap.get(participantId);

    if (!existing) {
      conversationMap.set(participantId, {
        id: participantId,
        latestMessage: message,
        messages: [message],
        participantId,
        participantName,
        propertyId: message.property_id ?? undefined,
        unreadCount: !message.is_read && incoming ? 1 : 0,
      });
      return;
    }

    existing.messages.push(message);

    if (
      new Date(message.created_at).getTime() > new Date(existing.latestMessage.created_at).getTime()
    ) {
      existing.latestMessage = message;
      existing.propertyId = message.property_id ?? existing.propertyId;
    }

    if (!message.is_read && incoming) {
      existing.unreadCount += 1;
    }
  });

  return Array.from(conversationMap.values())
    .map((conversation) => ({
      ...conversation,
      messages: conversation.messages
        .slice()
        .sort(
          (left, right) =>
            new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
        ),
    }))
    .sort(
      (left, right) =>
        new Date(right.latestMessage.created_at).getTime() -
        new Date(left.latestMessage.created_at).getTime(),
    );
}

export function useTenantMessages(userId?: string) {
  const query = useQuery({
    enabled: Boolean(userId),
    queryFn: () => fetchTenantDashboard(userId as string),
    queryKey: ['tenant-dashboard', userId],
  });

  return {
    ...query,
    conversations: userId ? buildConversations(query.data?.messages ?? [], userId) : [],
  };
}

export function useSendTenantMessage(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      content: string;
      propertyId?: string;
      receiverId: string;
      senderId: string;
    }) =>
      sendTenantMessage(payload.senderId, payload.receiverId, payload.content, payload.propertyId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['tenant-dashboard', userId],
      });
    },
  });
}

export function useMarkTenantMessageRead(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageIds: string[]) => {
      await Promise.all(messageIds.map((messageId) => markMessageRead(messageId)));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['tenant-dashboard', userId],
      });
    },
  });
}
