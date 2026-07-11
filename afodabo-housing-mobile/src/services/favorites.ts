import { apiRequest } from './backend-api';

export interface Bookmark {
  created_at: string;
  id: string;
  property_id: string;
  user_id: string;
}

export async function fetchBookmarks(): Promise<Bookmark[]> {
  return apiRequest<Bookmark[]>('/bookmarks', { auth: true });
}

export async function addBookmark(propertyId: string): Promise<Bookmark> {
  return apiRequest<Bookmark>(`/bookmarks/${propertyId}`, {
    auth: true,
    method: 'POST',
  });
}

export async function removeBookmark(propertyId: string): Promise<void> {
  await apiRequest(`/bookmarks/${propertyId}`, {
    auth: true,
    method: 'DELETE',
  });
}

export async function checkBookmark(propertyId: string): Promise<{ bookmarked: boolean }> {
  return apiRequest<{ bookmarked: boolean }>(`/bookmarks/check/${propertyId}`, {
    auth: true,
  });
}
