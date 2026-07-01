import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { PaymentRow } from '../../types/supabase';
import { fetchTenantDashboard } from '../../services/tenant';

type PaymentStatusFilter = 'all' | PaymentRow['status'];

export function useTenantPayments(userId?: string) {
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>('all');
  const query = useQuery({
    enabled: Boolean(userId),
    queryFn: () => fetchTenantDashboard(userId as string),
    queryKey: ['tenant-dashboard', userId],
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
    statusFilter,
    summary,
    tenancies: query.data?.tenancies ?? [],
    setStatusFilter,
  };
}
