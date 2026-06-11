import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTenantPayments } from '../../services/payments.service';
import type { PaymentRow } from '../../types/database';

export type PaymentFilterValue = PaymentRow['status'] | 'all';

export interface TenantPaymentSummary {
  confirmedCount: number;
  pendingReviewCount: number;
  rejectedCount: number;
  totalConfirmedAmount: number;
}

function buildPaymentSummary(payments: PaymentRow[]): TenantPaymentSummary {
  return {
    confirmedCount: payments.filter((payment) => payment.status === 'confirmed').length,
    pendingReviewCount: payments.filter(
      (payment) => payment.status === 'pending' || payment.status === 'uploaded',
    ).length,
    rejectedCount: payments.filter((payment) => payment.status === 'rejected').length,
    totalConfirmedAmount: payments
      .filter((payment) => payment.status === 'confirmed')
      .reduce((sum, payment) => sum + payment.amount, 0),
  };
}

export function useTenantPayments(userId?: string) {
  const [statusFilter, setStatusFilter] = useState<PaymentFilterValue>('all');

  const query = useQuery({
    enabled: Boolean(userId),
    queryFn: () => fetchTenantPayments(userId as string),
    queryKey: ['tenant-payments', userId],
  });

  const payments = useMemo(() => query.data ?? [], [query.data]);

  const filteredPayments = useMemo(
    () =>
      statusFilter === 'all'
        ? payments
        : payments.filter((payment) => payment.status === statusFilter),
    [payments, statusFilter],
  );

  const summary = useMemo(() => buildPaymentSummary(payments), [payments]);

  return {
    ...query,
    filteredPayments,
    latestPayment: payments[0] ?? null,
    payments,
    setStatusFilter,
    statusFilter,
    summary,
  };
}
