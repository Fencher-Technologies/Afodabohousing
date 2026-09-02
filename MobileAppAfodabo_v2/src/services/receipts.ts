import { api } from "../lib/api-client";

export interface Receipt {
  id: string;
  receipt_number: string;
  payment_id: string;
  lease_id: string | null;
  tenant_id: string | null;
  tenant_name: string | null;
  property_title: string | null;
  property_address: string | null;
  unit_label: string | null;
  manager_name: string | null;
  amount: number;
  currency: string;
  payment_method: string | null;
  payment_type: string;
  payment_date: string | null;
  transaction_reference: string | null;
  coverage_days: number | null;
  status: "active" | "voided";
  created_at: string;
}

interface ReceiptListResponse {
  items: Receipt[];
  total: number;
}

export const receiptsService = {
  /** Receipts for the signed-in tenant. */
  listMine: (status?: string) =>
    api.get<ReceiptListResponse>(`/receipts/my${status ? `?status=${status}` : ""}`),

  /** Receipts across the signed-in manager's leases. */
  listOwner: (status?: string) =>
    api.get<ReceiptListResponse>(`/receipts${status ? `?status=${status}` : ""}`),

  getById: (id: string) => api.get<Receipt>(`/receipts/${id}`),

  void: (id: string) => api.post<Receipt>(`/receipts/${id}/void`, {}),
};
