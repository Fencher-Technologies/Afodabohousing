import type { MessageRow, PaymentInsert, PaymentRow, TenancyRow } from '../types/supabase';
import { apiRequest, type PaginatedResponse } from './backend-api';
import {
  buildProofNote,
  mapBackendLeaseToTenancyRow,
  mapBackendMessage,
  mapBackendPaymentToPaymentRow,
  mapBackendPropertyToPropertyRow,
} from './backend-mappers';
import { extractPaymentProofUrlFromNotes } from './platform';

export interface TenantTenancy extends TenancyRow {
  manager_name?: string;
  manager_phone?: string;
  property_title?: string;
}

export interface TenantMessage extends MessageRow {
  receiver_name?: string;
  sender_name?: string;
}

export interface TenantDashboardPayload {
  messages: TenantMessage[];
  payments: PaymentRow[];
  tenancies: TenantTenancy[];
}

export async function fetchTenantDashboard(userId: string): Promise<TenantDashboardPayload> {
  void userId;
  const [tenanciesResponse, paymentsResponse, messagesResponse] = await Promise.all([
    apiRequest<
      PaginatedResponse<{
        created_at: string;
        end_date: string;
        id: string;
        monthly_rent: number | string;
        owner_id: string;
        property_id: string;
        start_date: string;
        status: string;
        tenant_id: string;
        updated_at: string;
      }>
    >('/leases', {
      auth: true,
      query: { limit: 100, skip: 0 },
    }),
    apiRequest<
      PaginatedResponse<{
        amount: number | string;
        created_at: string;
        due_date: string;
        id: string;
        lease_id: string;
        notes?: string | null;
        paid_date?: string | null;
        payment_method?: string | null;
        status: string;
        tenant_id: string;
        transaction_id?: string | null;
        updated_at: string;
      }>
    >('/payments', {
      auth: true,
      query: { limit: 100, skip: 0 },
    }),
    apiRequest<
      PaginatedResponse<{
        content: string | null;
        created_at: string;
        id: string;
        is_read: boolean;
        property_id?: string | null;
        receiver_id: string;
        receiver_name?: string | null;
        sender_id: string;
        sender_name?: string | null;
      }>
    >('/messages', {
      auth: true,
      query: { limit: 100, skip: 0 },
    }),
  ]);

  const tenancies = tenanciesResponse.items.map(mapBackendLeaseToTenancyRow);
  const propertyIds = [...new Set(tenancies.map((item) => item.property_id))];
  const propertyResults = await Promise.allSettled(
    propertyIds.map(async (propertyId) =>
      apiRequest<{
        address: string;
        amenities?: string[] | null;
        bathrooms: number;
        bedrooms: number;
        city: string;
        created_at: string;
        description?: string | null;
        id: string;
        images?: string[] | null;
        monthly_rent: number | string;
        owner_id: string;
        property_type: string;
        state: string;
        status: string;
        updated_at: string;
        zip_code?: string;
      }>(`/properties/public/${propertyId}`),
    ),
  );

  const propertyMap = propertyResults.reduce<Record<string, string>>((accumulator, result) => {
    if (result.status !== 'fulfilled') {
      return accumulator;
    }

    const mapped = mapBackendPropertyToPropertyRow(result.value);
    accumulator[mapped.id] = mapped.title;
    return accumulator;
  }, {});

  return {
    messages: messagesResponse.items
      .slice()
      .reverse()
      .map((message) => mapBackendMessage<TenantMessage>(message)),
    payments: paymentsResponse.items.map((payment) => {
      const tenancy = tenancies.find((item) => item.id === payment.lease_id) ?? null;
      return mapBackendPaymentToPaymentRow(payment, {
        proofUrl: extractPaymentProofUrlFromNotes(payment.notes),
        tenancy,
      });
    }),
    tenancies: tenancies.map((tenancy) => ({
      ...tenancy,
      property_title: propertyMap[tenancy.property_id],
      manager_name: undefined,
      manager_phone: undefined,
    })),
  };
}

export async function createTenantPayment(payload: PaymentInsert) {
  await apiRequest('/payments', {
    auth: true,
    body: {
      amount: payload.amount,
      due_date: payload.period_end,
      lease_id: payload.tenancy_id,
      notes: payload.notes,
      paid_date: null,
      payment_method: 'mobile',
      payment_type: 'rent',
      status: payload.status,
      tenant_id: payload.tenant_id,
      transaction_id: null,
    },
    method: 'POST',
  });
}

export async function sendTenantMessage(
  senderId: string,
  receiverId: string,
  content: string,
  propertyId?: string,
) {
  void senderId;
  await apiRequest('/messages', {
    auth: true,
    body: {
      content,
      property_id: propertyId ?? null,
      receiver_id: receiverId,
    },
    method: 'POST',
  });
}

export async function markMessageRead(messageId: string) {
  await apiRequest(`/messages/${messageId}`, {
    auth: true,
    body: { is_read: true },
    method: 'PATCH',
  });
}

export async function initiatePesapalPayment(payload: {
  amount: number;
  description: string;
  email?: string;
  firstName: string;
  lastName: string;
  paymentId: string;
  phone: string;
}) {
  return apiRequest<{
    error?: string;
    order_id?: string | null;
    order_tracking_id?: string | null;
    redirect_url?: string | null;
    success: boolean;
  }>('/payments/initiate-pesapal', {
    auth: true,
    body: {
      amount: payload.amount,
      callback_url: 'https://afodabohousing.com/payment/callback',
      currency: 'UGX',
      description: payload.description,
      email: payload.email,
      first_name: payload.firstName,
      last_name: payload.lastName,
      payment_id: payload.paymentId,
      phone: payload.phone,
    },
    method: 'POST',
  });
}

export function buildTenantPaymentProofNote(
  notes: string | null | undefined,
  proofPath: string | null | undefined,
) {
  return buildProofNote(notes, proofPath);
}
