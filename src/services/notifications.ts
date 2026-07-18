import { apiGet, apiPatch } from './api';

export interface NotificationData {
  id: string;
  user_id: string;
  title: string;
  body?: string;
  type?: string;
  read: boolean;
  created_at: string;
}

export async function listNotifications(): Promise<NotificationData[]> {
  return apiGet('/notifications');
}

export async function unreadCount(): Promise<{ count: number }> {
  return apiGet('/notifications/unread-count');
}

export async function markRead(id: string): Promise<void> {
  await apiPatch(`/notifications/${id}`, { read: true });
}
