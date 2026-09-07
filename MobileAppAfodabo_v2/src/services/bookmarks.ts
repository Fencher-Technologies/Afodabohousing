/**
 * Saved properties (bookmarks).
 *
 * The backend has had bookmarks all along and the web app uses them, but the
 * mobile bookmark button was local state only — tapping it filled the icon and
 * nothing was stored, so the choice vanished on navigation.
 */

import { api } from "../lib/api-client";
import type { BackendProperty } from "../types";

export interface Bookmark {
  id: string;
  user_id: string;
  property_id: string;
  created_at: string;
  property?: BackendProperty | null;
}

export const bookmarksService = {
  list: () => api.get<Bookmark[]>("/bookmarks"),

  add: (propertyId: string) => api.post<Bookmark>(`/bookmarks/${propertyId}`, {}),

  remove: (propertyId: string) => api.delete<void>(`/bookmarks/${propertyId}`),

  check: (propertyId: string) =>
    api.get<{ bookmarked: boolean }>(`/bookmarks/check/${propertyId}`),
};
