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
  balance_after: number;
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

interface NylonPayInitiateRequest {
  amount: number;
  phone_number: string;
  email?: string;
  description: string;
  payment_id: string;
  first_name: string;
  last_name: string;
}

interface NylonPayInitiateResponse {
  success: boolean;
  reference?: string;
  status?: string;
  message: string;
}

export const paymentsService = {
  list: (skip = 0, limit = 100) =>
    api.get<PaginatedResponse<PaymentResponse>>(`/payments?skip=${skip}&limit=${limit}`),

  getById: (id: string) =>
    api.get<PaymentResponse>(`/payments/${id}`),

  create: (data: PaymentCreateData) =>
    api.post<PaymentResponse>("/payments", data),

  update: (id: string, data: Record<string, unknown>) =>
    api.patch<PaymentResponse>(`/payments/${id}`, data),

  delete: (id: string) =>
    api.delete<void>(`/payments/${id}`),

  initiateNylonPay: (data: NylonPayInitiateRequest) =>
    api.post<NylonPayInitiateResponse>("/payments/initiate-nylonpay", data),
};
