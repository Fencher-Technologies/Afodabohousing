import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchManagerPayments } from '../../services/manager-payments.service';
import type { PaymentRow } from '../../types/database';

export type ManagerPaymentFilterValue = PaymentRow['status'] | 'all';

export interface ManagerPaymentSummary {
  confirmedCount: number;
  pendingReviewCount: number;
  rejectedCount: number;
  totalConfirmedAmount: number;
  totalPayments: number;
}

function buildSummary(payments: PaymentRow[]): ManagerPaymentSummary {
  return {
    confirmedCount: payments.filter((payment) => payment.status === 'confirmed').length,
    pendingReviewCount: payments.filter(
      (payment) => payment.status === 'pending' || payment.status === 'uploaded',
    ).length,
    rejectedCount: payments.filter((payment) => payment.status === 'rejected').length,
    totalConfirmedAmount: payments
      .filter((payment) => payment.status === 'confirmed')
      .reduce((sum, payment) => sum + payment.amount, 0),
    totalPayments: payments.length,
  };
}

export function useManagerPayments(managerId?: string) {
  const [statusFilter, setStatusFilter] = useState<ManagerPaymentFilterValue>('all');

  const query = useQuery({
    enabled: Boolean(managerId),
    queryFn: () => fetchManagerPayments(managerId as string),
    queryKey: ['manager-payments', managerId],
  });

  const payments = useMemo(() => query.data ?? [], [query.data]);
  const filteredPayments = useMemo(
    () =>
      statusFilter === 'all'
        ? payments
        : payments.filter((payment) => payment.status === statusFilter),
    [payments, statusFilter],
  );
  const summary = useMemo(() => buildSummary(payments), [payments]);

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
