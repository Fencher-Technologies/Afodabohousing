import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { LoadingState } from '../../components/common/LoadingState';
import { PageHeader } from '../../components/common/PageHeader';
import { PaymentDetailPreview } from '../../components/payment/PaymentDetailPreview';
import { PaymentHistoryCard } from '../../components/payment/PaymentHistoryCard';
import { PaymentProofUploadAction } from '../../components/payment/PaymentProofUploadAction';
import { PaymentStatusFilter } from '../../components/payment/PaymentStatusFilter';
import { PaymentStatusSummary } from '../../components/payment/PaymentStatusSummary';
import { useAuth } from '../../context/AuthContext';
import { useTenantPayments } from '../../hooks/tenant/useTenantPayments';
import { colors, spacing } from '../../theme';

export function TenantPaymentsScreen() {
  const { user } = useAuth();
  const paymentsQuery = useTenantPayments(user?.id);

  if (!user) {
    return (
      <View style={styles.screen}>
        <EmptyState
          description="Sign in as a tenant to view your rent payment records."
          title="Payments unavailable"
        />
      </View>
    );
  }

  if (paymentsQuery.isLoading) {
    return <LoadingState message="Loading payment history" />;
  }

  if (paymentsQuery.isError) {
    return (
      <View style={styles.screen}>
        <ErrorState
          description={
            paymentsQuery.error instanceof Error ? paymentsQuery.error.message : 'Please try again.'
          }
          onRetry={() => {
            void paymentsQuery.refetch();
          }}
          title="Could not load payments"
        />
      </View>
    );
  }

  const hasPayments = paymentsQuery.payments.length > 0;
  const hasFilteredPayments = paymentsQuery.filteredPayments.length > 0;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          onRefresh={() => {
            void paymentsQuery.refetch();
          }}
          refreshing={paymentsQuery.isRefetching}
          tintColor={colors.primary}
        />
      }
      style={styles.screen}
    >
      <PageHeader
        label="Rent Payments"
        subtitle="Track rent history and upload proof when needed."
        title="Payments"
      />

      <PaymentStatusSummary summary={paymentsQuery.summary} />
      <PaymentDetailPreview payment={paymentsQuery.latestPayment} />
      <PaymentProofUploadAction payment={paymentsQuery.latestPayment} userId={user.id} />

      {hasPayments ? (
        <>
          <PaymentStatusFilter
            onChange={paymentsQuery.setStatusFilter}
            value={paymentsQuery.statusFilter}
          />

          <View style={styles.list}>
            {hasFilteredPayments ? (
              paymentsQuery.filteredPayments.map((payment) => (
                <PaymentHistoryCard key={payment.id} payment={payment} />
              ))
            ) : (
              <EmptyState
                description="Try another status filter to see more records."
                title="No matching payments"
              />
            )}
          </View>
        </>
      ) : (
        <EmptyState
          description="Your rent payment records will appear here once payments are created or reviewed."
          title="No payments yet"
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  list: {
    gap: spacing.md,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
