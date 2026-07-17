import { api } from "../lib/api-client";

import type {
  DuePaymentsResponse,
  FinancialSummary,
  OutstandingResponse,
  PaymentHistoryResponse,
  RentCollectionResponse,
  TenantReportResponse,
  TenantStatement,
} from "../types";

export interface ReportQuery {
  property_id?: string;
  tenant_id?: string;
  status?: string;
  from?: string;
  to?: string;
  skip?: number;
  limit?: number;
}

function buildQuery(params: ReportQuery): string {
  const q: string[] = [];
  if (params.property_id) q.push(`property_id=${encodeURIComponent(params.property_id)}`);
  if (params.tenant_id) q.push(`tenant_id=${encodeURIComponent(params.tenant_id)}`);
  if (params.status) q.push(`status=${encodeURIComponent(params.status)}`);
  if (params.from) q.push(`from=${encodeURIComponent(params.from)}`);
  if (params.to) q.push(`to=${encodeURIComponent(params.to)}`);
  if (params.skip !== undefined) q.push(`skip=${params.skip}`);
  if (params.limit !== undefined) q.push(`limit=${params.limit}`);
  return q.length ? `?${q.join("&")}` : "";
}

export const reportsService = {
  getTenantsReport: (query: ReportQuery = {}) =>
    api.get<TenantReportResponse>(`/reports/tenants${buildQuery(query)}`),

  getOutstandingReport: (query: ReportQuery = {}) =>
    api.get<OutstandingResponse>(`/reports/outstanding${buildQuery(query)}`),

  getTenantStatement: (tenantId: string) =>
    api.get<TenantStatement>(`/reports/tenant/${tenantId}`),

  getRentCollection: (query: ReportQuery = {}) =>
    api.get<RentCollectionResponse>(`/reports/rent-collection${buildQuery(query)}`),

  getSummary: () => api.get<FinancialSummary>("/reports/summary"),

  getDuePayments: (filter: "overdue" | "due_soon" | "paid" = "overdue", query: ReportQuery = {}) =>
    api.get<DuePaymentsResponse>(
      `/reports/due-payments?filter=${filter}${buildQuery(query).replace("?", "&")}`
    ),

  getPaymentHistory: (query: ReportQuery = {}) =>
    api.get<PaymentHistoryResponse>(`/reports/payment-history${buildQuery(query)}`),
};
