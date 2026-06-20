import { supabase } from './supabase';

export interface TenantIdentity {
  id: string;
  user_id: string;
}

function isTenantTableUnavailable(error: { code?: string | null; message?: string | null }) {
  const message = error.message?.toLowerCase() ?? '';

  return (
    error.code === 'PGRST204' ||
    (message.includes('public.tenants') &&
      (message.includes('schema cache') || message.includes('could not find the table')))
  );
}

export async function fetchTenantRecordByUserId(userId: string): Promise<TenantIdentity | null> {
  const { data, error } = await supabase
    .from('tenants')
    .select('id, user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (isTenantTableUnavailable(error)) {
      console.warn('[tenant-debug] tenants lookup unavailable; treating as no tenant record', {
        error: error.message,
        userId,
      });
      return null;
    }

    throw error;
  }

  return data ?? null;
}
