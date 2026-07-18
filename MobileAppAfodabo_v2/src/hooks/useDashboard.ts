import { useQuery } from "@tanstack/react-query";

import { propertiesService } from "../services/properties";
import { tenanciesService } from "../services/tenancies";
import { paymentsService } from "../services/payments";

interface DashboardStats {
  total_properties: number;
  total_tenancies: number;
  active_tenants: number;
  overdue_count: number;
  collected_this_month: number;
  pending_review_count: number;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async (): Promise<DashboardStats> => {
      const [propertiesRes, tenanciesRes, paymentsRes] = await Promise.all([
        propertiesService.list(0, 1),
        tenanciesService.list(0, 100),
        paymentsService.list(0, 100),
      ]);

      const tenanciesList = tenanciesRes.items;

      const overdue = tenanciesList.filter((t) => {
        const endDate = new Date(t.end_date);
        return t.status === "active" && endDate < new Date();
      }).length;

      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const collected = paymentsRes.items
        .filter((p) => p.status === "confirmed" && new Date(p.created_at) >= thisMonth)
        .reduce((sum, p) => sum + p.amount, 0);

      return {
        total_properties: propertiesRes.total,
        total_tenancies: tenanciesRes.total,
        active_tenants: tenanciesRes.total,
        overdue_count: overdue,
        collected_this_month: collected,
        pending_review_count: 0,
      };
    },
    staleTime: 30_000,
  });
}
