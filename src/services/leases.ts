import { apiGet, apiPost, apiPatch } from './api';

export interface Lease {
  id: string;
  property_id: string;
  tenant_id: string;
  owner_id: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  rent_deposit?: number;
  status: string;
  tenant_user_id?: string;
  created_at: string;
  updated_at: string;
  properties?: any;
  tenants?: any;
}

export async function listLeases(): Promise<{ items: Lease[]; total: number }> {
  return apiGet('/leases');
}

export async function getLease(id: string): Promise<Lease> {
  return apiGet(`/leases/${id}`);
}

export async function createLease(data: Partial<Lease>): Promise<Lease> {
  return apiPost('/leases', data);
}

export async function updateLease(id: string, data: Partial<Lease>): Promise<Lease> {
  return apiPatch(`/leases/${id}`, data);
}
