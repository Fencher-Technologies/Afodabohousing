/** Saved-property hooks. */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { bookmarksService } from "@/src/services/bookmarks";

export function useBookmarks(enabled = true) {
  return useQuery({
    queryKey: ["bookmarks"],
    queryFn: () => bookmarksService.list(),
    enabled,
  });
}

export function useIsBookmarked(propertyId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["bookmarks", "check", propertyId],
    queryFn: () => bookmarksService.check(propertyId as string),
    enabled: !!propertyId && enabled,
  });
}

export function useToggleBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ propertyId, bookmarked }: { propertyId: string; bookmarked: boolean }) => {
      if (bookmarked) {
        await bookmarksService.remove(propertyId);
      } else {
        await bookmarksService.add(propertyId);
      }
    },
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ["bookmarks"] });
      qc.invalidateQueries({ queryKey: ["bookmarks", "check", v.propertyId] });
    },
  });
}
