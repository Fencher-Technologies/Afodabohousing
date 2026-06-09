import type { PropertyRow } from '../types/database';
import { supabase } from './supabase';

export async function fetchManagerProperties(managerId: string): Promise<PropertyRow[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('owner_id', managerId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function fetchManagerProperty(
  managerId: string,
  propertyId: string,
): Promise<PropertyRow | null> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('owner_id', managerId)
    .eq('id', propertyId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
}
