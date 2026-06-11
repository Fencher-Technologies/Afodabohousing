import { supabase } from './supabase';

export interface TenantIdentity {
  id: string;
  user_id: string;
}

export async function fetchTenantRecordByUserId(userId: string): Promise<TenantIdentity | null> {
  const { data, error } = await supabase
    .from('tenants')
    .select('id, user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
}
