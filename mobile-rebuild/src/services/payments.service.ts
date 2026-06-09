import type { PaymentRow } from '../types/database';
import { supabase } from './supabase';
import { fetchTenantRecordByUserId } from './tenant-identity.service';

export async function fetchTenantPayments(userId: string): Promise<PaymentRow[]> {
  const tenantRecord = await fetchTenantRecordByUserId(userId);

  if (!tenantRecord) {
    return [];
  }

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('tenant_id', tenantRecord.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function attachTenantPaymentProof(payload: {
  paymentId: string;
  proofPath: string;
  userId: string;
}) {
  const tenantRecord = await fetchTenantRecordByUserId(payload.userId);

  if (!tenantRecord) {
    throw new Error('Could not find your tenant account record.');
  }

  const { error } = await supabase
    .from('payments')
    .update({
      proof_url: payload.proofPath,
      status: 'uploaded',
    })
    .eq('id', payload.paymentId)
    .eq('tenant_id', tenantRecord.id);

  if (error) {
    throw error;
  }
}
