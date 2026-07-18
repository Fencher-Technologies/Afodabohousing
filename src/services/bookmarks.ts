import { apiGet, apiPost, apiDelete } from './api';

export interface BookmarkData {
  id: string;
  user_id: string;
  property_id: string;
  created_at: string;
  properties?: any;
}

export async function listBookmarks(): Promise<BookmarkData[]> {
  return apiGet('/bookmarks');
}

export async function addBookmark(propertyId: string): Promise<BookmarkData> {
  return apiPost(`/bookmarks/${propertyId}`);
}

export async function removeBookmark(propertyId: string): Promise<void> {
  await apiDelete(`/bookmarks/${propertyId}`);
}

export async function checkBookmark(propertyId: string): Promise<{ bookmarked: boolean }> {
  return apiGet(`/bookmarks/check/${propertyId}`);
}
