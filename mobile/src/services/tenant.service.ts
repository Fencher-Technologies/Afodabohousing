import type { PaymentRow } from '../types/database';
import { mapLeaseToTenancyLike, type TenancyLikeRow } from './lease-mappers';
import { supabase } from './supabase';
import { fetchTenantRecordByUserId } from './tenant-identity.service';

export interface TenantTenancy extends TenancyLikeRow {
  manager_name?: string;
  manager_phone?: string;
  property_title?: string;
}

export type TenantRentStatus = 'active' | 'due_soon' | 'no_tenancy' | 'overdue';

export interface TenantDashboardSummary {
  activeTenancy: TenantTenancy | null;
  confirmedPaymentCount: number;
  daysRemaining: number | null;
  latestPayment: PaymentRow | null;
  recentPayments: PaymentRow[];
  rentStatus: TenantRentStatus;
  totalPaid: number;
}

export interface TenantDashboardPayload {
  payments: PaymentRow[];
  summary: TenantDashboardSummary;
  tenancies: TenantTenancy[];
}

const dayInMilliseconds = 24 * 60 * 60 * 1000;

function getDaysRemaining(dateValue: string) {
  const today = new Date();
  const targetDate = new Date(dateValue);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const targetStart = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
  ).getTime();

  return Math.ceil((targetStart - todayStart) / dayInMilliseconds);
}

function getRentStatus(activeTenancy: TenantTenancy | null, daysRemaining: number | null) {
  if (!activeTenancy || daysRemaining === null) {
    return 'no_tenancy';
  }

  if (daysRemaining < 0) {
    return 'overdue';
  }

  if (daysRemaining <= 14) {
    return 'due_soon';
  }

  return 'active';
}

function buildSummary(tenancies: TenantTenancy[], payments: PaymentRow[]): TenantDashboardSummary {
  const activeTenancy = tenancies.find((tenancy) => tenancy.status === 'active') ?? null;
  const confirmedPayments = payments.filter((payment) => payment.status === 'confirmed');
  const daysRemaining = activeTenancy ? getDaysRemaining(activeTenancy.rent_end_date) : null;

  return {
    activeTenancy,
    confirmedPaymentCount: confirmedPayments.length,
    daysRemaining,
    latestPayment: payments[0] ?? null,
    recentPayments: payments.slice(0, 3),
    rentStatus: getRentStatus(activeTenancy, daysRemaining),
    totalPaid: confirmedPayments.reduce((sum, payment) => sum + payment.amount, 0),
  };
}

export async function fetchTenantDashboard(userId: string): Promise<TenantDashboardPayload> {
  const tenantRecord = await fetchTenantRecordByUserId(userId);

  if (!tenantRecord) {
    return {
      payments: [],
      summary: buildSummary([], []),
      tenancies: [],
    };
  }

  const [leasesResult, paymentsResult] = await Promise.all([
    supabase
      .from('leases')
      .select('*')
      .eq('tenant_id', tenantRecord.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('payments')
      .select('*')
      .eq('tenant_id', tenantRecord.id)
      .order('created_at', { ascending: false }),
  ]);

  if (paymentsResult.error) {
    throw paymentsResult.error;
  }

  if (leasesResult.error) {
    throw leasesResult.error;
  }

  const tenancies = (leasesResult.data ?? []).map(mapLeaseToTenancyLike);
  const payments = paymentsResult.data ?? [];
  const propertyIds = [...new Set(tenancies.map((tenancy) => tenancy.property_id))];
  const managerIds = [...new Set(tenancies.map((tenancy) => tenancy.manager_id))];

  const propertyMap: Record<string, string> = {};
  if (propertyIds.length > 0) {
    const { data, error } = await supabase
      .from('properties')
      .select('id, title')
      .in('id', propertyIds);

    if (error) {
      throw error;
    }

    data?.forEach((property) => {
      propertyMap[property.id] = property.title;
    });
  }

  const profileMap: Record<string, { name: string; phone: string }> = {};
  if (managerIds.length > 0) {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, phone')
      .in('user_id', managerIds);

    if (error) {
      throw error;
    }

    data?.forEach((profile) => {
      profileMap[profile.user_id] = {
        name: profile.full_name || 'House Manager',
        phone: profile.phone || '',
      };
    });
  }

  const enrichedTenancies = tenancies.map((tenancy) => ({
    ...tenancy,
    manager_name: profileMap[tenancy.manager_id]?.name,
    manager_phone: profileMap[tenancy.manager_id]?.phone,
    property_title: propertyMap[tenancy.property_id],
  }));

  return {
    payments,
    summary: buildSummary(enrichedTenancies, payments),
    tenancies: enrichedTenancies,
  };
}
