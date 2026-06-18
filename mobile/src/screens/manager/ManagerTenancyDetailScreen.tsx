import type { StackScreenProps } from '@react-navigation/stack';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { LoadingState } from '../../components/common/LoadingState';
import { ManagerTenancyDetailCard } from '../../components/manager/ManagerTenancyDetailCard';
import { useAuth } from '../../context/AuthContext';
import { useManagerTenancy } from '../../hooks/manager/useManagerTenancies';
import { colors, spacing, typography } from '../../theme';
import type { ManagerTenanciesStackParamList } from '../../types/navigation.types';
import { formatStatusLabel } from '../../utils/format';

export function ManagerTenancyDetailScreen({
  route,
}: StackScreenProps<ManagerTenanciesStackParamList, 'ManagerTenancyDetail'>) {
  const { user } = useAuth();
  const tenancyQuery = useManagerTenancy(user?.id, route.params.tenancyId);

  if (!user) {
    return (
      <View style={styles.screen}>
        <EmptyState
          description="Sign in as a house manager to view this tenancy."
          title="Tenancy unavailable"
        />
      </View>
    );
  }

  if (tenancyQuery.isLoading) {
    return <LoadingState message="Loading tenancy" />;
  }

  if (tenancyQuery.isError) {
    return (
      <View style={styles.screen}>
        <ErrorState
          description={
            tenancyQuery.error instanceof Error ? tenancyQuery.error.message : 'Please try again.'
          }
          onRetry={() => {
            void tenancyQuery.refetch();
          }}
          title="Could not load tenancy"
        />
      </View>
    );
  }

  const tenancy = tenancyQuery.data;

  if (!tenancy) {
    return (
      <View style={styles.screen}>
        <EmptyState
          description="This tenancy was not found for your manager account."
          title="Tenancy not found"
        />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          onRefresh={() => {
            void tenancyQuery.refetch();
          }}
          refreshing={tenancyQuery.isRefetching}
          tintColor={colors.primary}
        />
      }
      style={styles.screen}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Tenancy Preview</Text>
        <Text style={styles.title}>{tenancy.tenant_name || 'Tenant'}</Text>
        <Text style={styles.subtitle}>
          {formatStatusLabel(tenancy.status)} tenancy for{' '}
          {tenancy.property_title || 'your property'}.
        </Text>
      </View>

      <ManagerTenancyDetailCard tenancy={tenancy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  eyebrow: {
    color: colors.primary,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  header: {
    gap: spacing.xs,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 24,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 34,
  },
});
