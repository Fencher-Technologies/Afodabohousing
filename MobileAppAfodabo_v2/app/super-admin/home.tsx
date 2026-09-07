/**
 * Super Admin overview — platform-wide counts.
 *
 * Mirrors the stats block of the web SuperAdminDashboard, reading the same
 * /admin/stats and /boosts/stats endpoints.
 */

import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import {
  AlertCircle,
  Building2,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react-native";

import { Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { Card } from "@/src/components/Card";
import { Button } from "@/src/components/Button";
import { LoadingState } from "@/src/components/LoadingState";
import { ErrorState } from "@/src/components/ErrorState";
import { useAdminStats, useBoostStats, usePendingManagers } from "@/src/hooks/useAdmin";
import { formatMoney } from "@/src/utils/format";

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <Card padding="md" style={styles.stat}>
      <View style={styles.statIcon}>{icon}</View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

export default function SuperAdminHome() {
  const stats = useAdminStats();
  const boosts = useBoostStats();
  const pending = usePendingManagers();

  if (stats.isLoading) return <LoadingState message="Loading platform stats…" />;
  if (stats.isError) {
    return <ErrorState description="Could not load platform stats." onRetry={() => stats.refetch()} />;
  }

  const s = stats.data;
  const pendingCount = pending.data?.length ?? 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={stats.isFetching}
          onRefresh={() => {
            stats.refetch();
            boosts.refetch();
            pending.refetch();
          }}
        />
      }
    >
      <Text style={styles.heading}>Platform Overview</Text>

      {pendingCount > 0 && (
        <Card padding="md" style={styles.pendingCard}>
          <View style={styles.pendingHeader}>
            <AlertCircle size={18} color={Colors.warning} />
            <Text style={styles.pendingTitle}>
              {pendingCount} manager{pendingCount === 1 ? "" : "s"} awaiting approval
            </Text>
          </View>
          <Button
            label="Review now"
            variant="outline"
            onPress={() => router.push("/super-admin/managers?filter=pending")}
            fullWidth
          />
        </Card>
      )}

      <Text style={styles.sectionTitle}>People</Text>
      <View style={styles.grid}>
        <Stat
          label="Managers"
          value={s?.total_managers ?? 0}
          icon={<Users size={18} color={Colors.primary} />}
        />
        <Stat
          label="Active managers"
          value={s?.active_managers ?? 0}
          icon={<UserCheck size={18} color={Colors.success} />}
        />
        <Stat
          label="Tenants"
          value={s?.total_tenants ?? 0}
          icon={<Users size={18} color={Colors.accent} />}
        />
        <Stat
          label="New this month"
          value={s?.new_this_month ?? 0}
          icon={<TrendingUp size={18} color={Colors.gold} />}
        />
      </View>

      <Text style={styles.sectionTitle}>Properties</Text>
      <View style={styles.grid}>
        <Stat
          label="Total"
          value={s?.total_properties ?? 0}
          icon={<Building2 size={18} color={Colors.primary} />}
        />
        <Stat
          label="Occupied"
          value={s?.occupied_properties ?? 0}
          icon={<Building2 size={18} color={Colors.success} />}
        />
        <Stat
          label="Vacant"
          value={s?.vacant_properties ?? 0}
          icon={<Building2 size={18} color={Colors.textMuted} />}
        />
        <Stat
          label="Occupancy"
          value={`${Math.round(s?.occupancy_rate ?? 0)}%`}
          icon={<TrendingUp size={18} color={Colors.accent} />}
        />
      </View>

      {boosts.data && (
        <>
          <Text style={styles.sectionTitle}>Boosts</Text>
          <View style={styles.grid}>
            <Stat
              label="Active"
              value={boosts.data.active_boosts ?? 0}
              icon={<TrendingUp size={18} color={Colors.gold} />}
            />
            <Stat
              label="Revenue"
              value={formatMoney(boosts.data.total_revenue ?? 0, "UGX")}
              icon={<TrendingUp size={18} color={Colors.success} />}
            />
          </View>
        </>
      )}

      <Text style={styles.footnote}>
        Boost and subscription revenue is charged in UGX. Rent figures are not shown
        here because properties may be listed in different currencies.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  heading: {
    fontSize: FontSize.title,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  sectionTitle: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: Spacing.sm,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  stat: { flexGrow: 1, flexBasis: "45%", gap: 4 },
  statIcon: { marginBottom: 2 },
  statValue: {
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  statLabel: { fontSize: FontSize.caption, color: Colors.textSecondary },
  pendingCard: { borderLeftWidth: 3, borderLeftColor: Colors.warning, gap: Spacing.sm },
  pendingHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  pendingTitle: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    flex: 1,
  },
  footnote: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
});
