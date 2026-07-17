import { useMemo, useState, useCallback } from "react";
import { StyleSheet, Text, View, Pressable, FlatList } from "react-native";
import { router } from "expo-router";
import {
  Plus,
  AlertTriangle,
  Clock,
  TrendingUp,
  Users,
  FileText,
  Building2,
  Crown,
  ChevronRight,
  Bell,
  Sparkles,
} from "lucide-react-native";
import type { ReactNode } from "react";

import { Colors, FontSize, FontWeight, Radii, Spacing, ToneColors, Shadows } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Card } from "@/src/components/Card";
import { Badge } from "@/src/components/Badge";
import { SearchInput } from "@/src/components/SearchInput";
import { LoadingState } from "@/src/components/LoadingState";
import { useAuth } from "@/src/context/auth-context";
import { useDashboardStats } from "@/src/hooks/useDashboard";
import { useTenancyList } from "@/src/hooks/useTenancies";
import { useRefresh } from "@/src/hooks/useRefresh";
import { fromBackendLease } from "@/src/mappers/tenancy-mapper";
import { formatUGXShort } from "@/src/utils/format";
import type { AlertItem } from "@/src/types";

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function ManagerDashboardScreen() {
  const { subscription, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useDashboardStats();
  const { data: tenanciesData, isLoading: tenanciesLoading, refetch: refetchTenancies } = useTenancyList();

  const tenancies = tenanciesData?.items || [];
  const isLoading = statsLoading || tenanciesLoading;

  const { refreshing, onRefresh } = useRefresh({
    refetches: [refetchStats, refetchTenancies],
  });

  const firstName = (user?.full_name || "").toString().trim().split(" ")[0];
  const greeting = greetingForHour(new Date().getHours());

  // Tenants who actually owe money (outstanding balance) — the real "needs
  // attention" signal, independent of lease end dates.
  const needsAttention = useMemo(
    () =>
      tenancies
        .map((t) => fromBackendLease(t as never))
        .filter((t) => (t.balance_due ?? 0) > 0 || t.is_overdue),
    [tenancies]
  );
  const needsAttentionCount = needsAttention.length;

  const alerts: AlertItem[] = useMemo(() => {
    const items: AlertItem[] = [];
    if (needsAttentionCount > 0) {
      items.push({
        id: "outstanding",
        tone: "danger",
        count: needsAttentionCount,
        label: "Outstanding",
        action_label: "View",
      });
    }
    if ((stats?.pending_review_count ?? 0) > 0) {
      items.push({
        id: "pending",
        tone: "warning",
        count: stats?.pending_review_count ?? 0,
        label: "Pending review",
        action_label: "Review",
      });
    }
    items.push({
      id: "tenancies",
      tone: "info",
      count: stats?.total_tenancies || 0,
      label: "Tenancies",
      action_label: "View",
    });
    return items;
  }, [needsAttentionCount, stats]);

  const statsCards = useMemo(() => [
    { label: "Active\nTenants", value: stats?.active_tenants ?? 0, icon: <Users size={18} color={Colors.primary} />, tone: "primary" as const },
    { label: "Outstanding", value: needsAttentionCount, icon: <AlertTriangle size={18} color={Colors.danger} />, tone: "danger" as const },
    { label: "Pending\nReview", value: stats?.pending_review_count ?? 0, icon: <Clock size={18} color={Colors.warning} />, tone: "warning" as const },
    { label: "Collected\nThis Month", value: formatUGXShort(stats?.collected_this_month ?? 0), icon: <TrendingUp size={18} color={Colors.accent} />, tone: "accent" as const },
  ], [stats, needsAttentionCount]);

  const searchResults = useMemo(
    () =>
      searchQuery.length > 0
        ? tenancies
            .map((t) => fromBackendLease(t as never))
            .filter(
              (t) =>
                (t.tenant_name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                (t.property_title ?? "").toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((t) => ({
              id: t.id,
              tenant_name: t.tenant_name,
              property_title: t.property_title,
              unit_label: t.unit_label,
              balance_due: t.balance_due,
              status: t.status,
              health: t.health,
            }))
        : [],
    [searchQuery, tenancies]
  );

  const handleAlertPress = useCallback((alert: AlertItem) => {
    router.push("/manager/tenancies");
  }, []);

  const renderAlert = ({ item }: { item: AlertItem }) => {
    const colors = ToneColors[item.tone];
    return (
      <Pressable
        onPress={() => handleAlertPress(item)}
        style={({ pressed }) => [styles.alertPill, { backgroundColor: colors.bg, opacity: pressed ? 0.8 : 1 }]}
        accessibilityRole="button"
        accessibilityLabel={`${item.count} ${item.label}`}
      >
        <View style={[styles.alertDot, { backgroundColor: colors.fg }]} />
        <Text style={[styles.alertText, { color: colors.fg }]}>
          {item.count} {item.label}
        </Text>
        <ChevronRight size={16} color={colors.fg} />
      </Pressable>
    );
  };

  if (isLoading) {
    return <LoadingState message="Loading dashboard…" />;
  }

  const isSubActive = subscription?.status === "active";

  return (
    <Screen scroll onRefresh={onRefresh} refreshing={refreshing}>
      {/* Hero header */}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>
              {firstName ? `${greeting}, ${firstName}` : greeting}
            </Text>
            <Text style={styles.headerTitle}>Dashboard</Text>
          </View>

          <Pressable
            onPress={() => router.push("/subscription")}
            style={[styles.subBadge, isSubActive ? styles.subBadgeActive : styles.subBadgeExpired]}
            accessibilityRole="button"
            accessibilityLabel={`Subscription: ${isSubActive ? `${subscription?.days_remaining} days left` : "Expired"}`}
          >
            <Crown size={14} color={Colors.accent} />
            <Text style={[styles.subBadgeText, { color: Colors.accent }]}>
              {isSubActive ? `${subscription?.days_remaining}d left` : "Expired"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <SearchInput
            value={searchQuery}
            onChangeText={(t) => {
              setSearchQuery(t);
              setShowSearch(t.length > 0);
            }}
            placeholder="Search tenants or properties…"
          autoFocus={false}
          />
        </View>
      </View>

      {showSearch && searchResults.length > 0 && (
        <View style={styles.searchDropdown}>
          <Text style={styles.searchDropdownTitle}>
            {searchResults.length} result{searchResults.length === 1 ? "" : "s"}
          </Text>
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setShowSearch(false);
                  router.push(`/tenancy-detail?id=${item.id}`);
                }}
                style={styles.searchResult}
                accessibilityRole="button"
                accessibilityLabel={`${item.tenant_name}, ${item.property_title}`}
              >
                <View style={styles.searchResultLeft}>
                  <Text style={styles.searchName}>{item.tenant_name}</Text>
                  <Text style={styles.searchProperty}>{item.property_title} · Unit {item.unit_label}</Text>
                </View>
                <View style={styles.searchResultRight}>
                  {(item.balance_due ?? 0) > 0 && (
                    <Text style={styles.searchBalance}>{formatUGXShort(item.balance_due)}</Text>
                  )}
                  <Badge
                    label={item.health === "good" ? "Current" : item.health === "warn" ? "Expiring" : "Expired"}
                    tone={item.health === "good" ? "success" : item.health === "warn" ? "warning" : "danger"}
                    size="sm"
                  />
                </View>
              </Pressable>
            )}
            scrollEnabled={false}
          />
        </View>
      )}

      {showSearch && searchQuery.length > 0 && searchResults.length === 0 && (
        <View style={styles.searchEmpty}>
          <Text style={styles.searchEmptyText}>No matches for “{searchQuery}”</Text>
        </View>
      )}

      {/* Alerts */}
      <View style={styles.section}>
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          renderItem={renderAlert}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: Spacing.sm }}
        />
      </View>

      {/* Stats */}
      <View style={styles.section}>
        <View style={styles.statsGrid}>
          {statsCards.map((stat, i) => (
            <Card key={i} padding="sm" style={styles.statCard}>
              <View style={[styles.statIconWrap, stat.tone === "accent" && { backgroundColor: Colors.accentSoft }]}>{stat.icon}</View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </Card>
          ))}
        </View>
      </View>

      {/* Quick actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <QuickAction icon={<Building2 size={22} color={Colors.primary} />} label="List Property" onPress={() => router.push("/create-property")} />
          <QuickAction icon={<Users size={22} color={Colors.primary} />} label="Create Tenancy" onPress={() => router.push("/create-tenancy")} />
          <QuickAction icon={<FileText size={22} color={Colors.primary} />} label="Generate Report" onPress={() => router.push("/manager/reports")} />
          <QuickAction icon={<Crown size={22} color={Colors.gold} />} label="Subscription" onPress={() => router.push("/subscription")} />
        </View>
      </View>

      {/* Needs attention */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.xs }}>
            <Bell size={18} color={Colors.accent} />
            <Text style={styles.sectionTitle}>Needs Attention</Text>
          </View>
        </View>

        {needsAttentionCount === 0 ? (
          <Card padding="lg" style={styles.emptyInline}>
            <View style={styles.emptyIconWrap}>
              <Sparkles size={22} color={Colors.success} />
            </View>
            <Text style={styles.emptyInlineTitle}>You're all caught up</Text>
            <Text style={styles.emptyInlineText}>No tenants currently have outstanding balances.</Text>
          </Card>
        ) : (
          <Pressable
            onPress={() => router.push("/manager/tenancies?filter=outstanding")}
            style={({ pressed }) => [styles.attentionBanner, pressed && { opacity: 0.92 }]}
            accessibilityRole="button"
            accessibilityLabel={`${needsAttentionCount} tenancies need attention. Tap to view.`}
          >
            <View style={styles.attentionIconWrap}>
              <AlertTriangle size={22} color={Colors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.attentionValue}>{needsAttentionCount}</Text>
              <Text style={styles.attentionLabel}>
                {needsAttentionCount === 1 ? "tenancy has" : "tenancies have"} an outstanding balance
              </Text>
            </View>
            <ChevronRight size={20} color={Colors.accent} />
          </Pressable>
        )}
      </View>

      <View style={{ height: 130 }} />

      <Pressable
        onPress={() => router.push("/create-tenancy")}
        style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.95 }] }]}
        accessibilityRole="button"
        accessibilityLabel="Quick action: Create tenancy"
      >
        <Plus size={26} color={Colors.textOnPrimary} />
      </Pressable>
    </Screen>
  );
}

function QuickAction({ icon, label, onPress }: { icon: ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.quickAction, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.quickActionIcon}>{icon}</View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
    backgroundColor: Colors.bg,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  greeting: {
    fontSize: FontSize.body,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  headerTitle: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  subBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
  },
  subBadgeActive: {
    backgroundColor: Colors.accentSoft,
    borderColor: Colors.accent,
  },
  subBadgeExpired: {
    backgroundColor: Colors.accentSoft,
    borderColor: Colors.accent,
  },
  subBadgeText: {
    fontSize: FontSize.micro,
    fontWeight: FontWeight.bold,
  },
  searchWrap: {
    borderRadius: Radii.input,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    padding: 3,
    backgroundColor: Colors.surface,
  },
  searchDropdown: {
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xs,
    marginTop: Spacing.xs,
    ...Shadows.card,
  },
  searchDropdownTitle: {
    fontSize: FontSize.micro,
    color: Colors.textMuted,
    fontWeight: FontWeight.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  searchEmpty: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.xs,
    backgroundColor: Colors.surface,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  searchEmptyText: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    textAlign: "center",
  },
  section: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  seeAll: {
    fontSize: FontSize.caption,
    color: Colors.accent,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  tenancyAgreementWrap: {
    marginBottom: Spacing.md,
  },
  tenancyAgreementHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  tenancyAgreementName: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  tenancyAgreementProp: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  alertPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radii.pill,
  },
  alertDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  alertText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: "47%",
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: FontSize.micro,
    color: Colors.textMuted,
    marginTop: 2,
    lineHeight: 14,
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  quickAction: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: Colors.surface,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    alignItems: "center",
    gap: Spacing.xs,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  emptyInline: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  attentionBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radii.card,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    borderLeftWidth: 5,
    borderLeftColor: Colors.danger,
    padding: Spacing.md,
    ...Shadows.card,
  },
  attentionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(192,57,43,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  attentionValue: {
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    color: Colors.danger,
  },
  attentionLabel: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  emptyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  emptyInlineTitle: {
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    fontWeight: FontWeight.bold,
  },
  emptyInlineText: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    textAlign: "center",
  },
  searchResult: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  searchResultLeft: { flex: 1 },
  searchName: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  searchProperty: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  searchResultRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  searchBalance: {
    fontSize: FontSize.caption,
    color: Colors.danger,
    fontWeight: FontWeight.bold,
  },
  fab: {
    position: "absolute",
    bottom: 90,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    borderWidth: 3,
    borderColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
