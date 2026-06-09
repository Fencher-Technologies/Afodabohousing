import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorState } from '../../components/common/ErrorState';
import { LoadingState } from '../../components/common/LoadingState';
import { ManagerEmptyState } from '../../components/manager/ManagerEmptyState';
import { ManagerScreenHeader } from '../../components/manager/ManagerScreenHeader';
import { ManagerPaymentCard } from '../../components/manager/ManagerPaymentCard';
import { ManagerPaymentLatestCard } from '../../components/manager/ManagerPaymentLatestCard';
import { ManagerPaymentSummaryCard } from '../../components/manager/ManagerPaymentSummaryCard';
import { ManagerSectionHeader } from '../../components/manager/ManagerSectionHeader';
import { PaymentStatusFilter } from '../../components/payment/PaymentStatusFilter';
import { useAuth } from '../../context/AuthContext';
import { useManagerPreview } from '../../context/ManagerPreviewContext';
import { useManagerPayments } from '../../hooks/manager/useManagerPayments';
import {
  useConfirmManagerPayment,
  useRejectManagerPayment,
} from '../../hooks/manager/useReviewManagerPayment';
import { colors, spacing, typography } from '../../theme';
import type { PaymentRow } from '../../types/database';
import { getManagerBottomContentPadding } from '../../utils/manager-layout';

export function ManagerPaymentsScreen() {
  const { user } = useAuth();
  const preview = useManagerPreview();
  const insets = useSafeAreaInsets();
  const paymentsQuery = useManagerPayments(user?.id);
  const confirmMutation = useConfirmManagerPayment();
  const rejectMutation = useRejectManagerPayment();
  const reviewing = confirmMutation.isPending || rejectMutation.isPending;

  const confirmPayment = (payment: PaymentRow) => {
    if (!user) {
      return;
    }

    Alert.alert('Confirm payment', 'Mark this payment proof as confirmed?', [
      { style: 'cancel', text: 'Cancel' },
      {
        onPress: () => {
          confirmMutation.mutate({
            managerId: user.id,
            paymentId: payment.id,
          });
        },
        text: 'Confirm',
      },
    ]);
  };

  const rejectPayment = (payment: PaymentRow) => {
    if (!user) {
      return;
    }

    Alert.alert('Reject payment', 'Mark this payment proof as rejected?', [
      { style: 'cancel', text: 'Cancel' },
      {
        onPress: () => {
          rejectMutation.mutate({
            managerId: user.id,
            paymentId: payment.id,
          });
        },
        style: 'destructive',
        text: 'Reject',
      },
    ]);
  };

  if (!user && preview.enabled) {
    return (
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: getManagerBottomContentPadding(insets.bottom) },
        ]}
        style={styles.screen}
      >
        <ManagerScreenHeader
          icon="card-outline"
          subtitle="Review uploaded rent payment proofs from your tenants."
          title="Payments"
        />

        <View style={styles.section}>
          <ManagerSectionHeader
            icon="stats-chart-outline"
            subtitle="Live status totals will appear once manager signup is available."
            title="Payment summary"
          />
          <ManagerPaymentSummaryCard
            summary={{
              confirmedCount: 0,
              pendingReviewCount: 0,
              rejectedCount: 0,
              totalConfirmedAmount: 0,
              totalPayments: 0,
            }}
          />
        </View>

        <View style={styles.section}>
          <ManagerSectionHeader
            icon="receipt-outline"
            subtitle="Most recent tenant payment record."
            title="Latest payment"
          />
          <ManagerPaymentLatestCard payment={null} />
        </View>

        <ManagerEmptyState
          description="Payment proof review is ready for live manager accounts."
          icon="card-outline"
          title="Payments preview"
        />
      </ScrollView>
    );
  }

  if (!user) {
    return (
      <View style={styles.screen}>
        <ManagerEmptyState
          description="Sign in as a house manager to view tenant payment records."
          icon="card-outline"
          title="Payments unavailable"
        />
      </View>
    );
  }

  if (paymentsQuery.isLoading) {
    return <LoadingState message="Loading manager payments" />;
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
      contentContainerStyle={[
        styles.content,
        { paddingBottom: getManagerBottomContentPadding(insets.bottom) },
      ]}
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
      <ManagerScreenHeader
        icon="card-outline"
        subtitle="Review uploaded rent payment proofs from your tenants."
        title="Payments"
      />

      {confirmMutation.isError || rejectMutation.isError ? (
        <Text style={styles.error}>
          {(confirmMutation.error instanceof Error && confirmMutation.error.message) ||
            (rejectMutation.error instanceof Error && rejectMutation.error.message) ||
            'Could not update payment status.'}
        </Text>
      ) : null}

      <View style={styles.section}>
        <ManagerSectionHeader
          icon="stats-chart-outline"
          subtitle="Quick totals by status."
          title="Payment summary"
        />
        <ManagerPaymentSummaryCard summary={paymentsQuery.summary} />
      </View>

      <View style={styles.section}>
        <ManagerSectionHeader
          icon="receipt-outline"
          subtitle="Most recent tenant payment record."
          title="Latest payment"
        />
        <ManagerPaymentLatestCard payment={paymentsQuery.latestPayment} />
      </View>

      {hasPayments ? (
        <>
          <View style={styles.section}>
            <ManagerSectionHeader
              icon="list-outline"
              subtitle="Filter and review individual records."
              title="Payment records"
            />
            <PaymentStatusFilter
              onChange={paymentsQuery.setStatusFilter}
              value={paymentsQuery.statusFilter}
            />
          </View>
          <View style={styles.list}>
            {hasFilteredPayments ? (
              paymentsQuery.filteredPayments.map((payment) => (
                <ManagerPaymentCard
                  key={payment.id}
                  onConfirm={confirmPayment}
                  onReject={rejectPayment}
                  payment={payment}
                  reviewing={reviewing}
                />
              ))
            ) : (
              <ManagerEmptyState
                description="Try another status filter to see more records."
                icon="filter-outline"
                title="No matching payments"
              />
            )}
          </View>
        </>
      ) : (
        <ManagerEmptyState
          description="Tenant payment records for your properties will appear here."
          icon="card-outline"
          title="No payments yet"
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  error: {
    color: colors.error,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 20,
  },
  list: {
    gap: spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
