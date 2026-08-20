import { api } from "../lib/api-client";

export interface LeaseResponse {
  id: string;
  owner_id: string;
  property_id: string;
  tenant_id: string;
  monthly_rent: number;
  status: string;
  effective_status?: string | null;
  start_date: string;
  end_date: string;
  unit_label?: string | null;
  security_deposit?: number;
  created_at: string;
  // Server-enriched fields
  tenant_name?: string | null;
  tenant_phone?: string | null;
  tenant_email?: string | null;
  property_title?: string | null;
  property_image?: string | null;
  balance_due?: number | null;
  total_paid?: number | null;
  is_overdue?: boolean | null;
  // Coverage-first money fields (server-enriched; `balance_due`,
  // `expected_rent` and `tenant_credit` are deprecated aliases).
  rent_accrued?: number | null;
  arrears_amount?: number | null;
  advance_amount?: number | null;
  contract_rent?: number | null;
  expected_rent?: number | null;
  tenant_credit?: number | null;
  last_payment_date?: string | null;
  last_payment_amount?: number | null;
  last_payment_method?: string | null;
  // Manager / owner contact (enriched server-side via owner_id)
  manager_name?: string | null;
  manager_phone?: string | null;
  manager_email?: string | null;
  // Rent coverage tracking (server-enriched)
  rent_effective_date?: string | null;
  paid_until_date?: string | null;
  rent_days_remaining?: number | null;
  rent_days_in_arrears?: number | null;
  next_payment_due_date?: string | null;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

interface LeaseCreateData {
  property_id: string;
  tenant_id: string;
  monthly_rent: number;
  start_date: string;
  end_date: string;
  unit_label?: string;
  security_deposit?: number;
  status?: string;
}

interface RenewalRequestResponse {
  success: boolean;
  message: string;
}

export interface RenewalHistoryItem {
  id: string;
  previous_end_date?: string | null;
  new_end_date: string;
  monthly_rent?: number | null;
  notes?: string | null;
  renewed_by?: string | null;
  renewed_by_name?: string | null;
  renewed_at?: string | null;
}

export const tenanciesService = {
  list: (skip = 0, limit = 100) =>
    api.get<PaginatedResponse<LeaseResponse>>(`/leases?skip=${skip}&limit=${limit}`),

  getById: (id: string) =>
    api.get<LeaseResponse>(`/leases/${id}`),

  create: (data: LeaseCreateData) =>
    api.post<LeaseResponse>("/leases", data),

  update: (id: string, data: Record<string, unknown>) =>
    api.patch<LeaseResponse>(`/leases/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/leases/${id}`),

  requestRenewal: (leaseId: string, notes?: string) =>
    api.post<RenewalRequestResponse>(`/leases/${leaseId}/renewal-request`, { notes }),

  renew: (leaseId: string, payload: { new_end_date: string; notes?: string }) =>
    api.post<LeaseResponse>(`/leases/${leaseId}/renew`, payload),

  renewalHistory: (leaseId: string) =>
    api.get<RenewalHistoryItem[]>(`/leases/${leaseId}/renewal-history`),

  terminate: (leaseId: string, reason?: string) =>
    api.post<LeaseResponse>(`/leases/${leaseId}/terminate`, { reason }),

  setEffectiveDate: (leaseId: string, rentEffectiveDate: string) =>
    api.patch<LeaseResponse>(`/leases/${leaseId}/effective-date`, { rent_effective_date: rentEffectiveDate }),
};
