import { useQuery } from "@tanstack/react-query";

import { propertiesService } from "../services/properties";
import { tenanciesService } from "../services/tenancies";
import { reportsService } from "../services/reports";
import type { LeaseResponse } from "../services/tenancies";

export interface DashboardStats {
  total_properties: number;
  total_tenancies: number;
  active_tenants: number;
  overdue_count: number;
  collected_this_month: number;
  collected_total: number;
  pending_review_count: number;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      // Totals come from the backend summary endpoint, which aggregates over
      // every lease and payment the manager owns. Computing them here from
      // the first 100 rows silently under-reported once a manager grew past
      // one page of data.
      const [propertiesRes, tenanciesRes, summary] = await Promise.all([
        propertiesService.list(0, 1),
        tenanciesService.list(0, 100),
        reportsService.getSummary(),
      ]);

      const tenanciesList = tenanciesRes.items;

      // Client-side fallbacks in case an older backend without the new
      // summary fields is still deployed.
      const activeTenants = summary.active_tenancies ??
        tenanciesList.filter((t) => (t.effective_status ?? t.status) === "active").length;
      const overdue = summary.overdue_tenancies ??
        tenanciesList.filter((t) => {
          const status = t.effective_status ?? t.status;
          // Overdue is a money-ledger signal: arrears exist (not a
          // coverage-days display field).
          return status !== "terminated" && ((t.arrears_amount ?? 0) > 0 || t.is_overdue === true);
        }).length;

      const stats: DashboardStats = {
        total_properties: propertiesRes.total,
        total_tenancies: tenanciesRes.total,
        active_tenants: activeTenants,
        overdue_count: overdue,
        collected_this_month: summary.collected_this_month ?? 0,
        collected_total: summary.total_collected ?? 0,
        pending_review_count: 0,
      };
      // The full tenancy list rides along so the home screen doesn't fetch the
      // same 100-row payload a second time for its "needs attention" list.
      // Consumers map through fromBackendLease themselves (as home.tsx does).
      return { stats, tenancies: tenanciesList };
    },
    staleTime: 30_000,
  });
}
