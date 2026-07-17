import { useCallback, useState } from "react";
import { useQueryClient, type QueryKey, type QueryObserverResult } from "@tanstack/react-query";

type RefetchFn = () => Promise<QueryObserverResult | void> | QueryObserverResult | void;

/**
 * Reusable pull-to-refresh helper built on TanStack Query.
 *
 * Pass either:
 *  - `queryKeys`: keys to invalidate (preferred — the cache coordinates a
 *    single fetch per key, so mounted screens sharing a key won't double-call
 *    the backend), or
 *  - `refetches`: explicit `refetch()` functions from one or more `useQuery` calls.
 *
 * Returns `{ refreshing, onRefresh }` ready to drop into a `RefreshControl`.
 * `refreshing` tracks the in-flight promise and clears on both success and error.
 */
export function useRefresh(opts: { queryKeys?: QueryKey[]; refetches?: RefetchFn[] } = {}) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (opts.queryKeys && opts.queryKeys.length > 0) {
        await Promise.all(
          opts.queryKeys.map((key) =>
            queryClient.invalidateQueries({ queryKey: key, refetchType: "active" })
          )
        );
      } else if (opts.refetches && opts.refetches.length > 0) {
        await Promise.all(opts.refetches.map((fn) => fn()));
      }
    } catch {
      // Swallow: the spinner must always clear, and errors surface via each
      // query's own error state / ErrorState UI.
    } finally {
      setRefreshing(false);
    }
  }, [opts.queryKeys, opts.refetches, queryClient]);

  return { refreshing, onRefresh };
}
