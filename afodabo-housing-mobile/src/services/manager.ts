import { sendSmsMessage } from './platform';
import {
  fetchAgreementConsentState,
  type AgreementConsentState,
} from './agreements';
import type {
  MessageInsert,
  MessageRow,
  PaymentRow,
  PropertyInsert,
  PropertyRow,
  RentalUnitInsert,
  RentalUnitRow,
  TenancyInsert,
  TenancyRow,
} from '../types/supabase';
import { apiRequest, type PaginatedResponse } from './backend-api';
import type { ListFilters } from '../components/advanced-filter-modal';
import {
  buildTenantName,
  mapBackendLeaseToTenancyRow,
  mapBackendMessage,
  mapBackendPaymentToPaymentRow,
  mapBackendPropertyToPropertyRow,
  mapPropertyInsertToBackendPayload,
  mapPropertyUpdateToBackendPayload,
  mapBackendRentalUnitToRentalUnitRow,
  mapRentalUnitInsertToBackendPayload,
} from './backend-mappers';

export interface ManagerTenancy extends TenancyRow {
  agreement_state?: AgreementConsentState | null;
  property_title?: string;
  tenant_name?: string;
  tenant_phone?: string;
}

export interface ManagerPayment extends PaymentRow {
  property_title?: string;
  tenant_name?: string;
  tenant_phone?: string;
}

export interface ManagerMessage extends MessageRow {
  property_title?: string;
  receiver_name?: string;
  sender_name?: string;
}

export interface ManagerDashboardPayload {
  messages: ManagerMessage[];
  payments: ManagerPayment[];
  properties: PropertyRow[];
  tenancies: ManagerTenancy[];
}

function compactQuery(query: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value.trim() !== ''),
  );
}

function propertyQuery(filters?: ListFilters) {
  return compactQuery({
    occupancy: filters?.occupancy,
    search: filters?.search,
  });
}

function tenancyQuery(filters?: ListFilters) {
  return compactQuery({
    end_from: filters?.dateFrom,
    end_to: filters?.dateTo,
    property_id: filters?.propertyId,
    search: filters?.search,
    status: filters?.occupancy,
    tenant_id: filters?.tenantId,
  });
}

function paymentQuery(filters?: ListFilters) {
  return compactQuery({
    due_from: filters?.dateFrom,
    due_to: filters?.dateTo,
    property_id: filters?.propertyId,
    status: filters?.paymentStatus,
    tenant_id: filters?.tenantId,
  });
}

export async function fetchManagerMessages(): Promise<ManagerMessage[]> {
  const response = await apiRequest<
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
  >('/messages', { auth: true, query: { limit: 100, skip: 0 } });

  return response.items.map((message) => mapBackendMessage<ManagerMessage>(message));
}

export async function fetchManagerDashboard(
  userId: string,
  filters?: ListFilters,
): Promise<ManagerDashboardPayload> {
  void userId;
  const [
    propertiesResponse,
    tenanciesResponse,
    paymentsResponse,
    messagesResponse,
    tenantsResponse,
  ] = await Promise.all([
    apiRequest<
      PaginatedResponse<{
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
        title?: string | null;
        updated_at: string;
        zip_code?: string;
      }>
    >('/properties', { auth: true, query: { limit: 100, skip: 0, ...propertyQuery(filters) } }),
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
    >('/leases', { auth: true, query: { limit: 100, skip: 0, ...tenancyQuery(filters) } }),
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
    >('/payments', { auth: true, query: { limit: 100, skip: 0, ...paymentQuery(filters) } }),
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
    >('/messages', { auth: true, query: { limit: 100, skip: 0 } }),
    apiRequest<
      PaginatedResponse<{
        email: string;
        first_name: string;
        id: string;
        last_name: string;
        phone?: string | null;
        user_id?: string | null;
      }>
    >('/tenants', { auth: true, query: { limit: 100, skip: 0 } }),
  ]);

  const properties = propertiesResponse.items.map(mapBackendPropertyToPropertyRow);
  const tenancies = tenanciesResponse.items.map(mapBackendLeaseToTenancyRow);
  const agreementStateResults = await Promise.allSettled(
    tenancies.map((tenancy) => fetchAgreementConsentState(tenancy.id)),
  );
  const agreementStateByTenancyId = tenancies.reduce<Record<string, AgreementConsentState | null>>(
    (accumulator, tenancy, index) => {
      const result = agreementStateResults[index];
      accumulator[tenancy.id] = result.status === 'fulfilled' ? result.value : null;
      return accumulator;
    },
    {},
  );
  const propertyMap = Object.fromEntries(
    properties.map((property) => [property.id, property.title]),
  );
  const tenantMap = Object.fromEntries(
    tenantsResponse.items.map((tenant) => [
      tenant.id,
      {
        name: buildTenantName(tenant),
        phone: tenant.phone || '',
      },
    ]),
  );
  const tenancyById = Object.fromEntries(tenancies.map((tenancy) => [tenancy.id, tenancy]));
  const payments = paymentsResponse.items.map((payment) =>
    mapBackendPaymentToPaymentRow(payment, {
      managerId: tenancyById[payment.lease_id]?.manager_id,
      tenancy: tenancyById[payment.lease_id] ?? null,
    }),
  );
  const messages = messagesResponse.items.map((message) =>
    mapBackendMessage<ManagerMessage>(message),
  );

  return {
    messages: messages.map((message) => ({
      ...message,
      property_title: message.property_id ? propertyMap[message.property_id] : undefined,
    })),
    payments: payments.map((payment) => ({
      ...payment,
      property_title: tenancyById[payment.tenancy_id]?.property_id
        ? propertyMap[tenancyById[payment.tenancy_id].property_id]
        : undefined,
      tenant_name: tenantMap[payment.tenant_id]?.name,
      tenant_phone: tenantMap[payment.tenant_id]?.phone,
    })),
    properties,
    tenancies: tenancies.map((tenancy) => ({
      ...tenancy,
      agreement_state: agreementStateByTenancyId[tenancy.id],
      property_title: propertyMap[tenancy.property_id],
      tenant_name: tenantMap[tenancy.tenant_id]?.name,
      tenant_phone: tenantMap[tenancy.tenant_id]?.phone,
    })),
  };
}

export async function createProperty(payload: PropertyInsert) {
  await apiRequest('/properties', {
    auth: true,
    body: mapPropertyInsertToBackendPayload(payload),
    method: 'POST',
  });
}

export async function updateProperty(propertyId: string, payload: Partial<PropertyInsert>) {
  await apiRequest(`/properties/${propertyId}`, {
    auth: true,
    body: mapPropertyUpdateToBackendPayload(payload),
    method: 'PATCH',
  });
}

export async function deleteProperty(propertyId: string) {
  await apiRequest(`/properties/${propertyId}`, {
    auth: true,
    method: 'DELETE',
  });
}

export async function addRentalUnit(payload: RentalUnitInsert) {
  await apiRequest('/rental-units', {
    auth: true,
    body: mapRentalUnitInsertToBackendPayload(payload),
    method: 'POST',
  });
}

export async function fetchManagerPropertyUnits(propertyId: string): Promise<RentalUnitRow[]> {
  const response = await apiRequest<
    PaginatedResponse<{
      amenities?: string[] | null;
      bathrooms: number;
      bedrooms: number;
      created_at: string;
      description?: string | null;
      floor_level?: string | null;
      id: string;
      kitchens?: number;
      owner_id: string;
      property_id: string;
      rent_amount: number | string;
      rent_currency?: string;
      sitting_rooms?: number;
      status: string;
      unit_number: string;
      updated_at: string;
    }>
  >(`/rental-units/property/${propertyId}`, {
    auth: true,
    query: { limit: 50, skip: 0 },
  });

  return response.items.map(mapBackendRentalUnitToRentalUnitRow);
}

export async function createTenancy(payload: TenancyInsert) {
  return createTenancyWithTerms(payload, null);
}

export async function createTenancyWithTerms(payload: TenancyInsert, terms: null | string) {
  await apiRequest('/leases', {
    auth: true,
    body: {
      end_date: payload.rent_end_date,
      monthly_rent: payload.rent_amount,
      property_id: payload.property_id,
      security_deposit: payload.rent_amount,
      start_date: payload.rent_start_date,
      status: payload.status || 'active',
      tenant_id: payload.tenant_id,
      terms,
    },
    method: 'POST',
  });
}

export async function createTenancyWorkflow(payload: {
  agreementText?: string | null;
  managerContact?: string | null;
  propertyTitle?: string;
  tenantEmail: string;
  tenantPhone?: string | null;
  tenancy: TenancyInsert;
}) {
  const tenant = await apiRequest<{
    email: string;
    first_name: string;
    id: string;
    last_name: string;
    phone?: string | null;
    user_id?: string | null;
  }>('/tenants/resolve-by-email', {
    auth: true,
    query: { email: payload.tenantEmail },
  });

  await createTenancyWithTerms(
    {
      ...payload.tenancy,
      tenant_id: tenant.id,
    },
    payload.agreementText ?? null,
  );

  const phone = payload.tenantPhone || tenant.phone || null;
  if (phone) {
    try {
      await sendSmsMessage(
        phone,
        `Welcome to ${payload.propertyTitle || 'your new home'}! Your tenancy with Afodabo Housing has been activated. Rent: UGX ${payload.tenancy.rent_amount.toLocaleString()}. Contact: ${payload.managerContact || 'your house manager'}`,
      );
    } catch {
      return;
    }
  }
}

export async function getUserIdByEmail(email: string) {
  const tenant = await apiRequest<{ user_id?: string | null }>('/tenants/resolve-by-email', {
    auth: true,
    query: { email },
  });
  return tenant.user_id ?? null;
}

export async function resolveTenantByEmail(email: string) {
  const tenant = await apiRequest<{
    email: string;
    first_name: string;
    id: string;
    last_name: string;
    phone?: string | null;
    user_id?: string | null;
  }>('/tenants/resolve-by-email', {
    auth: true,
    query: { email },
  });

  return {
    ...tenant,
    full_name: buildTenantName(tenant),
  };
}

export async function confirmManagerPayment(paymentId: string) {
  await apiRequest(`/payments/${paymentId}`, {
    auth: true,
    body: { status: 'confirmed' },
    method: 'PATCH',
  });
}

export async function confirmManagerPaymentWorkflow(payment: ManagerPayment) {
  await confirmManagerPayment(payment.id);

  if (payment.tenant_phone) {
    try {
      await sendSmsMessage(
        payment.tenant_phone,
        `Payment CONFIRMED! UGX ${payment.amount.toLocaleString()} has been confirmed by your house manager. - Afodabo Housing`,
      );
    } catch {
      return;
    }
  }
}

export async function rejectManagerPayment(paymentId: string) {
  await apiRequest(`/payments/${paymentId}`, {
    auth: true,
    body: { status: 'rejected' },
    method: 'PATCH',
  });
}

export async function rejectManagerPaymentWorkflow(payment: ManagerPayment) {
  await rejectManagerPayment(payment.id);

  if (payment.tenant_phone) {
    try {
      await sendSmsMessage(
        payment.tenant_phone,
        `Your rent payment proof for UGX ${payment.amount.toLocaleString()} was rejected. Please upload a clearer proof or contact your house manager. - Afodabo Housing`,
      );
    } catch {
      return;
    }
  }
}

export async function sendManagerMessage(payload: MessageInsert) {
  await apiRequest('/messages', {
    auth: true,
    body: {
      content: payload.content,
      property_id: payload.property_id ?? null,
      receiver_id: payload.receiver_id,
    },
    method: 'POST',
  });
}

export async function markManagerMessageRead(messageId: string) {
  await apiRequest(`/messages/${messageId}`, {
    auth: true,
    body: { is_read: true },
    method: 'PATCH',
  });
}

export async function sendRentReminder(
  tenancy: Pick<ManagerTenancy, 'rent_amount' | 'rent_end_date' | 'tenant_phone'>,
  managerContact?: string | null,
) {
  if (!tenancy.tenant_phone) {
    return;
  }

  const daysUntilDue = Math.ceil(
    (new Date(tenancy.rent_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  await sendSmsMessage(
    tenancy.tenant_phone,
    `RENT REMINDER: Your rent of UGX ${tenancy.rent_amount.toLocaleString()} is due ${daysUntilDue > 0 ? `in ${daysUntilDue} days` : 'today'}. Please pay and upload proof on Afodabo Housing. Contact: ${managerContact || 'your house manager'}`,
  );
}
