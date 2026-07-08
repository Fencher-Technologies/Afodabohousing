import { apiRequest } from './backend-api';

export interface AppNotification {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

interface PaginatedNotificationsResponse {
  notifications: AppNotification[];
  total: number;
}

interface UnreadCountResponse {
  count: number;
}

export async function fetchNotifications(): Promise<PaginatedNotificationsResponse> {
  return apiRequest<PaginatedNotificationsResponse>('/notifications', { auth: true });
}

export async function fetchUnreadCount(): Promise<number> {
  const response = await apiRequest<UnreadCountResponse>('/notifications/unread-count', {
    auth: true,
  });
  return response.count;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiRequest(`/notifications/${id}`, {
    auth: true,
    method: 'PATCH',
  });
}
