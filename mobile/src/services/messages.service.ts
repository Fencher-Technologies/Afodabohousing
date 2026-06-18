import type { MessageRow } from '../types/database';
import { mapLeaseToTenancyLike, type TenancyLikeRow } from './lease-mappers';
import { supabase } from './supabase';
import { fetchTenantRecordByUserId } from './tenant-identity.service';

export interface TenantMessage extends MessageRow {
  receiver_name?: string;
  sender_name?: string;
}

export interface TenantMessagesPayload {
  activeTenancy: TenancyLikeRow | null;
  messages: TenantMessage[];
}

export interface ManagerMessage extends MessageRow {
  property_title?: string;
  receiver_name?: string;
  sender_name?: string;
}

export interface ManagerConversation {
  id: string;
  lastMessage: ManagerMessage;
  messages: ManagerMessage[];
  participantId: string;
  participantName: string;
  propertyId: string | null;
  propertyTitle?: string;
  unreadCount: number;
}

export interface ManagerMessagesPayload {
  conversations: ManagerConversation[];
  messages: ManagerMessage[];
}

export async function fetchTenantMessages(userId: string): Promise<TenantMessagesPayload> {
  const tenantRecord = await fetchTenantRecordByUserId(userId);
  const leasesQuery = tenantRecord
    ? supabase
        .from('leases')
        .select('*')
        .eq('tenant_id', tenantRecord.id)
        .order('created_at', { ascending: false })
    : Promise.resolve({ data: [], error: null });

  const [leasesResult, messagesResult] = await Promise.all([
    leasesQuery,
    supabase
      .from('messages')
      .select('*')
      .or(`receiver_id.eq.${userId},sender_id.eq.${userId}`)
      .order('created_at', { ascending: true }),
  ]);

  if (messagesResult.error) {
    throw messagesResult.error;
  }

  if (leasesResult.error) {
    throw leasesResult.error;
  }

  const activeTenancy =
    (leasesResult.data ?? [])
      .map(mapLeaseToTenancyLike)
      .find((tenancy) => tenancy.status === 'active') ?? null;
  const messageRows = messagesResult.data ?? [];
  const messageUserIds = [
    ...new Set(messageRows.flatMap((message) => [message.sender_id, message.receiver_id])),
  ];

  const profileMap: Record<string, string> = {};
  if (messageUserIds.length > 0) {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', messageUserIds);

    if (error) {
      throw error;
    }

    data?.forEach((profile) => {
      profileMap[profile.user_id] = profile.full_name || 'User';
    });
  }

  return {
    activeTenancy,
    messages: messageRows.map((message) => ({
      ...message,
      receiver_name:
        message.receiver_id === userId ? 'You' : profileMap[message.receiver_id] || 'Manager',
      sender_name:
        message.sender_id === userId ? 'You' : profileMap[message.sender_id] || 'Manager',
    })),
  };
}

export async function sendTenantMessage(payload: {
  content: string;
  propertyId?: string;
  receiverId: string;
  senderId: string;
}) {
  const { error } = await supabase.from('messages').insert({
    content: payload.content,
    property_id: payload.propertyId ?? null,
    receiver_id: payload.receiverId,
    sender_id: payload.senderId,
  });

  if (error) {
    throw error;
  }
}

export async function markTenantMessagesRead(messageIds: string[]) {
  if (messageIds.length === 0) {
    return;
  }

  const { error } = await supabase.from('messages').update({ is_read: true }).in('id', messageIds);

  if (error) {
    throw error;
  }
}

export async function fetchManagerMessages(managerId: string): Promise<ManagerMessagesPayload> {
  const { data: messageRows, error: messagesError } = await supabase
    .from('messages')
    .select('*')
    .or(`receiver_id.eq.${managerId},sender_id.eq.${managerId}`)
    .order('created_at', { ascending: true });

  if (messagesError) {
    throw messagesError;
  }

  const messages = messageRows ?? [];
  const userIds = [
    ...new Set(messages.flatMap((message) => [message.sender_id, message.receiver_id])),
  ];
  const propertyIds = [
    ...new Set(
      messages
        .map((message) => message.property_id)
        .filter((propertyId): propertyId is string => Boolean(propertyId)),
    ),
  ];

  const profileMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', userIds);

    if (error) {
      throw error;
    }

    data?.forEach((profile) => {
      profileMap[profile.user_id] = profile.full_name || 'Tenant';
    });
  }

  const propertyMap: Record<string, string> = {};
  if (propertyIds.length > 0) {
    const { data, error } = await supabase
      .from('properties')
      .select('id, title')
      .eq('owner_id', managerId)
      .in('id', propertyIds);

    if (error) {
      throw error;
    }

    data?.forEach((property) => {
      propertyMap[property.id] = property.title;
    });
  }

  const enrichedMessages: ManagerMessage[] = messages.map((message) => ({
    ...message,
    property_title: message.property_id ? propertyMap[message.property_id] : undefined,
    receiver_name:
      message.receiver_id === managerId ? 'You' : profileMap[message.receiver_id] || 'Tenant',
    sender_name:
      message.sender_id === managerId ? 'You' : profileMap[message.sender_id] || 'Tenant',
  }));

  const conversationMap = new Map<string, ManagerConversation>();

  enrichedMessages.forEach((message) => {
    const participantId = message.sender_id === managerId ? message.receiver_id : message.sender_id;
    const participantName =
      message.sender_id === managerId
        ? message.receiver_name || 'Tenant'
        : message.sender_name || 'Tenant';
    const unreadIncrement = !message.is_read && message.receiver_id === managerId ? 1 : 0;
    const existingConversation = conversationMap.get(participantId);

    if (existingConversation) {
      existingConversation.messages.push(message);
      existingConversation.lastMessage = message;
      existingConversation.propertyId = message.property_id ?? existingConversation.propertyId;
      existingConversation.propertyTitle =
        message.property_title ?? existingConversation.propertyTitle;
      existingConversation.unreadCount += unreadIncrement;
      return;
    }

    conversationMap.set(participantId, {
      id: participantId,
      lastMessage: message,
      messages: [message],
      participantId,
      participantName,
      propertyId: message.property_id,
      propertyTitle: message.property_title,
      unreadCount: unreadIncrement,
    });
  });

  return {
    conversations: [...conversationMap.values()].sort(
      (left, right) =>
        new Date(right.lastMessage.created_at).getTime() -
        new Date(left.lastMessage.created_at).getTime(),
    ),
    messages: enrichedMessages,
  };
}

export async function sendManagerMessage(payload: {
  content: string;
  propertyId?: string | null;
  receiverId: string;
  senderId: string;
}) {
  const { error } = await supabase.from('messages').insert({
    content: payload.content,
    property_id: payload.propertyId ?? null,
    receiver_id: payload.receiverId,
    sender_id: payload.senderId,
  });

  if (error) {
    throw error;
  }
}

export async function markManagerMessagesRead(payload: {
  managerId: string;
  messageIds: string[];
}) {
  if (payload.messageIds.length === 0) {
    return;
  }

  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('receiver_id', payload.managerId)
    .in('id', payload.messageIds);

  if (error) {
    throw error;
  }
}
