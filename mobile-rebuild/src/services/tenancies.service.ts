import type { LeaseRow } from '../types/database';
import { mapLeaseToTenancyLike, type TenancyLikeRow } from './lease-mappers';
import { supabase } from './supabase';

export interface ManagerTenancy extends TenancyLikeRow {
  property_title?: string;
  tenant_name?: string;
  tenant_phone?: string;
}

async function enrichManagerTenancies(
  managerId: string,
  leases: LeaseRow[],
): Promise<ManagerTenancy[]> {
  const tenancies = leases.map(mapLeaseToTenancyLike);
  const propertyIds = [...new Set(tenancies.map((tenancy) => tenancy.property_id))];
  const tenantRecordIds = [...new Set(tenancies.map((tenancy) => tenancy.tenant_id))];

  const propertyMap: Record<string, string> = {};
  if (propertyIds.length > 0) {
    const { data, error } = await supabase
      .from('properties')
      .select('id, title')
      .eq('owner_id', managerId)
      .in('id', propertyIds);

    if (error) {
      throw error;
    }

    data?.forEach((property) => {
      propertyMap[property.id] = property.title;
    });
  }

  const tenantUserMap: Record<string, string> = {};
  if (tenantRecordIds.length > 0) {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, user_id')
      .in('id', tenantRecordIds);

    if (error) {
      throw error;
    }

    data?.forEach((tenant) => {
      tenantUserMap[tenant.id] = tenant.user_id;
    });
  }

  const tenantUserIds = Object.values(tenantUserMap);
  const profileMap: Record<string, { name: string; phone: string }> = {};
  if (tenantUserIds.length > 0) {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, phone')
      .in('user_id', tenantUserIds);

    if (error) {
      throw error;
    }

    data?.forEach((profile) => {
      profileMap[profile.user_id] = {
        name: profile.full_name || 'Tenant',
        phone: profile.phone || '',
      };
    });
  }

  return tenancies.map((tenancy) => ({
    ...tenancy,
    property_title: propertyMap[tenancy.property_id],
    tenant_name: profileMap[tenantUserMap[tenancy.tenant_id]]?.name,
    tenant_phone: profileMap[tenantUserMap[tenancy.tenant_id]]?.phone,
  }));
}

export async function fetchManagerTenancies(managerId: string): Promise<ManagerTenancy[]> {
  const { data, error } = await supabase
    .from('leases')
    .select('*')
    .eq('owner_id', managerId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return enrichManagerTenancies(managerId, data ?? []);
}

export async function fetchManagerTenancy(
  managerId: string,
  tenancyId: string,
): Promise<ManagerTenancy | null> {
  const { data, error } = await supabase
    .from('leases')
    .select('*')
    .eq('owner_id', managerId)
    .eq('id', tenancyId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const [tenancy] = await enrichManagerTenancies(managerId, [data]);
  return tenancy ?? null;
}
