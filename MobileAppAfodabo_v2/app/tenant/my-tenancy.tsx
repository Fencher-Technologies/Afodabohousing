/**
 * MyTenancyScreen — simplified tenant home: single scrollable screen.
 */

import { useMemo, useState } from "react";
import { StyleSheet, Text, View, Pressable, Alert, Linking } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import {
  Home,
  Wallet,
  Phone,
  Mail,
  MessageCircle,
  Calendar,
  MapPin,
  ChevronRight,
  Info,
} from "lucide-react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Card } from "@/src/components/Card";
import { Badge } from "@/src/components/Badge";
import { Button } from "@/src/components/Button";
import { EmptyState } from "@/src/components/EmptyState";
import { AgreementFlow } from "@/src/components/AgreementFlow";
import { LogoHeader } from "@/src/components/LogoHeader";
import { TermHelpSheet } from "@/src/components/TermHelpSheet";
import { useAuth } from "@/src/context/auth-context";
import { LoadingState } from "@/src/components/LoadingState";
import { useTenancyList } from "@/src/hooks/useTenancies";
import { usePaymentList } from "@/src/hooks/usePayments";
import { useRefresh } from "@/src/hooks/useRefresh";
import { fromBackendLease } from "@/src/mappers/tenancy-mapper";
import { calculateHealth, HealthLabel, HealthText, leaseProgress } from "@/src/utils/tenancy-health";
import { formatUGX, formatDate, formatPeriod } from "@/src/utils/format";
import { openWhatsApp } from "@/src/utils/whatsapp";

export default function MyTenancyScreen() {
  const { user } = useAuth();
  const [showHelp, setShowHelp] = useState(false);
  const { data: tenanciesData, isLoading: tenanciesLoading, refetch: refetchTenancies } = useTenancyList();
  const { data: paymentsData, isLoading: paymentsLoading, refetch: refetchPayments } = usePaymentList();
  const { refreshing, onRefresh } = useRefresh({ refetches: [refetchTenancies, refetchPayments] });

  const leases = tenanciesData?.items ?? [];

  const activeLease = useMemo(() => {
    const active = leases.find((l) => l.effective_status === "active" || l.status === "active");
    if (active) return active;
    // No active lease yet: fall back to the most recent non-terminated lease.
    // Agreements are often issued before the lease start date, and the tenant
    // must still be able to see and sign them.
    const candidates = leases.filter(
      (l) => l.effective_status !== "terminated" && l.status !== "terminated",
    );
    if (!candidates.length) return undefined;
    return [...candidates].sort((a, b) =>
      String(b.start_date ?? "").localeCompare(String(a.start_date ?? "")),
    )[0];
  }, [leases],
  );

  const previousLeases = useMemo(
    () =>
      leases.filter(
        (l) =>
          l.id !== activeLease?.id &&
          l.effective_status !== "active" &&
          l.status !== "active",
      ),
    [leases, activeLease],
  );

  const lease = activeLease;
  const leaseId = lease?.id ?? "";

  const tenancy = useMemo(() => {
    if (!lease || !user) return undefined;
    const mapped = fromBackendLease(lease as never);
    return {
      ...mapped,
      // Tenant owns their identity here
      tenant_name: user.full_name ?? "",
      tenant_phone: user.phone ?? "",
      tenant_email: user.email,
    };
  }, [lease, user]);

  const isLoading = tenanciesLoading || paymentsLoading || !user;

  if (isLoading) {
    return <LoadingState message="Loading tenancy…" />;
  }

  if (!tenancy) {
    return (
      <Screen scroll onRefresh={onRefresh} refreshing={refreshing}>
        <LogoHeader title="My Tenancy" />
        <EmptyState
          icon={<Home size={32} color={Colors.primary} />}
          title="You currently do not have an active tenancy."
          description="Browse available homes to find your next place. Your previous tenancies remain available in your history below."
          actionLabel="Browse Properties"
          onAction={() => router.push("/guest/explore")}
        />
        {previousLeases.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionLabel}>Previous Tenancy / Tenancy History</Text>
            {previousLeases.map((l) => {
              const prev = fromBackendLease(l as never);
              return (
                <Pressable
                  key={prev.id}
                  style={styles.historyCard}
                  onPress={() => router.push(`/tenancy-detail?id=${prev.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`View previous tenancy at ${prev.property_title}`}
                >
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyTitle} numberOfLines={1}>{prev.property_title}</Text>
                    <Text style={styles.historyMeta}>Unit {prev.unit_label}</Text>
                  </View>
                  <Badge
                    label={prev.effective_status === "terminated" ? "Terminated" : "Expired"}
                    tone="muted"
                    size="sm"
                  />
                  <ChevronRight size={18} color={Colors.textMuted} />
                </Pressable>
              );
            })}
          </View>
        )}
      </Screen>
    );
  }

  const managerPhone = tenancy.manager_phone ?? "";
  const managerEmail = tenancy.manager_email ?? "";

  const handleWhatsApp = () => {
    if (!managerPhone) {
      Alert.alert("WhatsApp Manager", "No phone number is available for your manager.");
      return;
    }
    openWhatsApp(
      managerPhone,
      `Hello, I'm ${tenancy.tenant_name} from Unit ${tenancy.unit_label} at ${tenancy.property_title}. I have a question about my tenancy.`
    );
  };

  const handleCall = () => {
    if (!managerPhone) {
      Alert.alert("Call Manager", "No phone number is available for your manager.");
      return;
    }
    const clean = managerPhone.replace(/[^0-9+]/g, "");
    Linking.openURL(`tel:${clean}`).catch(() => {
      Alert.alert("Call Manager", `Call ${managerPhone}.`);
    });
  };

  const hasBalance = tenancy.money_position_known && tenancy.balance_due > 0;

  return (
    <Screen scroll onRefresh={onRefresh} refreshing={refreshing}>
      <LogoHeader title="My Tenancy" />

      <View style={styles.content}>
        {/* Status Card */}
        <Card padding="lg" style={styles.statusCard}>
          {tenancy.property_image ? (
            <Image
              source={{ uri: tenancy.property_image }}
              style={styles.propertyImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : null}
          <View style={styles.statusHeader}>
            <View style={styles.statusIconWrap}>
              <Home size={22} color={Colors.primary} />
            </View>
            <View style={styles.statusBadges}>
              <Badge
                label={tenancy.effective_status === "active" ? "Active" : tenancy.effective_status === "expired" ? "Expired" : "Terminated"}
                tone={tenancy.effective_status === "active" ? "success" : "danger"}
                dot
              />
              <Badge label={HealthLabel[tenancy.health]} tone={tenancy.health === "good" ? "success" : tenancy.health === "warn" ? "warning" : "danger"} />
            </View>
          </View>
          <Text style={styles.propertyTitle}>{tenancy.property_title}</Text>
          <Text style={styles.unitText}>Unit {tenancy.unit_label}</Text>
          <View style={styles.statusDetails}>
            <View style={styles.statusDetailItem}>
              <Text style={styles.statusDetailLabel}>Rent</Text>
              <Text style={styles.statusDetailValue}>{formatUGX(tenancy.rent_amount)}{formatPeriod(tenancy.rent_period)}</Text>
            </View>
            <View style={styles.statusDetailItem}>
              <Text style={styles.statusDetailLabel}>Lease Ends</Text>
              <Text style={styles.statusDetailValue}>{formatDate(tenancy.rent_end_date)}</Text>
            </View>
            <View style={styles.statusDetailItem}>
              <Text style={styles.statusDetailLabel}>Started</Text>
              <Text style={styles.statusDetailValue}>{formatDate(tenancy.rent_start_date)}</Text>
            </View>
            <View style={styles.statusDetailItem}>
              <Text style={styles.statusDetailLabel}>Days Left</Text>
              <Text style={styles.statusDetailValue}>{tenancy.days_remaining} days</Text>
            </View>
          </View>

          <View style={styles.validityRow}>
            <Text style={[styles.validityLabel, { color: HealthText[tenancy.health] }]}>
              {HealthLabel[tenancy.health]} tenancy
            </Text>
            <Text style={[styles.validityDays, { color: HealthText[tenancy.health] }]}>
              {tenancy.days_remaining >= 0
                ? `${tenancy.days_remaining} days left`
                : `${-tenancy.days_remaining} days over`}
            </Text>
          </View>
          <View style={styles.validityTrack}>
            <View
              style={[
                styles.validityFill,
                {
                  width: `${Math.max(
                    4,
                    Math.round((leaseProgress(tenancy.rent_start_date, tenancy.rent_end_date) ?? 0) * 100),
                  )}%`,
                  backgroundColor: HealthText[tenancy.health],
                },
              ]}
            />
          </View>

          <Button
            label="WhatsApp Manager"
            onPress={handleWhatsApp}
            tone="primary"
            fullWidth
            size="md"
            leftIcon={<MessageCircle size={18} color={Colors.textOnPrimary} />}
          />
        </Card>

        {/* Tenancy Summary */}
        <Card padding="lg" style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Tenancy Summary</Text>
            <Pressable
              onPress={() => setShowHelp(true)}
              hitSlop={8}
              style={styles.summaryHelpBtn}
              accessibilityRole="button"
              accessibilityLabel="Explain summary terms"
            >
              <Info size={17} color={Colors.accent} />
            </Pressable>
          </View>
          <View style={styles.summaryGrid}>
            <SummaryItem label="Expected Rent So Far" value={formatUGX(tenancy.expected_rent)} />
            <SummaryItem label="Total Paid" value={formatUGX(tenancy.total_paid)} tone="success" />
            <SummaryItem
              label="Outstanding"
              value={tenancy.money_position_known ? formatUGX(tenancy.balance_due) : "Unavailable"}
              tone={hasBalance ? "danger" : undefined}
            />
            {tenancy.tenant_credit > 0 ? (
              <SummaryItem label="Your Credit" value={formatUGX(tenancy.tenant_credit)} tone="accent" />
            ) : (
              <SummaryItem label="Status" value={tenancy.effective_status} />
            )}
          </View>
        </Card>

        {/* Balance Card */}
        <Card padding="lg" style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <View style={styles.balanceIconWrap}>
              <Wallet size={20} color={hasBalance ? Colors.danger : Colors.success} />
            </View>
            <Text style={styles.balanceTitle}>Balance Due</Text>
          </View>
          <Text style={[styles.balanceAmount, hasBalance && styles.balanceDue]}>
            {tenancy.money_position_known ? formatUGX(tenancy.balance_due) : "Unavailable"}
          </Text>
          {hasBalance && (
            <Text style={styles.balanceDueDate}>
              {tenancy.rent_days_in_arrears && tenancy.rent_days_in_arrears > 0
                ? `You're ${tenancy.rent_days_in_arrears} day${tenancy.rent_days_in_arrears === 1 ? "" : "s"} behind on rent`
                : "Due immediately"}
            </Text>
          )}
          {!hasBalance && tenancy.rent_effective_date && (
            <Text style={styles.balanceCovered}>
              Rent covered until {formatDate(tenancy.paid_until_date)}
            </Text>
          )}
          {tenancy.money_position_known && !hasBalance && !tenancy.rent_effective_date && (
            <Text style={styles.balanceClear}>You&apos;re all caught up</Text>
          )}
          <Pressable
            onPress={() => router.push(`/payment-history?tenancyId=${tenancy.id}`)}
            style={styles.viewHistory}
            accessibilityRole="button"
            accessibilityLabel="View payment history"
          >
            <Text style={styles.viewHistoryText}>View Payment History</Text>
            <ChevronRight size={18} color={Colors.primary} />
          </Pressable>
        </Card>

        {/* Agreement Card */}
        <AgreementFlow
          leaseId={leaseId}
          role="tenant"
        />

        {/* Manager Contact */}
        <Card padding="lg">
          <Text style={styles.sectionLabel}>Your Manager</Text>
          <Text style={styles.managerName}>{tenancy.manager_name || "Property Manager"}</Text>

          <View style={styles.contactInfo}>
            <View style={styles.contactInfoRow}>
              <Phone size={16} color={Colors.textMuted} />
              <Text style={styles.contactInfoText}>
                {managerPhone || "No phone number available"}
              </Text>
            </View>
            <View style={styles.contactInfoRow}>
              <Mail size={16} color={Colors.textMuted} />
              <Text style={styles.contactInfoText}>
                {managerEmail || "No email available"}
              </Text>
            </View>
          </View>

          <View style={styles.contactActions}>
            <Pressable
              onPress={handleCall}
              style={[styles.contactBtn, !managerPhone && styles.contactBtnDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Call manager"
            >
              <Phone size={20} color={managerPhone ? Colors.primary : Colors.textMuted} />
              <Text style={[styles.contactBtnText, !managerPhone && styles.contactBtnTextDisabled]}>Call</Text>
            </Pressable>
            <Pressable
              onPress={handleWhatsApp}
              disabled={!managerPhone}
              style={[styles.contactBtn, styles.contactBtnPrimary, !managerPhone && styles.contactBtnDisabled]}
              accessibilityRole="button"
              accessibilityLabel="WhatsApp manager"
            >
              <MessageCircle size={20} color={managerPhone ? Colors.textOnPrimary : Colors.textMuted} />
              <Text style={[styles.contactBtnText, styles.contactBtnTextPrimary, !managerPhone && styles.contactBtnTextDisabled]}>WhatsApp</Text>
            </Pressable>
          </View>
        </Card>

        {previousLeases.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionLabel}>Previous Tenancy / Tenancy History</Text>
            {previousLeases.map((l) => {
              const prev = fromBackendLease(l as never);
              return (
                <Pressable
                  key={prev.id}
                  style={styles.historyCard}
                  onPress={() => router.push(`/tenancy-detail?id=${prev.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`View previous tenancy at ${prev.property_title}`}
                >
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyTitle} numberOfLines={1}>{prev.property_title}</Text>
                    <Text style={styles.historyMeta}>Unit {prev.unit_label}</Text>
                  </View>
                  <Badge
                    label={prev.effective_status === "terminated" ? "Terminated" : "Expired"}
                    tone="muted"
                    size="sm"
                  />
                  <ChevronRight size={18} color={Colors.textMuted} />
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <View style={{ height: 100 }} />

      <TermHelpSheet visible={showHelp} role="tenant" onClose={() => setShowHelp(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  content: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  statusCard: {
    gap: Spacing.sm,
  },
  propertyImage: {
    width: "100%",
    height: 160,
    borderRadius: Radii.card,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
  },
  statusBadges: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  summaryCard: {
    gap: Spacing.sm,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryHelpBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryTitle: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  summaryItem: {
    width: "48%",
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.card,
    padding: Spacing.md,
  },
  summaryLabel: {
    fontSize: FontSize.micro,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  summaryValue: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  propertyTitle: {
    fontSize: FontSize.title,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  unitText: {
    fontSize: FontSize.body,
    color: Colors.textMuted,
  },
  statusDetails: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginVertical: Spacing.sm,
  },
  validityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  validityLabel: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
  },
  validityDays: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.medium,
  },
  validityTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceAlt,
    marginTop: Spacing.xs,
    overflow: "hidden",
  },
  validityFill: {
    height: "100%",
    borderRadius: 4,
  },
  statusDetailItem: { flex: 1 },
  statusDetailLabel: {
    fontSize: FontSize.micro,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  statusDetailValue: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  balanceCard: {
    gap: Spacing.xs,
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  balanceIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  balanceTitle: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: FontWeight.bold,
    color: Colors.success,
    marginTop: Spacing.xs,
  },
  balanceDue: {
    color: Colors.danger,
  },
  balanceDueDate: {
    fontSize: FontSize.caption,
    color: Colors.danger,
    fontWeight: FontWeight.medium,
  },
  balanceClear: {
    fontSize: FontSize.caption,
    color: Colors.success,
    fontWeight: FontWeight.medium,
  },
  balanceCovered: {
    fontSize: FontSize.caption,
    color: Colors.success,
    fontWeight: FontWeight.medium,
  },
  viewHistory: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  viewHistoryText: {
    fontSize: FontSize.body,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  sectionLabel: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  historySection: {
    gap: Spacing.sm,
  },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  historyMeta: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  managerName: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginTop: 4,
    marginBottom: Spacing.xs,
  },
  contactInfo: {
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  contactInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  contactInfoText: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  contactActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  contactBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.button,
    backgroundColor: Colors.primarySoft,
  },
  contactBtnPrimary: {
    backgroundColor: Colors.accent,
  },
  contactBtnText: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  contactBtnTextPrimary: {
    color: Colors.textOnPrimary,
  },
  contactBtnDisabled: {
    backgroundColor: Colors.surfaceAlt,
  },
  contactBtnTextDisabled: {
    color: Colors.textMuted,
  },
});

function SummaryItem({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "danger" | "success" | "accent";
}) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text
        style={[
          styles.summaryValue,
          tone === "danger" && { color: Colors.danger },
          tone === "success" && { color: Colors.success },
          tone === "accent" && { color: Colors.accent },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}
