import { useMemo, useState, useCallback } from "react";
import { StyleSheet, Text, TextInput, View, Pressable, ScrollView, Modal } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Plus, Users, Search, AlertTriangle, CheckCircle2, Clock, Wallet, Filter, X, ChevronDown } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing, Shadows } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Button } from "@/src/components/Button";
import { SelectField } from "@/src/components/SelectField";
import { TenancyCard } from "@/src/components/TenancyCard";
import { EmptyState } from "@/src/components/EmptyState";
import { RecordPaymentModal } from "@/src/components/RecordPaymentModal";
import { LoadingState } from "@/src/components/LoadingState";
import { useTenancyList } from "@/src/hooks/useTenancies";
import { usePropertyList } from "@/src/hooks/useProperties";
import { useRefresh } from "@/src/hooks/useRefresh";
import { fromBackendLeaseList } from "@/src/mappers/tenancy-mapper";
import { MessageTemplates, openWhatsApp } from "@/src/utils/whatsapp";
import { daysLeft } from "@/src/utils/tenancy-health";
import type { Tenancy } from "@/src/types";

type FilterTab = "all" | "current" | "expiring" | "expired" | "outstanding";

export default function ManagerTenanciesScreen() {
  const params = useLocalSearchParams<{ filter?: string }>();
  const initialFilter = (params.filter as FilterTab) || "all";
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterTab>(initialFilter);
  const [propertyFilter, setPropertyFilter] = useState<string>("");
  const [filterSheet, setFilterSheet] = useState(false);
  const [paymentModalTenancyId, setPaymentModalTenancyId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useTenancyList();
  const { data: propertiesData } = usePropertyList();
  const properties = propertiesData?.items ?? [];
  const leases = data?.items || [];

  const { refreshing, onRefresh } = useRefresh({ refetches: [refetch] });

  const tenancies: Tenancy[] = useMemo(
    () => fromBackendLeaseList(leases as never),
    [leases]
  );

  const expiringCount = useMemo(
    () => tenancies.filter((t) => { const d = daysLeft(t.rent_end_date); return d !== null && d < 30 && d > 0; }).length,
    [tenancies]
  );
  const expiredCount = useMemo(() => tenancies.filter((t) => t.health === "bad").length, [tenancies]);
  const outstandingCount = useMemo(() => tenancies.filter((t) => (t.balance_due ?? 0) > 0 || t.is_overdue).length, [tenancies]);
  const currentCount = useMemo(() => tenancies.filter((t) => t.health === "good").length, [tenancies]);

  const filtered = useMemo(() => {
    let result = tenancies;
    if (propertyFilter) {
      result = result.filter((t) => t.property_id === propertyFilter);
    }
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (t) =>
          t.tenant_name.toLowerCase().includes(q) ||
          t.property_title.toLowerCase().includes(q) ||
          t.unit_label.toLowerCase().includes(q)
      );
    }
    switch (filter) {
      case "expired":
        return result.filter((t) => t.health === "bad");
      case "outstanding":
        return result.filter((t) => (t.balance_due ?? 0) > 0 || t.is_overdue);
      case "current":
        return result.filter((t) => t.health === "good");
      case "expiring":
        return result.filter((t) => { const d = daysLeft(t.rent_end_date); return d !== null && d < 30 && d > 0; });
      default:
        return result;
    }
  }, [query, filter, propertyFilter, tenancies]);

  const activeFilterCount = (propertyFilter ? 1 : 0);
  const selectedProperty = properties.find((p) => p.id === propertyFilter);

  const handleReminder = useCallback((tenancy: Tenancy) => {
    openWhatsApp(
      tenancy.tenant_phone,
      MessageTemplates.reminder(tenancy.tenant_name, tenancy.property_title, tenancy.balance_due, tenancy.rent_end_date)
    );
  }, []);

  const filterTabs: { label: string; value: FilterTab; count: number; icon: React.ReactNode }[] = [
    { label: "All", value: "all", count: tenancies.length, icon: <Users size={15} color={filter === "all" ? Colors.textOnPrimary : Colors.textSecondary} /> },
    { label: "Current", value: "current", count: currentCount, icon: <CheckCircle2 size={15} color={filter === "current" ? Colors.textOnPrimary : Colors.success} /> },
    { label: "Expiring", value: "expiring", count: expiringCount, icon: <Clock size={15} color={filter === "expiring" ? Colors.textOnPrimary : Colors.warning} /> },
    { label: "Expired", value: "expired", count: expiredCount, icon: <AlertTriangle size={15} color={filter === "expired" ? Colors.textOnPrimary : Colors.danger} /> },
    { label: "Outstanding", value: "outstanding", count: outstandingCount, icon: <Wallet size={15} color={filter === "outstanding" ? Colors.textOnPrimary : Colors.accent} /> },
  ];

  if (isLoading) {
    return <LoadingState message="Loading tenancies…" />;
  }

  return (
      <Screen scroll onRefresh={onRefresh} refreshing={refreshing}>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroTitle}>Tenancies</Text>
            <Text style={styles.heroSubtitle}>
              {tenancies.length} {tenancies.length === 1 ? "tenancy" : "tenancies"} · {currentCount} current
            </Text>
          </View>
          <Button
            label="New"
            tone="accent"
            onPress={() => router.push("/create-tenancy")}
            size="sm"
            leftIcon={<Plus size={18} color={Colors.textOnPrimary} />}
          />
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryItem, { backgroundColor: "rgba(46,125,82,0.18)" }]}>
            <Text style={[styles.summaryValue, { color: "#E4F4EC" }]}>{currentCount}</Text>
            <Text style={styles.summaryLabel}>Current</Text>
          </View>
          <View style={[styles.summaryItem, { backgroundColor: "rgba(217,119,6,0.20)" }]}>
            <Text style={[styles.summaryValue, { color: "#FEF3E2" }]}>{expiringCount}</Text>
            <Text style={styles.summaryLabel}>Expiring</Text>
          </View>
          <View style={[styles.summaryItem, styles.summaryOverdue]}>
            <Text style={[styles.summaryValue, { color: "#FFFFFF" }]}>{expiredCount}</Text>
            <Text style={styles.summaryLabel}>Expired</Text>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <Search size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search tenants, properties, units…"
            placeholderTextColor={Colors.textMuted}
            accessibilityRole="search"
            accessibilityLabel="Search tenancies"
          />
        </View>
      </View>

      <View style={styles.chips}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsInner}>
          {filterTabs.map((tab) => {
            const active = filter === tab.value;
            const activeBg =
              tab.value === "expired"
                ? Colors.danger
                : tab.value === "outstanding"
                ? Colors.accent
                : tab.value === "current"
                ? Colors.success
                : Colors.primary;
            return (
              <Pressable
                key={tab.value}
                onPress={() => setFilter(tab.value)}
                style={[styles.filterChip, active && { backgroundColor: activeBg, borderColor: activeBg }]}
                accessibilityRole="button"
                accessibilityLabel={`${tab.label} filter, ${tab.count} items`}
              >
                {tab.icon}
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {tab.label} ({tab.count})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Advanced filter trigger + active filter chips (mirrors legacy app) */}
      <View style={styles.filterBar}>
        <Pressable
          onPress={() => setFilterSheet(true)}
          style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
          accessibilityRole="button"
          accessibilityLabel={`Filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ""}`}
        >
          <Filter size={16} color={activeFilterCount > 0 ? Colors.textOnPrimary : Colors.textPrimary} />
          <Text style={[styles.filterButtonText, activeFilterCount > 0 && styles.filterButtonTextActive]}>
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </Text>
        </Pressable>
        {propertyFilter ? (
          <Pressable
            onPress={() => setPropertyFilter("")}
            style={styles.activeChip}
            accessibilityLabel={`Property: ${selectedProperty?.title ?? "..."}. Tap to clear.`}
          >
            <Text style={styles.activeChipText} numberOfLines={1}>
              {selectedProperty?.title ?? "Property"}
            </Text>
            <X size={14} color={Colors.accent} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.list}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Users size={32} color={Colors.primary} />}
            title="No tenancies found"
            description={query ? "Try a different search term." : "Create your first tenancy to start tracking rent payments."}
            actionLabel={!query ? "Create Tenancy" : undefined}
            onAction={!query ? () => router.push("/create-tenancy") : undefined}
          />
        ) : (
          <View style={{ gap: Spacing.sm }}>
            {filtered.map((tenancy) => (
              <TenancyCard
                key={tenancy.id}
                tenancy={tenancy}
                onPress={() => router.push(`/tenancy-detail?id=${tenancy.id}`)}
                onRecordPayment={() => setPaymentModalTenancyId(tenancy.id)}
                onSendReminder={() => handleReminder(tenancy)}
              />
            ))}
          </View>
        )}
      </View>

      <View style={{ height: 100 }} />

      <RecordPaymentModal
        visible={!!paymentModalTenancyId}
        tenancy={tenancies.find((t) => t.id === paymentModalTenancyId) ?? null}
        onClose={() => setPaymentModalTenancyId(null)}
        onRecord={() => setPaymentModalTenancyId(null)}
      />

      {/* Advanced filter sheet (property filter + status tabs live above) */}
      <Modal visible={filterSheet} transparent animationType="slide" onRequestClose={() => setFilterSheet(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setFilterSheet(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filter Tenancies</Text>
              <Pressable onPress={() => setFilterSheet(false)} hitSlop={8}>
                <X size={22} color={Colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.sheetBody}>
              <SelectField
                label="Property"
                value={propertyFilter}
                options={[
                  { label: "All properties", value: "" },
                  ...properties.map((p) => ({ label: p.title ?? "Property", value: p.id })),
                ]}
                onSelect={(v) => setPropertyFilter(v)}
                placeholder="All properties"
              />

              <Text style={styles.sheetHint}>
                Status filters (Current, Expiring, Expired, Outstanding) are available as the pills above. Current, Expiring and Expired describe the tenancy's validity period; Outstanding describes unpaid rent.
              </Text>
            </View>

            <View style={styles.sheetActions}>
              <Button
                label="Clear All"
                variant="outline"
                tone="muted"
                onPress={() => setPropertyFilter("")}
              />
              <Button label="Done" tone="accent" onPress={() => setFilterSheet(false)} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: Colors.primary,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    gap: Spacing.md,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroTitle: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
    color: Colors.textOnPrimary,
  },
  heroSubtitle: {
    fontSize: FontSize.caption,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  summaryItem: {
    flex: 1,
    borderRadius: Radii.input,
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  summaryOverdue: {
    backgroundColor: "rgba(192,57,43,0.22)",
  },
  summaryValue: {
    fontSize: FontSize.title,
    fontWeight: FontWeight.bold,
    color: Colors.textOnPrimary,
  },
  summaryLabel: {
    fontSize: FontSize.micro,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: Radii.input,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.caption,
    color: Colors.textPrimary,
    paddingVertical: Spacing.sm,
  },
  chips: {
    paddingTop: Spacing.md,
  },
  chipsInner: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  list: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.textOnPrimary,
  },
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    flexWrap: "wrap",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterButtonActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  filterButtonText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  filterButtonTextActive: {
    color: Colors.textOnPrimary,
  },
  activeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: 200,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    backgroundColor: Colors.accentSoft,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  activeChipText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.accent,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.md,
    maxHeight: "80%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: Spacing.sm,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  sheetTitle: {
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  sheetBody: {
    gap: Spacing.md,
  },
  sheetHint: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  sheetActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
});
