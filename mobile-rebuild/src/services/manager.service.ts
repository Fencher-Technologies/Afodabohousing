import type { LeaseRow, MessageRow, PaymentRow, PropertyRow } from '../types/database';
import { supabase } from './supabase';

export interface ManagerDashboardSummary {
  activeProperties: number;
  activeTenancies: number;
  pendingProofs: number;
  totalProperties: number;
  unreadMessages: number;
}

export interface ManagerDashboardPayload {
  latestMessage: MessageRow | null;
  latestPayment: PaymentRow | null;
  latestProperty: PropertyRow | null;
  payments: PaymentRow[];
  properties: PropertyRow[];
  summary: ManagerDashboardSummary;
  tenancies: LeaseRow[];
}

function buildSummary(payload: {
  managerId: string;
  messages: MessageRow[];
  payments: PaymentRow[];
  properties: PropertyRow[];
  tenancies: LeaseRow[];
}): ManagerDashboardSummary {
  return {
    activeProperties: payload.properties.filter((property) => property.status === 'available')
      .length,
    activeTenancies: payload.tenancies.filter((tenancy) => tenancy.status === 'active').length,
    pendingProofs: payload.payments.filter(
      (payment) => payment.status === 'pending' || payment.status === 'uploaded',
    ).length,
    totalProperties: payload.properties.length,
    unreadMessages: payload.messages.filter(
      (message) => !message.is_read && message.receiver_id === payload.managerId,
    ).length,
  };
}

export async function fetchManagerDashboard(managerId: string): Promise<ManagerDashboardPayload> {
  const [propertiesResult, tenanciesResult, messagesResult] = await Promise.all([
    supabase
      .from('properties')
      .select('*')
      .eq('owner_id', managerId)
      .order('created_at', { ascending: false }),
    supabase
      .from('leases')
      .select('*')
      .eq('owner_id', managerId)
      .order('created_at', { ascending: false }),
    supabase
      .from('messages')
      .select('*')
      .or(`receiver_id.eq.${managerId},sender_id.eq.${managerId}`)
      .order('created_at', { ascending: false }),
  ]);

  if (propertiesResult.error) {
    throw propertiesResult.error;
  }

  if (tenanciesResult.error) {
    throw tenanciesResult.error;
  }

  if (messagesResult.error) {
    throw messagesResult.error;
  }

  const properties = propertiesResult.data ?? [];
  const tenancies = tenanciesResult.data ?? [];
  const leaseIds = tenancies.map((tenancy) => tenancy.id);
  let payments: PaymentRow[] = [];

  if (leaseIds.length > 0) {
    const result = await supabase
      .from('payments')
      .select('*')
      .in('lease_id', leaseIds)
      .order('created_at', { ascending: false });

    if (result.error) {
      throw result.error;
    }

    payments = result.data ?? [];
  }

  const messages = messagesResult.data ?? [];

  return {
    latestMessage: messages[0] ?? null,
    latestPayment: payments[0] ?? null,
    latestProperty: properties[0] ?? null,
    payments,
    properties,
    summary: buildSummary({
      managerId,
      messages,
      payments,
      properties,
      tenancies,
    }),
    tenancies,
  };
}
