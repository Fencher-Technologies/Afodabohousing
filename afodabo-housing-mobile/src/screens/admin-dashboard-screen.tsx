import React, { useMemo, useState } from 'react';
import { Alert, Linking, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../components/badge';
import { Button } from '../components/button';
import { EmptyState } from '../components/empty-state';
import { ErrorState } from '../components/error-state';
import { InputField } from '../components/input-field';
import { LoadingState } from '../components/loading-state';
import { PageHeader } from '../components/page-header';
import { ScrollableScreenContainer } from '../components/scrollable-screen-container';
import { SegmentedControl } from '../components/segmented-control';
import { useAuth } from '../context/auth-context';
import { useAdminDashboard } from '../hooks/admin/use-admin-dashboard';
import {
  activateProperty,
  confirmAdminPayment,
  deactivateProperty,
  deleteAdminProperty,
  rejectAdminPayment,
  saveAdminProperty,
  terminateTenancy,
} from '../services/admin';
import { resolvePaymentProofUrl } from '../services/platform';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { formatDateLabel, formatUGXFull } from '../utils/format';
import type { PropertyRow } from '../types/supabase';

type AdminView = 'overview' | 'payments' | 'properties' | 'tenancies' | 'users';

export function AdminDashboardScreen() {
  const { user } = useAuth();
  const [selectedView, setSelectedView] = useState<AdminView>('overview');
  const [editingProperty, setEditingProperty] = useState<PropertyRow | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDistrict, setEditDistrict] = useState('');
  const [editRent, setEditRent] = useState('');
  const [editStatus, setEditStatus] = useState<PropertyRow['status']>('available');
  const [userSearch, setUserSearch] = useState('');

  const dashboardQuery = useAdminDashboard(Boolean(user?.id));

  const stats = useMemo(() => {
    const properties = dashboardQuery.data?.properties ?? [];
    const payments = dashboardQuery.data?.payments ?? [];
    const tenancies = dashboardQuery.data?.tenancies ?? [];
    const users = dashboardQuery.data?.users ?? [];
    return {
      managers: users.filter((entry) => entry.role === 'house_manager').length,
      paymentsPending: payments.filter(
        (entry) => entry.status === 'uploaded' || entry.status === 'pending',
      ).length,
      revenue: payments
        .filter((entry) => entry.status === 'confirmed')
        .reduce((sum, entry) => sum + entry.amount, 0),
      tenants: users.filter((entry) => entry.role === 'tenant').length,
      totalProperties: properties.length,
      totalUsers: users.length,
      activeTenancies: tenancies.filter((entry) => entry.status === 'active').length,
    };
  }, [dashboardQuery.data]);

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();

    if (!query) {
      return dashboardQuery.data?.users ?? [];
    }

    return (dashboardQuery.data?.users ?? []).filter((entry) => {
      const name = entry.full_name?.toLowerCase() ?? '';
      const phone = entry.phone?.toLowerCase() ?? '';
      const role = entry.role?.toLowerCase() ?? '';
      return name.includes(query) || phone.includes(query) || role.includes(query);
    });
  }, [dashboardQuery.data?.users, userSearch]);

  if (!user) {
    return (
      <ScrollableScreenContainer>
        <EmptyState
          description="Sign in as an admin to oversee users, properties, tenancies, and payments."
          title="Admin dashboard unavailable"
        />
      </ScrollableScreenContainer>
    );
  }

  if (dashboardQuery.isLoading) {
    return <LoadingState message="Loading admin dashboard" />;
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
          title="Could not load admin dashboard"
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
      <PageHeader title="Dashboard" />

      {dashboardQuery.data?.limitedAccess ? (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Limited Admin Access</Text>
          <Text style={styles.cardText}>
            The Python backend currently exposes only signed-in user visibility for admin on mobile.
            Use the web dashboard for platform-wide property, tenancy, and payment management until
            admin endpoints are expanded.
          </Text>
        </View>
      ) : null}

      <SegmentedControl
        onChange={setSelectedView}
        options={[
          { label: 'Overview', value: 'overview' },
          { label: 'Users', value: 'users' },
          { label: 'Properties', value: 'properties' },
          { label: 'Tenancies', value: 'tenancies' },
          { label: 'Payments', value: 'payments' },
        ]}
        value={selectedView}
      />

      {selectedView === 'overview' ? (
        <>
          <View style={styles.statsRow}>
            <View style={styles.miniStat}>
              <Text style={styles.statValue}>{stats.totalUsers}</Text>
              <Text style={styles.statLabel}>Total users</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={styles.statValue}>{stats.totalProperties}</Text>
              <Text style={styles.statLabel}>Properties</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.miniStat}>
              <Text style={styles.statValue}>{stats.activeTenancies}</Text>
              <Text style={styles.statLabel}>Active tenancies</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={styles.statValue}>{stats.paymentsPending}</Text>
              <Text style={styles.statLabel}>Payments waiting</Text>
            </View>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Confirmed Revenue</Text>
            <Text style={styles.largeValue}>{formatUGXFull(stats.revenue)}</Text>
            <Text style={styles.cardText}>
              {stats.tenants} tenants and {stats.managers} house managers are currently registered.
            </Text>
          </View>
        </>
      ) : null}

      {selectedView === 'users' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Registered Users</Text>
          <InputField
            label="Search users"
            onChangeText={setUserSearch}
            placeholder="Search by name, phone, or role"
            value={userSearch}
          />
          {filteredUsers.length === 0 ? (
            <Text style={styles.cardText}>No users matched your search.</Text>
          ) : (
            filteredUsers.map((entry) => (
              <View key={entry.id} style={styles.rowCard}>
                <Text style={styles.rowTitle}>{entry.full_name || entry.id}</Text>
                <Text style={styles.cardText}>{entry.phone || 'No phone recorded'}</Text>
                <Badge
                  tone={
                    entry.role === 'admin'
                      ? 'gold'
                      : entry.role === 'house_manager'
                        ? 'primary'
                        : 'default'
                  }
                >
                  {entry.role || 'unknown'}
                </Badge>
              </View>
            ))
          )}
        </View>
      ) : null}

      {selectedView === 'properties' ? (
        <>
          {editingProperty ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Edit Property</Text>
              <InputField label="Title" onChangeText={setEditTitle} value={editTitle} />
              <InputField label="District" onChangeText={setEditDistrict} value={editDistrict} />
              <InputField
                keyboardType="numeric"
                label="Rent amount"
                onChangeText={setEditRent}
                value={editRent}
              />
              <SegmentedControl
                onChange={setEditStatus}
                options={[
                  { label: 'Available', value: 'available' },
                  { label: 'Occupied', value: 'occupied' },
                  { label: 'Inactive', value: 'inactive' },
                ]}
                value={editStatus}
              />
              <Button
                onPress={async () => {
                  await saveAdminProperty(editingProperty.id, {
                    district: editDistrict,
                    rent_amount: Number(editRent),
                    status: editStatus,
                    title: editTitle,
                  });
                  setEditingProperty(null);
                  await dashboardQuery.refetch();
                }}
              >
                Save Changes
              </Button>
              <Button onPress={() => setEditingProperty(null)} variant="outline">
                Cancel
              </Button>
            </View>
          ) : null}

          {(dashboardQuery.data?.properties ?? []).map((property) => (
            <View key={property.id} style={styles.card}>
              <Text style={styles.rowTitle}>{property.title}</Text>
              <Text style={styles.cardText}>{property.district}</Text>
              <Text style={styles.cardText}>{formatUGXFull(property.rent_amount)}</Text>
              <Badge
                tone={
                  property.status === 'available'
                    ? 'success'
                    : property.status === 'inactive'
                      ? 'warning'
                      : 'default'
                }
              >
                {property.status}
              </Badge>
              <View style={styles.buttonCluster}>
                <Button
                  onPress={() => {
                    setEditingProperty(property);
                    setEditTitle(property.title);
                    setEditDistrict(property.district);
                    setEditRent(String(property.rent_amount));
                    setEditStatus(property.status);
                  }}
                  variant="outline"
                >
                  Edit
                </Button>
                {property.status === 'inactive' ? (
                  <Button
                    onPress={async () => {
                      await activateProperty(property.id);
                      await dashboardQuery.refetch();
                    }}
                  >
                    Activate
                  </Button>
                ) : (
                  <Button
                    onPress={async () => {
                      await deactivateProperty(property.id);
                      await dashboardQuery.refetch();
                    }}
                    variant="secondary"
                  >
                    Deactivate
                  </Button>
                )}
                <Button
                  onPress={() =>
                    Alert.alert('Delete property', `Delete ${property.title}?`, [
                      { style: 'cancel', text: 'Cancel' },
                      {
                        style: 'destructive',
                        text: 'Delete',
                        onPress: async () => {
                          await deleteAdminProperty(property.id);
                          await dashboardQuery.refetch();
                        },
                      },
                    ])
                  }
                  variant="destructive"
                >
                  Delete
                </Button>
              </View>
            </View>
          ))}
        </>
      ) : null}

      {selectedView === 'tenancies' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>All Tenancies</Text>
          {(dashboardQuery.data?.tenancies ?? []).map((tenancy) => (
            <View key={tenancy.id} style={styles.rowCard}>
              <Text style={styles.rowTitle}>{tenancy.id}</Text>
              <Text style={styles.cardText}>{formatUGXFull(tenancy.rent_amount)}</Text>
              <Text style={styles.cardText}>
                {formatDateLabel(tenancy.rent_start_date)} to{' '}
                {formatDateLabel(tenancy.rent_end_date)}
              </Text>
              <Badge tone={tenancy.status === 'active' ? 'success' : 'default'}>
                {tenancy.status}
              </Badge>
              {tenancy.status === 'active' ? (
                <Button
                  onPress={async () => {
                    await terminateTenancy(tenancy.id);
                    await dashboardQuery.refetch();
                  }}
                  variant="destructive"
                >
                  Terminate
                </Button>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {selectedView === 'payments' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Queue</Text>
          {(dashboardQuery.data?.payments ?? []).map((payment) => (
            <View key={payment.id} style={styles.rowCard}>
              <Text style={styles.rowTitle}>{formatUGXFull(payment.amount)}</Text>
              <Text style={styles.cardText}>{payment.notes || 'No notes supplied'}</Text>
              <Text style={styles.cardText}>{formatDateLabel(payment.created_at)}</Text>
              <Badge
                tone={
                  payment.status === 'confirmed'
                    ? 'success'
                    : payment.status === 'rejected'
                      ? 'warning'
                      : 'default'
                }
              >
                {payment.status}
              </Badge>
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
              {payment.status === 'uploaded' || payment.status === 'pending' ? (
                <View style={styles.buttonCluster}>
                  <Button
                    onPress={async () => {
                      await confirmAdminPayment(payment.id);
                      await dashboardQuery.refetch();
                    }}
                  >
                    Confirm
                  </Button>
                  <Button
                    onPress={async () => {
                      await rejectAdminPayment(payment.id);
                      await dashboardQuery.refetch();
                    }}
                    variant="destructive"
                  >
                    Reject
                  </Button>
                </View>
              ) : null}
            </View>
          ))}
        </View>
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
  largeValue: {
    color: colors.primary,
    fontFamily: typography.display,
    fontSize: 32,
  },
  infoCard: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  infoTitle: {
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
  rowCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.card,
    gap: 6,
    padding: spacing.md,
  },
  rowTitle: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 14,
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
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
