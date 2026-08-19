import { api } from "../lib/api-client";

interface PaymentResponse {
  id: string;
  lease_id: string;
  tenant_id: string;
  manager_id?: string;
  tenant_name?: string;
  property_title?: string;
  amount: number;
  currency?: string;
  status: string;
  payment_type: string;
  due_date: string;
  paid_date: string | null;
  method: string | null;
  notes: string | null;
  transaction_id: string | null;
  recorded_by?: string;
  coverage_days?: number | null;
  frozen_monthly_rent?: number | null;
  created_at: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

interface PaymentCreateData {
  lease_id: string;
  amount: number;
  payment_type?: string;
  payment_method?: string;
  notes?: string;
  due_date?: string;
  paid_date?: string;
  status?: string;
}

export const paymentsService = {
  list: (
    skip = 0,
    limit = 100,
    filters: { lease_id?: string; tenant_id?: string } = {}
  ) => {
    const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
    if (filters.lease_id) params.set("lease_id", filters.lease_id);
    if (filters.tenant_id) params.set("tenant_id", filters.tenant_id);
    return api.get<PaginatedResponse<PaymentResponse>>(`/payments?${params.toString()}`);
  },

  getById: (id: string) =>
    api.get<PaymentResponse>(`/payments/${id}`),

  create: (data: PaymentCreateData) =>
    api.post<PaymentResponse>("/payments", data),

  update: (id: string, data: Record<string, unknown>) =>
    api.patch<PaymentResponse>(`/payments/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/payments/${id}`),
};
