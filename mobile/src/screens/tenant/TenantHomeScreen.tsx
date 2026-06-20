import { RefreshControl, StyleSheet, View } from 'react-native';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { LoadingState } from '../../components/common/LoadingState';
import { PageHeader } from '../../components/common/PageHeader';
import { ScrollableScreenContainer } from '../../components/common/ScrollableScreenContainer';
import { TenantPaymentPreviewCard } from '../../components/tenant/TenantPaymentPreviewCard';
import { TenantQuickActions } from '../../components/tenant/TenantQuickActions';
import { TenantRentSummaryCard } from '../../components/tenant/TenantRentSummaryCard';
import { TenantTenancyCard } from '../../components/tenant/TenantTenancyCard';
import { useAuth } from '../../context/AuthContext';
import { useTenantDashboard } from '../../hooks/tenant/useTenantDashboard';
import { colors, spacing } from '../../theme';

export function TenantHomeScreen() {
  const { user } = useAuth();
  const dashboardQuery = useTenantDashboard(user?.id);

  if (!user) {
    return (
      <View style={styles.screen}>
        <EmptyState
          description="Sign in as a tenant to view your tenancy, rent status, and recent payments."
          title="Tenant home unavailable"
        />
      </View>
    );
  }

  if (dashboardQuery.isLoading) {
    return <LoadingState message="Loading your tenant home" />;
  }

  if (dashboardQuery.isError) {
    return (
      <View style={styles.screen}>
        <ErrorState
          description={
            dashboardQuery.error instanceof Error
              ? dashboardQuery.error.message
              : 'Please try again.'
          }
          onRetry={() => {
            void dashboardQuery.refetch();
          }}
          title="Could not load tenant home"
        />
      </View>
    );
  }

  const summary = dashboardQuery.data?.summary;

  if (!summary) {
    return (
      <View style={styles.screen}>
        <EmptyState
          description="We could not find tenant data for this account yet."
          title="No tenant data"
        />
      </View>
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
      <PageHeader
        label="Tenant Home"
        subtitle="View your tenancy, rent status, payments, and messages."
        title="Home"
      />

      {summary.rentStatus === 'no_tenancy' ? (
        <EmptyState
          description="Your account is ready, but no active tenancy is linked yet. Ask your house manager to connect your account."
          title="No active tenancy"
        />
      ) : null}

      <TenantRentSummaryCard summary={summary} />
      <TenantTenancyCard tenancy={summary.activeTenancy} />
      <TenantPaymentPreviewCard payments={summary.recentPayments} />
      <TenantQuickActions />
    </ScrollableScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
