import type { PaymentRow } from '../types/database';
import { supabase } from './supabase';

async function fetchManagerLeaseIds(managerId: string): Promise<string[]> {
  const { data, error } = await supabase.from('leases').select('id').eq('owner_id', managerId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((lease) => lease.id);
}

export async function fetchManagerPayments(managerId: string): Promise<PaymentRow[]> {
  const leaseIds = await fetchManagerLeaseIds(managerId);

  if (leaseIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .in('lease_id', leaseIds)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function confirmManagerPayment(payload: { managerId: string; paymentId: string }) {
  const leaseIds = await fetchManagerLeaseIds(payload.managerId);

  if (leaseIds.length === 0) {
    throw new Error('No manager leases found for this payment review.');
  }

  const { error } = await supabase
    .from('payments')
    .update({
      receipt_url: `receipt-${payload.paymentId}`,
      status: 'confirmed',
    })
    .eq('id', payload.paymentId)
    .in('lease_id', leaseIds);

  if (error) {
    throw error;
  }
}

export async function rejectManagerPayment(payload: { managerId: string; paymentId: string }) {
  const leaseIds = await fetchManagerLeaseIds(payload.managerId);

  if (leaseIds.length === 0) {
    throw new Error('No manager leases found for this payment review.');
  }

  const { error } = await supabase
    .from('payments')
    .update({
      status: 'rejected',
    })
    .eq('id', payload.paymentId)
    .in('lease_id', leaseIds);

  if (error) {
    throw error;
  }
}
