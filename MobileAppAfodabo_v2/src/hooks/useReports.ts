import { useQuery } from "@tanstack/react-query";

import { reportsService, type ReportQuery } from "../services/reports";

export function useTenantsReport(query: ReportQuery = {}, enabled = true) {
  return useQuery({
    queryKey: ["reports", "tenants", query],
    queryFn: () => reportsService.getTenantsReport(query),
    enabled,
  });
}

export function useOutstandingReport(query: ReportQuery = {}, enabled = true) {
  return useQuery({
    queryKey: ["reports", "outstanding", query],
    queryFn: () => reportsService.getOutstandingReport(query),
    enabled,
  });
}

export function useTenantStatement(tenantId: string | null) {
  return useQuery({
    queryKey: ["reports", "statement", tenantId],
    queryFn: () => reportsService.getTenantStatement(tenantId as string),
    enabled: !!tenantId && tenantId !== "null",
  });
}

export function useRentCollection(query: ReportQuery = {}, enabled = true) {
  return useQuery({
    queryKey: ["reports", "rent-collection", query],
    queryFn: () => reportsService.getRentCollection(query),
    enabled,
  });
}

export function useFinancialSummary(enabled = true) {
  return useQuery({
    queryKey: ["reports", "summary"],
    queryFn: () => reportsService.getSummary(),
    enabled,
  });
}

export function useDuePayments(filter: "overdue" | "due_soon" | "paid" = "overdue", query: ReportQuery = {}) {
  return useQuery({
    queryKey: ["reports", "due-payments", filter, query],
    queryFn: () => reportsService.getDuePayments(filter, query),
  });
}

export function usePaymentHistory(query: ReportQuery = {}, enabled = true) {
  return useQuery({
    queryKey: ["reports", "payment-history", query],
    queryFn: () => reportsService.getPaymentHistory(query),
    enabled,
  });
}
