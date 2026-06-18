import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorState } from '../../components/common/ErrorState';
import { LoadingState } from '../../components/common/LoadingState';
import { ManagerActivityCard } from '../../components/manager/ManagerActivityCard';
import { ManagerEmptyState } from '../../components/manager/ManagerEmptyState';
import { ManagerHomeHeader } from '../../components/manager/ManagerHomeHeader';
import { ManagerSectionHeader } from '../../components/manager/ManagerSectionHeader';
import { ManagerSummaryCard } from '../../components/manager/ManagerSummaryCard';
import { useAuth } from '../../context/AuthContext';
import { useManagerPreview } from '../../context/ManagerPreviewContext';
import { useManagerDashboard } from '../../hooks/manager/useManagerDashboard';
import { colors, spacing } from '../../theme';
import { getManagerBottomContentPadding } from '../../utils/manager-layout';

export function ManagerHomeScreen() {
  const { profile, user } = useAuth();
  const preview = useManagerPreview();
  const insets = useSafeAreaInsets();
  const dashboardQuery = useManagerDashboard(user?.id);

  if (!user && preview.enabled) {
    return (
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: getManagerBottomContentPadding(insets.bottom) },
        ]}
        style={styles.screen}
      >
        <ManagerHomeHeader displayName="Manager Preview" />

        <View style={styles.body}>
          <ManagerEmptyState
            description="Manager signup is temporarily blocked by the backend trigger, so this preview shows the mobile manager workspace layout without live account data."
            icon="phone-portrait-outline"
            title="Preview mode"
          />

          <View style={styles.section}>
            <ManagerSectionHeader
              icon="shield-checkmark-outline"
              subtitle="The live dashboard will show properties, active tenancies, proof checks, and unread messages."
              title="Workspace overview"
            />
            <ManagerSummaryCard
              summary={{
                activeProperties: 0,
                activeTenancies: 0,
                pendingProofs: 0,
                totalProperties: 0,
                unreadMessages: 0,
              }}
            />
          </View>

          <View style={styles.section}>
            <ManagerSectionHeader
              icon="pulse-outline"
              subtitle="Tenant messages and rent proof activity will appear here once the account is live."
              title="Latest activity"
            />
            <ManagerEmptyState
              description="No live activity is loaded in preview mode."
              icon="pulse-outline"
              title="Activity preview"
            />
          </View>
        </View>
      </ScrollView>
    );
  }

  if (!user) {
    return (
      <View style={styles.screen}>
        <ManagerEmptyState
          description="Sign in as a house manager to view your property and payment summary."
          icon="home-outline"
          title="Manager home unavailable"
        />
      </View>
    );
  }

  if (dashboardQuery.isLoading) {
    return <LoadingState message="Loading manager home" />;
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
          title="Could not load manager home"
        />
      </View>
    );
  }

  const dashboard = dashboardQuery.data;

  if (!dashboard) {
    return (
      <View style={styles.screen}>
        <ManagerEmptyState
          description="We could not find manager data for this account yet."
          icon="analytics-outline"
          title="No manager data"
        />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingBottom: getManagerBottomContentPadding(insets.bottom) },
      ]}
      refreshControl={
        <RefreshControl
          onRefresh={() => {
            void dashboardQuery.refetch();
          }}
          refreshing={dashboardQuery.isRefetching}
          tintColor={colors.primary}
        />
      }
      style={styles.screen}
    >
      <ManagerHomeHeader displayName={profile?.full_name || user.email || 'Manager'} />

      <View style={styles.body}>
        {dashboard.properties.length === 0 ? (
          <ManagerEmptyState
            description="Your manager account is ready. Add and edit properties from the web app, then use mobile for quick daily follow-up."
            icon="business-outline"
            title="No properties yet"
          />
        ) : null}

        <View style={styles.section}>
          <ManagerSectionHeader
            icon="shield-checkmark-outline"
            subtitle="Proofs, properties, tenancies, and unread messages."
            title="Workspace overview"
          />
          <ManagerSummaryCard summary={dashboard.summary} />
        </View>

        <View style={styles.section}>
          <ManagerSectionHeader
            icon="pulse-outline"
            subtitle="Recent movement across your manager account."
            title="Latest activity"
          />
          <ManagerActivityCard dashboard={dashboard} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  content: {
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
