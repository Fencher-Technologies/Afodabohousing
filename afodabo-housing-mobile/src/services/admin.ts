import type { PaymentRow, PropertyRow, TenancyRow } from '../types/supabase';
import { apiRequest } from './backend-api';

export interface AdminUser {
  created_at: string;
  full_name?: string;
  id: string;
  phone?: string;
  role?: string;
}

export interface AdminDashboardPayload {
  limitedAccess?: boolean;
  payments: PaymentRow[];
  properties: PropertyRow[];
  tenancies: TenancyRow[];
  users: AdminUser[];
}

export async function fetchAdminDashboard(): Promise<AdminDashboardPayload> {
  const currentUser = await apiRequest<{
    email: string;
    id: string;
    role: string;
    user_metadata?: Record<string, unknown> | null;
  }>('/auth/me', {
    auth: true,
  });

  return {
    limitedAccess: true,
    payments: [],
    properties: [],
    tenancies: [],
    users: [
      {
        created_at: new Date().toISOString(),
        full_name:
          typeof currentUser.user_metadata?.full_name === 'string'
            ? currentUser.user_metadata.full_name
            : currentUser.email,
        id: currentUser.id,
        role: currentUser.role,
      },
    ],
  };
}

export async function activateProperty(propertyId: string) {
  void propertyId;
  throw new Error('Admin property activation is not available through the Python backend yet.');
}

export async function deactivateProperty(propertyId: string) {
  void propertyId;
  throw new Error('Admin property deactivation is not available through the Python backend yet.');
}

export async function saveAdminProperty(
  propertyId: string,
  payload: Pick<PropertyRow, 'district' | 'rent_amount' | 'status' | 'title'>,
) {
  void propertyId;
  void payload;
  throw new Error('Admin property editing is not available through the Python backend yet.');
}

export async function deleteAdminProperty(propertyId: string) {
  void propertyId;
  throw new Error('Admin property deletion is not available through the Python backend yet.');
}

export async function confirmAdminPayment(paymentId: string) {
  void paymentId;
  throw new Error('Admin payment review is not available through the Python backend yet.');
}

export async function rejectAdminPayment(paymentId: string) {
  void paymentId;
  throw new Error('Admin payment review is not available through the Python backend yet.');
}

export async function terminateTenancy(tenancyId: string) {
  void tenancyId;
  throw new Error('Admin tenancy termination is not available through the Python backend yet.');
}
