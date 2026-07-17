/**
 * TenantDetailScreen — full tenant profile with tenancy and payment history.
 */

import { useMemo } from "react";
import { StyleSheet, Text, View, Pressable, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  Phone,
  Mail,
  MessageCircle,
  Wallet,
  Calendar,
  User,
  FileText,
  TrendingUp,
} from "lucide-react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Card } from "@/src/components/Card";
import { Badge } from "@/src/components/Badge";
import { Button } from "@/src/components/Button";
import { PageHeader } from "@/src/components/PageHeader";
import { ErrorState } from "@/src/components/ErrorState";
import { LoadingState } from "@/src/components/LoadingState";
import { Avatar } from "@/src/components/Avatar";
import { useTenant } from "@/src/hooks/useTenants";
import { useTenancyList } from "@/src/hooks/useTenancies";
import { usePaymentList } from "@/src/hooks/usePayments";
import { useRefresh } from "@/src/hooks/useRefresh";
import { fromBackendLease } from "@/src/mappers/tenancy-mapper";
import { formatUGX, formatDate, formatMethod, formatPeriod } from "@/src/utils/format";
import { MessageTemplates, openWhatsApp } from "@/src/utils/whatsapp";
import { HealthLabel, HealthText, daysLeft, leaseProgress } from "@/src/utils/tenancy-health";

export default function TenantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: tenant, isLoading: tenantLoading, refetch: refetchTenant } = useTenant(id);
  const { data: tenanciesData, isLoading: tenanciesLoading, refetch: refetchTenancies } = useTenancyList();
  const { data: paymentsData, isLoading: paymentsLoading, refetch: refetchPayments } = usePaymentList();
  const { refreshing, onRefresh } = useRefresh({ refetches: [refetchTenant, refetchTenancies, refetchPayments] });

  const lease = useMemo(
    () => tenanciesData?.items?.find((l) => l.tenant_id === id && l.status !== "terminated"),
    [tenanciesData, id]
  );

  const tenancy = useMemo(() => {
    if (!tenant) return null;
    if (!lease) return null;
    const mapped = fromBackendLease(lease as never);
    // Tenant-detail owns the canonical tenant identity, so overlay it
    return {
      ...mapped,
      tenant_id: tenant.id,
      tenant_name: `${tenant.first_name} ${tenant.last_name}`.trim(),
      tenant_phone: tenant.phone ?? "",
      tenant_email: tenant.email,
    };
  }, [tenant, lease, id]);

  const payments = useMemo(() => (paymentsData?.items ?? []).filter((p) => p.tenant_id === id), [paymentsData, id]);

  const isLoading = tenantLoading || tenanciesLoading || paymentsLoading;

  if (isLoading) {
    return <LoadingState message="Loading tenant…" />;
  }

  if (!tenant) {
    return (
      <Screen scroll>
        <PageHeader title="Tenant" onBack={() => router.back()} />
        <ErrorState title="Tenant not found" onRetry={() => router.back()} />
      </Screen>
    );
  }

  const handleWhatsApp = () => {
    openWhatsApp(
      tenant.phone ?? "",
      MessageTemplates.generic(`Hello ${displayName},`)
    );
  };

  const handleRecordPayment = () => {
    if (tenancy) router.push(`/tenancy-detail?id=${tenancy.id}`);
  };

  const displayName = `${tenant.first_name} ${tenant.last_name}`.trim() || tenant.email || "Tenant";
  const displayPhone = tenant.phone ?? "—";
  const displayEmail = tenant.email ?? "—";

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <Screen scroll onRefresh={onRefresh} refreshing={refreshing}>
      <PageHeader title={displayName} onBack={() => router.back()} />

      <View style={styles.content}>
        {/* Profile Card */}
        <Card padding="lg" style={styles.profileCard}>
          <Avatar name={displayName} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{displayName}</Text>
            <View style={styles.contactRow}>
              <Phone size={14} color={Colors.textMuted} />
              <Text style={styles.contactText}>{displayPhone}</Text>
            </View>
            <View style={styles.contactRow}>
              <Mail size={14} color={Colors.textMuted} />
              <Text style={styles.contactText}>{displayEmail}</Text>
            </View>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            label="Record Payment"
            onPress={handleRecordPayment}
            fullWidth
            size="md"
            disabled={!tenancy}
            leftIcon={<Wallet size={18} color={Colors.textOnPrimary} />}
          />
          <Button
            label="WhatsApp"
            onPress={handleWhatsApp}
            variant="outline"
            fullWidth
            size="md"
            leftIcon={<MessageCircle size={18} color={Colors.primary} />}
          />
        </View>

        {/* Current Tenancy */}
        {tenancy ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Tenancy</Text>
            <Card padding="lg">
              <View style={styles.tenancyHeader}>
                <View style={styles.tenancyIconWrap}>
                  <User size={18} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tenancyProperty}>{tenancy.property_title}</Text>
                  <Text style={styles.tenancyUnit}>Unit {tenancy.unit_label}</Text>
                </View>
                <Badge
                  label={HealthLabel[tenancy.health]}
                  tone={tenancy.health === "good" ? "success" : tenancy.health === "warn" ? "warning" : "danger"}
                  dot
                />
              </View>

            <HealthProgress
              health={tenancy.health}
              daysLeftValue={daysLeft(tenancy.rent_end_date)}
              progress={leaseProgress(tenancy.rent_start_date, tenancy.rent_end_date)}
              overdue={tenancy.is_overdue}
              balanceDue={tenancy.balance_due}
            />

              <View style={styles.tenancyStats}>
                <View style={styles.tenancyStat}>
                  <Text style={styles.tenancyStatLabel}>Rent</Text>
                  <Text style={styles.tenancyStatValue}>{formatUGX(tenancy.rent_amount)}</Text>
                  <Text style={styles.tenancyStatSub}>{formatPeriod(tenancy.rent_period)}</Text>
                </View>
                <View style={styles.tenancyStat}>
                  <Text style={styles.tenancyStatLabel}>Balance</Text>
                  <Text style={[styles.tenancyStatValue, tenancy.balance_due > 0 && styles.balanceDue]}>
                    {formatUGX(tenancy.balance_due)}
                  </Text>
                </View>
                <View style={styles.tenancyStat}>
                  <Text style={styles.tenancyStatLabel}>Total Paid</Text>
                  <Text style={styles.tenancyStatValue}>{formatUGX(totalPaid)}</Text>
                </View>
              </View>

              <View style={styles.dateRow}>
                <View style={styles.dateItem}>
                  <Calendar size={14} color={Colors.textMuted} />
                  <Text style={styles.dateText}>Started {formatDate(tenancy.rent_start_date)}</Text>
                </View>
                <View style={styles.dateItem}>
                  <Calendar size={14} color={Colors.textMuted} />
                  <Text style={styles.dateText}>Ends {formatDate(tenancy.rent_end_date)}</Text>
                </View>
              </View>
            </Card>
          </View>
        ) : (
          <Card padding="lg" style={styles.emptyState}>
            <Text style={styles.emptyText}>No active tenancy linked to this tenant yet.</Text>
          </Card>
        )}

        {/* Payment History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment History ({payments.length})</Text>
          {payments.length === 0 ? (
            <Card padding="lg" style={styles.emptyState}>
              <Text style={styles.emptyText}>No payments recorded yet</Text>
            </Card>
          ) : (
            <Card padding="none">
              {payments.map((payment, i) => (
                <Pressable key={payment.id} onPress={() => router.push(`/payment-detail?id=${payment.id}`)}>
                  <View style={styles.paymentRow}>
                    <View style={styles.paymentLeft}>
                      <Text style={styles.paymentDate}>{formatDate(payment.paid_date)}</Text>
                      <Text style={styles.paymentMethod}>{formatMethod(payment.method)}</Text>
                    </View>
                    <Text style={styles.paymentAmount}>{formatUGX(payment.amount)}</Text>
                    <Text style={styles.paymentBalance}>{formatUGX(payment.balance_after)}</Text>
                  </View>
                  {i < payments.length - 1 && <View style={styles.paymentDivider} />}
                </Pressable>
              ))}
            </Card>
          )}
        </View>
      </View>

      <View style={{ height: 100 }} />
    </Screen>
  );
}

function HealthProgress({
  health,
  daysLeftValue,
  progress,
  overdue,
  balanceDue,
}: {
  health: "good" | "warn" | "bad";
  daysLeftValue: number | null;
  progress: number | null;
  overdue: boolean;
  balanceDue: number;
}) {
  const color = HealthText[health];
  const label =
    daysLeftValue === null
      ? "No end date"
      : daysLeftValue >= 0
      ? `${daysLeftValue} days left`
      : `${-daysLeftValue} days over`;

  return (
    <View style={[styles.healthCard, { borderLeftColor: color }]}>
      <View style={styles.healthTop}>
        <Text style={[styles.healthLabel, { color }]}>{HealthLabel[health]} tenancy</Text>
        <Text style={[styles.healthDays, { color }]}>{label}</Text>
      </View>
      {progress !== null && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: color }]} />
        </View>
      )}
      <Text style={[styles.healthDeposit, overdue && styles.balanceDue]}>
        {overdue ? `Overdue — balance ${formatUGX(balanceDue)}` : `Paid up — balance ${formatUGX(balanceDue)}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  contactText: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  tenancyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  tenancyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  tenancyProperty: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  tenancyUnit: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  tenancyStats: {
    flexDirection: "row",
    marginVertical: Spacing.md,
  },
  tenancyStat: { flex: 1 },
  tenancyStatLabel: {
    fontSize: FontSize.micro,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  tenancyStatValue: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  tenancyStatSub: {
    fontSize: FontSize.micro,
    color: Colors.textMuted,
  },
  balanceDue: { color: Colors.danger },
  dateRow: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  dateItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateText: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
  },
  emptyState: { alignItems: "center" },
  emptyText: {
    fontSize: FontSize.body,
    color: Colors.textMuted,
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
  },
  paymentLeft: { flex: 1 },
  paymentDate: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  paymentMethod: {
    fontSize: FontSize.micro,
    color: Colors.textMuted,
    marginTop: 2,
  },
  paymentAmount: {
    flex: 1,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
    textAlign: "center",
  },
  paymentBalance: {
    flex: 1,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    textAlign: "right",
  },
  paymentDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  healthCard: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radii.input,
    backgroundColor: Colors.surfaceAlt,
    borderLeftWidth: 4,
    gap: Spacing.sm,
  },
  healthTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  healthLabel: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
  },
  healthDays: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
  },
  progressTrack: {
    height: 8,
    borderRadius: Radii.pill,
    backgroundColor: Colors.border,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: Radii.pill,
  },
  healthDeposit: {
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
});
