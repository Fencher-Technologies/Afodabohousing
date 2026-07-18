import { api } from "../lib/api-client";

interface NotificationItem {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export const notificationsService = {
  list: (skip = 0, limit = 50) =>
    api.get<PaginatedResponse<NotificationItem>>(`/notifications?skip=${skip}&limit=${limit}`),

  markRead: (id: string) =>
    api.patch<NotificationItem>(`/notifications/${id}`, { read: true }),

  markAllRead: () =>
    api.post<{ message: string }>("/notifications/mark-all-read"),
};
