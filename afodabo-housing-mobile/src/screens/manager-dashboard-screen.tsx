import {
  differenceInDays,
  endOfMonth,
  format,
  isWithinInterval,
  parseISO,
  startOfMonth,
} from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Linking, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/button';
import { EmptyState } from '../components/empty-state';
import { ErrorState } from '../components/error-state';
import { LoadingState } from '../components/loading-state';
import { ScrollableScreenContainer } from '../components/scrollable-screen-container';
import { SegmentedControl } from '../components/segmented-control';
import { useAuth } from '../context/auth-context';
import { useManagerDashboard } from '../hooks/manager/use-manager-dashboard';
import { confirmManagerPaymentWorkflow, rejectManagerPaymentWorkflow } from '../services/manager';
import { resolvePaymentProofUrl } from '../services/platform';
import { downloadPaymentReceiptPdf } from '../services/receipts';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { formatDateLabel, formatUGXFull } from '../utils/format';

type ManagerView = 'overview' | 'payments';
const emptyInsightBackground = `${colors.surfaceMuted}73`;

function EmptyInsightPanel({ message }: { message: string }) {
  return (
    <View style={styles.emptyInsightPanel}>
      <Text style={styles.emptyInsightText}>{message}</Text>
    </View>
  );
}

export function ManagerDashboardScreen() {
  const { profile, user } = useAuth();
  const [selectedView, setSelectedView] = useState<ManagerView>('overview');
  const dashboardQuery = useManagerDashboard(user?.id);
  const refetchManagerDashboard = dashboardQuery.refetch;

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        void refetchManagerDashboard();
      }
    }, [refetchManagerDashboard, user?.id]),
  );

  const stats = useMemo(() => {
    const properties = dashboardQuery.data?.properties ?? [];
    const payments = dashboardQuery.data?.payments ?? [];
    const tenancies = dashboardQuery.data?.tenancies ?? [];
    const messages = dashboardQuery.data?.messages ?? [];

    return {
      available: properties.filter((property) => property.status === 'available').length,
      occupied: properties.filter((property) => property.status === 'occupied').length,
      revenue: payments
        .filter((payment) => payment.status === 'confirmed')
        .reduce((sum, payment) => sum + payment.amount, 0),
      tenants: tenancies.filter((tenancy) => tenancy.status === 'active').length,
      unread: messages.filter((message) => !message.is_read && message.receiver_id === user?.id)
        .length,
    };
  }, [dashboardQuery.data, user?.id]);

  const dashboardInsights = useMemo(() => {
    const tenancies = dashboardQuery.data?.tenancies ?? [];
    const payments = dashboardQuery.data?.payments ?? [];
    const properties = dashboardQuery.data?.properties ?? [];
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());

    const dueSoonTenancies = tenancies
      .filter((tenancy) => tenancy.status === 'active')
      .map((tenancy) => ({
        ...tenancy,
        daysRemaining: differenceInDays(new Date(tenancy.rent_end_date), new Date()),
      }))
      .filter((tenancy) => tenancy.daysRemaining >= 0 && tenancy.daysRemaining <= 14)
      .sort((left, right) => left.daysRemaining - right.daysRemaining);

    const overdueTenancies = tenancies
      .filter((tenancy) => tenancy.status === 'active')
      .map((tenancy) => ({
        ...tenancy,
        daysOverdue: Math.abs(differenceInDays(new Date(tenancy.rent_end_date), new Date())),
      }))
      .filter((tenancy) => new Date(tenancy.rent_end_date) < new Date())
      .sort((left, right) => right.daysOverdue - left.daysOverdue);

    const rentReviewDue = tenancies
      .filter((tenancy) => tenancy.status === 'active')
      .map((tenancy) => ({
        ...tenancy,
        reviewWindowDays: differenceInDays(new Date(tenancy.rent_end_date), new Date()),
      }))
      .filter((tenancy) => tenancy.reviewWindowDays >= 0 && tenancy.reviewWindowDays <= 30)
      .sort((left, right) => left.reviewWindowDays - right.reviewWindowDays);

    const confirmedPayments = payments
      .filter((payment) => payment.status === 'confirmed')
      .slice(0, 5);

    const rentDueThisMonth = tenancies
      .filter((tenancy) => tenancy.status === 'active')
      .filter((tenancy) => {
        const rentDueDate = parseISO(tenancy.rent_end_date);

        if (Number.isNaN(rentDueDate.getTime())) {
          return false;
        }

        return isWithinInterval(rentDueDate, { end: monthEnd, start: monthStart });
      })
      .reduce((sum, tenancy) => sum + tenancy.rent_amount, 0);

    const rentCollectedThisMonth = payments
      .filter((payment) => payment.status === 'confirmed')
      .filter((payment) => {
        const confirmedDate = parseISO(payment.created_at);

        if (Number.isNaN(confirmedDate.getTime())) {
          return false;
        }

        return isWithinInterval(confirmedDate, { end: monthEnd, start: monthStart });
      })
      .reduce((sum, payment) => sum + payment.amount, 0);

    return {
      confirmedPayments,
      dueSoonTenancies,
      inactiveProperties: properties.filter((property) => property.status === 'inactive'),
      overdueTenancies,
      rentCollectedThisMonth,
      rentDueThisMonth,
      rentReviewDue,
    };
  }, [dashboardQuery.data]);
  const currentMonthLabel = format(new Date(), 'MMMM yyyy');

  if (!user) {
    return (
      <ScrollableScreenContainer>
        <EmptyState
          description="Sign in as a house manager to manage listings, tenancies, and payments."
          title="Manager dashboard unavailable"
        />
      </ScrollableScreenContainer>
    );
  }

  if (dashboardQuery.isLoading) {
    return <LoadingState message="Loading manager dashboard" />;
  }

  if (dashboardQuery.isError) {
    return (
      <ScrollableScreenContainer>
        <ErrorState
          description={
            dashboardQuery.error instanceof Error
              ? dashboardQuery.error.message
              : 'Please try again.'
          }
          onRetry={() => {
            void dashboardQuery.refetch();
          }}
          title="Could not load manager dashboard"
        />
      </ScrollableScreenContainer>
    );
  }

  return (
    <ScrollableScreenContainer
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          onRefresh={() => {
            void dashboardQuery.refetch();
          }}
          refreshing={dashboardQuery.isRefetching}
          tintColor={colors.primary}
        />
      }
    >
      <SegmentedControl
        onChange={setSelectedView}
        options={[
          { label: 'Overview', value: 'overview' },
          { label: 'Payments', value: 'payments' },
        ]}
        value={selectedView}
      />

      {selectedView === 'overview' ? (
        <>
          <View style={styles.statsRow}>
            <View style={styles.miniStat}>
              <Text style={styles.statValue}>{stats.available}</Text>
              <Text style={styles.statLabel}>Available</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={styles.statValue}>{stats.occupied}</Text>
              <Text style={styles.statLabel}>Occupied</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.miniStat}>
              <Text style={styles.statValue}>{stats.tenants}</Text>
              <Text style={styles.statLabel}>Active tenants</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={styles.statValue}>{stats.unread}</Text>
              <Text style={styles.statLabel}>Unread messages</Text>
            </View>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Revenue</Text>
            <Text style={styles.largeValue}>{formatUGXFull(stats.revenue)}</Text>
            <Text style={styles.cardText}>Confirmed payment value across your properties.</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>This Month</Text>
            <Text style={styles.cardText}>{currentMonthLabel}</Text>
            <View style={styles.metricRow}>
              <View style={styles.metricBlock}>
                <Text style={styles.metricLabel}>Rent to collect</Text>
                <Text style={styles.metricValue}>
                  {formatUGXFull(dashboardInsights.rentDueThisMonth)}
                </Text>
              </View>
              <View style={styles.metricBlock}>
                <Text style={styles.metricLabel}>Collected so far</Text>
                <Text style={styles.metricValue}>
                  {formatUGXFull(dashboardInsights.rentCollectedThisMonth)}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tenants Due To Pay</Text>
            {dashboardInsights.dueSoonTenancies.length === 0 ? (
              <EmptyInsightPanel message="No active tenant is due within the next 14 days." />
            ) : (
              dashboardInsights.dueSoonTenancies.map((tenancy) => (
                <View key={tenancy.id} style={styles.listRow}>
                  <View style={styles.listCopy}>
                    <Text style={styles.listTitle}>
                      {tenancy.tenant_name || 'Tenant'} • {formatUGXFull(tenancy.rent_amount)}
                    </Text>
                    <Text style={styles.cardText}>
                      {tenancy.property_title || 'Property'} • due{' '}
                      {formatDateLabel(tenancy.rent_end_date)}
                    </Text>
                  </View>
                  <Text style={styles.emphasisText}>{tenancy.daysRemaining}d</Text>
                </View>
              ))
            )}
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Overdue Rent</Text>
            {dashboardInsights.overdueTenancies.length === 0 ? (
              <EmptyInsightPanel message="No overdue active tenancy at the moment." />
            ) : (
              dashboardInsights.overdueTenancies.map((tenancy) => (
                <View key={tenancy.id} style={styles.listRow}>
                  <View style={styles.listCopy}>
                    <Text style={styles.listTitle}>{tenancy.tenant_name || 'Tenant'}</Text>
                    <Text style={styles.cardText}>
                      {tenancy.property_title || 'Property'} • due{' '}
                      {formatDateLabel(tenancy.rent_end_date)}
                    </Text>
                  </View>
                  <Text style={[styles.emphasisText, styles.dangerText]}>
                    {tenancy.daysOverdue}d late
                  </Text>
                </View>
              ))
            )}
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Rent Review Due</Text>
            <Text style={styles.cardText}>
              Upcoming tenancy periods ending within 30 days for rent review and renewal planning.
            </Text>
            {dashboardInsights.rentReviewDue.length === 0 ? (
              <EmptyInsightPanel message="No active tenancy is in the review window right now." />
            ) : (
              dashboardInsights.rentReviewDue.map((tenancy) => (
                <View key={tenancy.id} style={styles.listRow}>
                  <View style={styles.listCopy}>
                    <Text style={styles.listTitle}>{tenancy.property_title || 'Property'}</Text>
                    <Text style={styles.cardText}>
                      {tenancy.tenant_name || 'Tenant'} • ends{' '}
                      {formatDateLabel(tenancy.rent_end_date)}
                    </Text>
                  </View>
                  <Text style={styles.emphasisText}>{tenancy.reviewWindowDays}d</Text>
                </View>
              ))
            )}
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Occupancy Snapshot</Text>
            <Text style={styles.cardText}>
              Available: {stats.available} • Occupied: {stats.occupied} • Inactive:{' '}
              {dashboardInsights.inactiveProperties.length}
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent Confirmed Payments</Text>
            {dashboardInsights.confirmedPayments.length === 0 ? (
              <EmptyInsightPanel message="No confirmed payment has been recorded yet." />
            ) : (
              dashboardInsights.confirmedPayments.map((payment) => (
                <View key={payment.id} style={styles.listRow}>
                  <View style={styles.listCopy}>
                    <Text style={styles.listTitle}>
                      {payment.tenant_name || 'Tenant'} • {formatUGXFull(payment.amount)}
                    </Text>
                    <Text style={styles.cardText}>
                      {payment.property_title || 'Property payment'} •{' '}
                      {formatDateLabel(payment.created_at)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </>
      ) : null}

      {selectedView === 'payments' ? (
        <>
          {(dashboardQuery.data?.payments ?? []).length === 0 ? (
            <EmptyState
              description="Incoming tenant payment records will appear here."
              title="No payments yet"
            />
          ) : (
            (dashboardQuery.data?.payments ?? []).map((payment) => (
              <View key={payment.id} style={styles.card}>
                <Text style={styles.cardTitle}>{payment.property_title || 'Property payment'}</Text>
                <Text style={styles.cardText}>
                  Tenant: {payment.tenant_name || payment.tenant_id}
                </Text>
                <Text style={styles.cardText}>Amount: {formatUGXFull(payment.amount)}</Text>
                <Text style={styles.cardText}>Status: {payment.status}</Text>
                <Text style={styles.cardText}>{payment.notes || 'No notes supplied'}</Text>
                {payment.proof_url ? (
                  <Button
                    onPress={async () => {
                      const url = resolvePaymentProofUrl(payment.proof_url);

                      if (!url) {
                        return;
                      }

                      await Linking.openURL(url);
                    }}
                    variant="outline"
                  >
                    View Proof
                  </Button>
                ) : null}
                {payment.status === 'confirmed' ? (
                  <Button
                    onPress={async () => {
                      try {
                        await downloadPaymentReceiptPdf({
                          amount: payment.amount,
                          createdAt: payment.created_at,
                          managerName: profile?.full_name || user.email || null,
                          notes: payment.notes,
                          paymentId: payment.id,
                          propertyTitle: payment.property_title || 'Property payment',
                          status: payment.status,
                          tenantName: payment.tenant_name || payment.tenant_id,
                        });
                      } catch (error) {
                        Alert.alert(
                          'Could not prepare receipt',
                          error instanceof Error ? error.message : 'Please try again.',
                        );
                      }
                    }}
                    variant="secondary"
                  >
                    Download Receipt
                  </Button>
                ) : null}
                {payment.status === 'uploaded' || payment.status === 'pending' ? (
                  <View style={styles.buttonCluster}>
                    <Button
                      onPress={async () => {
                        try {
                          await confirmManagerPaymentWorkflow(payment);
                          await dashboardQuery.refetch();
                        } catch (error) {
                          Alert.alert(
                            'Could not confirm payment',
                            error instanceof Error ? error.message : 'Please try again.',
                          );
                        }
                      }}
                    >
                      Confirm
                    </Button>
                    <Button
                      onPress={async () => {
                        try {
                          await rejectManagerPaymentWorkflow(payment);
                          await dashboardQuery.refetch();
                        } catch (error) {
                          Alert.alert(
                            'Could not reject payment',
                            error instanceof Error ? error.message : 'Please try again.',
                          );
                        }
                      }}
                      variant="destructive"
                    >
                      Reject
                    </Button>
                  </View>
                ) : null}
              </View>
            ))
          )}
        </>
      ) : null}
    </ScrollableScreenContainer>
  );
}

const styles = StyleSheet.create({
  buttonCluster: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  content: {
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  cardText: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 22,
  },
  dangerText: {
    color: colors.error,
  },
  emptyInsightPanel: {
    alignItems: 'center',
    backgroundColor: emptyInsightBackground,
    borderRadius: radii.card,
    justifyContent: 'center',
    minHeight: 96,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  emptyInsightText: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  emphasisText: {
    color: colors.primary,
    fontFamily: typography.bodyStrong,
    fontSize: 13,
  },
  largeValue: {
    color: colors.primary,
    fontFamily: typography.display,
    fontSize: 32,
  },
  listCopy: {
    flex: 1,
    gap: 4,
  },
  listRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  listTitle: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 15,
  },
  miniStat: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    padding: spacing.md,
  },
  statLabel: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
  },
  statValue: {
    color: colors.primary,
    fontFamily: typography.display,
    fontSize: 24,
  },
  metricBlock: {
    flex: 1,
    gap: 4,
  },
  metricLabel: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metricValue: {
    color: colors.primary,
    fontFamily: typography.bodyStrong,
    fontSize: 18,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
