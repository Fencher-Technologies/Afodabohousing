import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { PaymentRow } from '../../types/supabase';
import { fetchTenantDashboard } from '../../services/tenant';
import type { ListFilters } from '../../components/advanced-filter-modal';

type PaymentStatusFilter = 'all' | PaymentRow['status'];

export function useTenantPayments(userId?: string) {
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>('all');
  const [filters, setFilters] = useState<ListFilters>({});
  const query = useQuery({
    enabled: Boolean(userId),
    queryFn: () => fetchTenantDashboard(userId as string, filters),
    queryKey: ['tenant-dashboard', userId, 'payments', filters],
  });

  const payments = useMemo(() => query.data?.payments ?? [], [query.data?.payments]);
  const filteredPayments = useMemo(() => {
    if (statusFilter === 'all') {
      return payments;
    }

    return payments.filter((payment) => payment.status === statusFilter);
  }, [payments, statusFilter]);

  const summary = useMemo(() => {
    const confirmed = payments.filter((payment) => payment.status === 'confirmed');
    const pending = payments.filter(
      (payment) => payment.status === 'pending' || payment.status === 'uploaded',
    );

    return {
      confirmedCount: confirmed.length,
      latestDate: payments[0]?.created_at ?? null,
      pendingCount: pending.length,
      totalPaid: confirmed.reduce((sum, payment) => sum + payment.amount, 0),
    };
  }, [payments]);

  return {
    ...query,
    filteredPayments,
    latestPayment: payments[0] ?? null,
    payments,
    filters,
    statusFilter,
    summary,
    tenancies: query.data?.tenancies ?? [],
    setFilters,
    setStatusFilter,
  };
}
