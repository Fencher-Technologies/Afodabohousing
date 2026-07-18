import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import React, { useState } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, View } from 'react-native';
import {
  AdvancedFilterModal,
  type ListFilters,
} from '../components/advanced-filter-modal';
import { Badge } from '../components/badge';
import { Button } from '../components/button';
import { EmptyState } from '../components/empty-state';
import { ErrorState } from '../components/error-state';
import { LoadingState } from '../components/loading-state';
import { ScrollableScreenContainer } from '../components/scrollable-screen-container';
import { useAuth } from '../context/auth-context';
import { useManagerTenancies } from '../hooks/manager/use-manager-tenancies';
import { sendRentReminder } from '../services/manager';
import { colors, radii, spacing, typography } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';
import { formatDateLabel, formatUGXFull } from '../utils/format';
import { getTenancyHealth } from '../utils/tenancy-health';

export function ManagerTenanciesScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { profile, user } = useAuth();
  const [filters, setFilters] = useState<ListFilters>({});
  const tenanciesQuery = useManagerTenancies(user?.id, filters);
  const [sendingId, setSendingId] = useState<string | null>(null);

  if (!user) {
    return (
      <ScrollableScreenContainer>
        <EmptyState
          description="Sign in as a house manager to review tenancy records."
          title="Tenancies unavailable"
        />
      </ScrollableScreenContainer>
    );
  }

  if (tenanciesQuery.isLoading) {
    return <LoadingState message="Loading tenancies" />;
  }

  if (tenanciesQuery.isError) {
    return (
      <ScrollableScreenContainer>
        <ErrorState
          description={
            tenanciesQuery.error instanceof Error
              ? tenanciesQuery.error.message
              : 'Please try again.'
          }
          onRetry={() => {
            void tenanciesQuery.refetch();
          }}
          title="Could not load tenancies"
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
            void tenanciesQuery.refetch();
          }}
          refreshing={tenanciesQuery.isRefetching}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.actionCard}>
        <Text style={styles.cardText}>
          {tenanciesQuery.tenancies.length} tenancy
          {tenanciesQuery.tenancies.length === 1 ? '' : 'ies'} in your account.
        </Text>
        <View style={styles.actionRow}>
          <View style={styles.actionFlex}>
            <Button onPress={() => navigation.navigate('ManagerCreateTenancy')}>Create Tenancy</Button>
          </View>
          <View style={styles.actionFlex}>
            <Button onPress={() => navigation.navigate('SendInvite')} variant="outline">Send Invite</Button>
          </View>
        </View>
      </View>

      <AdvancedFilterModal
        filters={filters}
        onApply={setFilters}
        onClear={() => setFilters({})}
        showDateRange
        showOccupancy
        showProperty
        showSearch
        showTenant
        title="Filter Tenancies"
      />

      {tenanciesQuery.tenancies.length === 0 ? (
        <EmptyState
          description="Linked tenant records will appear here once a tenancy is created."
          title="No tenancies yet"
        />
      ) : (
        tenanciesQuery.tenancies.map((tenancy) => {
          const health = tenancy.status === 'active'
            ? getTenancyHealth(tenancy.rent_start_date, tenancy.rent_end_date)
            : null;

          return (
            <View
              key={tenancy.id}
              style={[
                styles.card,
                health && { borderLeftWidth: 4, borderLeftColor: health.color },
              ]}
            >
              <Text style={styles.rowTitle}>{tenancy.property_title || tenancy.property_id}</Text>
              <Text style={styles.cardText}>Tenant: {tenancy.tenant_name || tenancy.tenant_id}</Text>
              <Text style={styles.cardText}>Phone: {tenancy.tenant_phone || 'Not available'}</Text>
              <Text style={styles.cardText}>Rent: {formatUGXFull(tenancy.rent_amount)}</Text>
              <Text style={styles.cardText}>
                {formatDateLabel(tenancy.rent_start_date)} to {formatDateLabel(tenancy.rent_end_date)}
              </Text>
              <View style={styles.statusRow}>
                <Badge tone={tenancy.status === 'active' ? 'success' : 'default'}>
                  {tenancy.status}
                </Badge>
                {health ? (
                  <Text
                    style={[
                      styles.healthText,
                      { color: health.color },
                      health.status === 'expired' && { textDecorationLine: 'line-through' },
                    ]}
                  >
                    {health.daysRemaining > 0
                      ? `${health.daysRemaining} days remaining`
                      : 'Expired'}
                  </Text>
                ) : null}
              </View>
              <View style={styles.buttonCluster}>
                <Button
                  onPress={() =>
                    navigation.navigate('ManagerTenancyDetails', {
                      tenancyId: tenancy.id,
                    })
                  }
                  variant="outline"
                >
                  Open Tenancy
                </Button>
                {tenancy.status === 'active' ? (
                  <Button
                    disabled={!tenancy.tenant_phone || sendingId === tenancy.id}
                    onPress={async () => {
                      try {
                        setSendingId(tenancy.id);
                        await sendRentReminder(tenancy, profile?.phone || user.email || null);
                        Alert.alert(
                          'Reminder sent',
                          `An SMS reminder was sent to ${tenancy.tenant_name || 'the tenant'}.`,
                        );
                      } catch (error) {
                        Alert.alert(
                          'Reminder failed',
                          error instanceof Error ? error.message : 'Please try again.',
                        );
                      } finally {
                        setSendingId(null);
                      }
                    }}
                  >
                    {sendingId === tenancy.id ? 'Sending...' : 'Send Reminder'}
                  </Button>
                ) : null}
              </View>
            </View>
          );
        })
      )}
    </ScrollableScreenContainer>
  );
}

const styles = StyleSheet.create({
  actionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  buttonCluster: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
    lineHeight: 22,
  },
  content: {
    gap: spacing.lg,
  },
  rowTitle: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 22,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionFlex: {
    flex: 1,
  },
  healthText: {
    fontFamily: typography.bodyStrong,
    fontSize: 13,
  },
});
