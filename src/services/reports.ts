import { apiGet } from './api';

export interface FinancialSummary {
  total_expected: number;
  total_collected: number;
  total_outstanding: number;
  total_tenant_credit: number;
  active_tenancies: number;
  expired_tenancies: number;
  terminated_tenancies: number;
  occupancy_rate: number;
}

export interface RentCollection {
  period_from: string | null;
  period_to: string | null;
  total_expected: number;
  total_collected: number;
  total_outstanding: number;
  total_tenant_credit: number;
  collection_percentage: number;
  tenants_paid_in_full: number;
  tenants_with_balance: number;
  total_tenants: number;
}

export interface OutstandingItem {
  tenant_id: string;
  tenant_name: string | null;
  tenant_phone: string | null;
  property_title: string | null;
  unit_label: string | null;
  status: string;
  expected_rent: number;
  total_paid: number;
  balance_due: number;
  last_payment_date: string | null;
  last_payment_method: string | null;
  lease_id: string;
}

export interface OutstandingResponse {
  items: OutstandingItem[];
  total: number;
  total_outstanding: number;
}

export interface PaymentHistoryItem {
  id: string;
  date: string | null;
  tenant_name: string | null;
  property_title: string | null;
  amount: number;
  method: string | null;
  status: string;
  lease_id: string;
}

export interface PaymentHistoryResponse {
  items: PaymentHistoryItem[];
  summary: {
    total_collected: number;
    payment_count: number;
    period_from: string | null;
    period_to: string | null;
  };
  total: number;
}

export async function getFinancialSummary(): Promise<FinancialSummary> {
  return apiGet('/reports/summary');
}

export async function getRentCollection(from?: string, to?: string): Promise<RentCollection> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString();
  return apiGet(`/reports/rent-collection${qs ? '?' + qs : ''}`);
}

export async function getOutstanding(skip = 0, limit = 100): Promise<OutstandingResponse> {
  return apiGet(`/reports/outstanding?skip=${skip}&limit=${limit}`);
}

export async function getPaymentHistory(from?: string, to?: string): Promise<PaymentHistoryResponse> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString();
  return apiGet(`/reports/payment-history${qs ? '?' + qs : ''}`);
}

export function downloadExportUrl(format: 'csv' | 'xlsx', resource: string): string {
  const base = import.meta.env.VITE_API_URL || '';
  return `${base}/exports/${resource}?format=${format}`;
}
