import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchManagerMessages,
  markManagerMessageRead,
  sendManagerMessage,
  type ManagerMessage,
} from '../../services/manager';

interface ManagerConversation {
  id: string;
  latestMessage: ManagerMessage;
  messages: ManagerMessage[];
  participantId: string;
  participantName: string;
  propertyId?: string;
  propertyTitle?: string;
  unreadCount: number;
}

function buildConversations(messages: ManagerMessage[], managerId: string): ManagerConversation[] {
  const conversationMap = new Map<string, ManagerConversation>();

  messages.forEach((message) => {
    const incoming = message.sender_id !== managerId;
    const participantId = incoming ? message.sender_id : message.receiver_id;
    const participantName = incoming
      ? message.sender_name || 'Tenant'
      : message.receiver_name || 'Tenant';
    const existing = conversationMap.get(participantId);

    if (!existing) {
      conversationMap.set(participantId, {
        id: participantId,
        latestMessage: message,
        messages: [message],
        participantId,
        participantName,
        propertyId: message.property_id ?? undefined,
        propertyTitle: message.property_title ?? undefined,
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
      existing.propertyTitle = message.property_title ?? existing.propertyTitle;
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

export function useManagerMessages(userId?: string) {
  const query = useQuery({
    enabled: Boolean(userId),
    queryFn: () => fetchManagerMessages(),
    queryKey: ['manager-messages', userId],
  });

  const conversations = useMemo(
    () => (userId ? buildConversations(query.data ?? [], userId) : []),
    [query.data, userId],
  );

  return {
    ...query,
    conversations,
    messages: query.data ?? [],
  };
}

export function useSendManagerMessage(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      content: string;
      propertyId?: string;
      receiverId: string;
      voiceNoteUrl?: string;
    }) =>
      sendManagerMessage({
        content: payload.content,
        property_id: payload.propertyId ?? null,
        receiver_id: payload.receiverId,
        sender_id: userId as string,
        voice_note_url: payload.voiceNoteUrl,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['manager-messages', userId],
      });
    },
  });
}

export function useMarkManagerMessagesRead(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageIds: string[]) => {
      await Promise.all(messageIds.map((messageId) => markManagerMessageRead(messageId)));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['manager-messages', userId],
      });
    },
  });
}
