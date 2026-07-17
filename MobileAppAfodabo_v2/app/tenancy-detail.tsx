import { useMemo, useState, useCallback } from "react";
import { StyleSheet, Text, View, Pressable, Alert, FlatList, ActivityIndicator, Linking } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import {
  Phone,
  MessageCircle,
  FileText,
  Wallet,
  Calendar,
  Plus,
  FileCheck,
  Upload,
  CheckCircle,
} from "lucide-react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Card } from "@/src/components/Card";
import { Badge } from "@/src/components/Badge";
import { Button } from "@/src/components/Button";
import { PageHeader } from "@/src/components/PageHeader";
import { RecordPaymentModal } from "@/src/components/RecordPaymentModal";
import { RenewTenancyModal } from "@/src/components/RenewTenancyModal";
import { LoadingState } from "@/src/components/LoadingState";
import { ErrorState } from "@/src/components/ErrorState";
import { useTenancy, useRenewTenancy } from "@/src/hooks/useTenancies";
import { usePaymentList } from "@/src/hooks/usePayments";
import { useRefresh } from "@/src/hooks/useRefresh";
import { useAuth } from "@/src/context/auth-context";
import { AgreementFlow } from "@/src/components/AgreementFlow";
import { fromBackendLease } from "@/src/mappers/tenancy-mapper";
import { formatUGX, formatDate, formatMethod, formatPeriod } from "@/src/utils/format";
import { MessageTemplates, openWhatsApp } from "@/src/utils/whatsapp";
import type { Tenancy } from "@/src/types";

export default function TenancyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { data: lease, isLoading, refetch: refetchTenancy } = useTenancy(id || "");
  const { data: paymentsData, refetch: refetchPayments } = usePaymentList();
  const { refreshing, onRefresh } = useRefresh({ refetches: [refetchTenancy, refetchPayments] });

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const renewTenancy = useRenewTenancy();

  const payments = paymentsData?.items || [];

  const tenancy: Tenancy | null = useMemo(() => {
    if (!lease) return null;
    return fromBackendLease(lease as never);
  }, [lease]);

  const isManager = user?.role === "manager";

  if (isLoading) return <LoadingState message="Loading tenancy…" />;
  if (!tenancy) {
    return (
      <Screen scroll>
        <PageHeader title="Tenancy" onBack={() => router.back()} />
        <ErrorState title="Tenancy not found" onRetry={() => router.back()} />
      </Screen>
    );
  }

  const handleReminder = () => {
    openWhatsApp(
      tenancy.tenant_phone,
      MessageTemplates.reminder(tenancy.tenant_name, tenancy.property_title, tenancy.balance_due, tenancy.rent_end_date)
    );
  };

  const handleWhatsApp = () => {
    openWhatsApp(tenancy.tenant_phone, MessageTemplates.generic(`Hello ${tenancy.tenant_name},`));
  };

  const leasePayments = payments.filter((p) => p.lease_id === id);
  // Balance / total paid are now provided server-side (consistent across all screens)
  const totalPaid = tenancy.total_paid;
  const balanceDue = tenancy.balance_due;

  return (
    <Screen scroll onRefresh={onRefresh} refreshing={refreshing}>
      <PageHeader
        title={tenancy.tenant_name || "Tenancy"}
        subtitle={`${tenancy.property_title} · Unit ${tenancy.unit_label}`}
        onBack={() => router.back()}
      />

      <View style={styles.content}>
        <Card padding="lg" style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusInfo}>
              <Text style={styles.tenantName}>{tenancy.tenant_name || "Tenant"}</Text>
              <Text style={styles.tenantContact}>{tenancy.tenant_phone}</Text>
            </View>
            <Badge
              label={tenancy.health === "good" ? "Current" : tenancy.health === "warn" ? "Expiring" : "Expired"}
              tone={tenancy.health === "good" ? "success" : tenancy.health === "warn" ? "warning" : "danger"}
              dot
            />
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Rent</Text>
              <Text style={styles.statValue}>{formatUGX(tenancy.rent_amount)}</Text>
              <Text style={styles.statSub}>{formatPeriod(tenancy.rent_period)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Balance Due</Text>
              <Text style={[styles.statValue, balanceDue > 0 && styles.balanceDue]}>
                {formatUGX(balanceDue)}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Paid</Text>
              <Text style={styles.statValue}>{formatUGX(totalPaid)}</Text>
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

        <Card padding="md">
          <Text style={styles.sectionTitle}>Payment Standing</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Expected Rent</Text>
              <Text style={styles.statValue}>{formatUGX(tenancy.expected_rent)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Outstanding</Text>
              <Text style={[styles.statValue, balanceDue > 0 && styles.balanceDue]}>
                {formatUGX(balanceDue)}
              </Text>
              <Text style={styles.statSub}>{tenancy.is_overdue ? "Overdue" : "Expected"}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Tenant Credit</Text>
              <Text style={[styles.statValue, { color: Colors.success }]}>
                {formatUGX(tenancy.tenant_credit)}
              </Text>
            </View>
          </View>
        </Card>

        {(tenancy.effective_status === "expired" || tenancy.status === "expired") && isManager && (
          <Card padding="md" style={{ borderLeftWidth: 4, borderLeftColor: Colors.warning }}>
            <Text style={styles.sectionTitle}>Tenancy expired</Text>
            <Text style={{ fontSize: FontSize.caption, color: Colors.textSecondary, marginBottom: Spacing.sm }}>
              This tenancy has ended. Renew it to extend the lease period for the same tenant and property.
            </Text>
            <Button
              label="Renew tenancy"
              onPress={() => setShowRenewModal(true)}
              fullWidth
              leftIcon={<Calendar size={18} color={Colors.textOnPrimary} />}
            />
          </Card>
        )}

        {balanceDue > 0 && (
          <Button
            label="Record Payment"
            onPress={() => setShowPaymentModal(true)}
            fullWidth
            size="lg"
            leftIcon={<Wallet size={20} color={Colors.textOnPrimary} />}
          />
        )}

        <View style={styles.quickActions}>
          {isManager && (
            <Pressable
              style={styles.quickAction}
              onPress={() => router.push(`/edit-tenancy?id=${id}`)}
              accessibilityRole="button"
              accessibilityLabel="Edit tenancy"
            >
              <FileText size={22} color={Colors.primary} />
              <Text style={styles.quickActionText}>Edit</Text>
            </Pressable>
          )}
          <Pressable style={styles.quickAction} onPress={handleWhatsApp} accessibilityRole="button" accessibilityLabel="Send WhatsApp">
            <MessageCircle size={22} color={Colors.primary} />
            <Text style={styles.quickActionText}>WhatsApp</Text>
          </Pressable>
          <Pressable style={styles.quickAction} onPress={handleReminder} accessibilityRole="button" accessibilityLabel="Send reminder">
            <MessageCircle size={22} color={Colors.warning} />
            <Text style={styles.quickActionText}>Remind</Text>
          </Pressable>
          <Pressable style={styles.quickAction} onPress={() => router.push(`/tenant-detail?id=${tenancy.tenant_id}`)} accessibilityRole="button" accessibilityLabel="View tenant details">
            <FileText size={22} color={Colors.info} />
            <Text style={styles.quickActionText}>View tenant details</Text>
          </Pressable>
        </View>

        <AgreementFlow
          leaseId={id || ""}
          role={isManager ? "manager" : "tenant"}
          managerName={tenancy.manager_name}
          managerPhone={tenancy.manager_phone}
          managerEmail={tenancy.manager_email}
          canUpload={isManager}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Payment History</Text>
          <Pressable onPress={() => router.push(`/payment-history?id=${id}`)}>
            <Text style={styles.seeAll}>See all</Text>
          </Pressable>
        </View>

        {leasePayments.length === 0 ? (
          <Card padding="lg" style={styles.emptyCard}>
            <Text style={styles.emptyText}>No payments recorded yet.</Text>
          </Card>
        ) : (
          <Card padding="none">
            <View style={styles.tableHeader}>
              <Text style={styles.colDate}>Date</Text>
              <Text style={styles.colAmount}>Amount</Text>
              <Text style={styles.colStatus}>Status</Text>
            </View>
            {leasePayments.slice(0, 5).map((p, i) => (
              <Pressable key={p.id} onPress={() => router.push(`/payment-detail?id=${p.id}`)}>
                <View style={styles.paymentRow}>
                  <View style={styles.colDate}>
                    <Text style={styles.cellText}>{formatDate(p.paid_date || p.created_at)}</Text>
                  </View>
                  <View style={styles.colAmount}>
                    <Text style={styles.cellText}>{formatUGX(p.amount)}</Text>
                  </View>
                  <View style={styles.colStatus}>
                    <Badge
                      label={p.status}
                      tone={p.status === "confirmed" ? "success" : p.status === "pending" ? "warning" : "danger"}
                      size="sm"
                    />
                  </View>
                </View>
                {i < Math.min(leasePayments.length, 5) - 1 && <View style={styles.divider} />}
              </Pressable>
            ))}
          </Card>
        )}
      </View>

      <View style={{ height: 100 }} />

      <RecordPaymentModal
        visible={showPaymentModal}
        tenancy={tenancy}
        onClose={() => setShowPaymentModal(false)}
      />

      <RenewTenancyModal
        visible={showRenewModal}
        currentEndDate={tenancy.rent_end_date}
        currentRent={tenancy.rent_amount}
        tenantName={tenancy.tenant_name}
        onClose={() => setShowRenewModal(false)}
        onRenew={async ({ newEndDate, monthlyRent, notes }) => {
          if (!id) return;
          await renewTenancy.mutateAsync({ leaseId: id, newEndDate, monthlyRent, notes });
          Alert.alert("Tenancy renewed", `The lease now ends ${newEndDate}.`);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  statusCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  statusInfo: {},
  tenantName: {
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  tenantContact: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  statLabel: {
    fontSize: FontSize.micro,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  statValue: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  statSub: {
    fontSize: FontSize.micro,
    color: Colors.textMuted,
    marginTop: 2,
  },
  balanceDue: {
    color: Colors.danger,
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: Spacing.md,
  },
  dateItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateText: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
  },
  quickActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  quickAction: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  quickActionText: {
    fontSize: FontSize.micro,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  agreementHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  agreementIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  agreementTitle: {
    flex: 1,
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  agreementDone: {
    fontSize: FontSize.caption,
    color: Colors.success,
    marginTop: Spacing.sm,
  },
  agreementFileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.input,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  agreementFileName: {
    flex: 1,
    fontSize: FontSize.caption,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
  },
  uploadError: {
    fontSize: FontSize.caption,
    color: Colors.danger,
    marginTop: Spacing.xs,
  },
  consentStatusRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  seeAll: {
    fontSize: FontSize.caption,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  tableHeader: {
    flexDirection: "row",
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
  },
  paymentRow: {
    flexDirection: "row",
    padding: Spacing.md,
    alignItems: "center",
  },
  colDate: { flex: 1 },
  colAmount: { flex: 1, alignItems: "center" },
  colStatus: { flex: 1, alignItems: "flex-end" },
  cellText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  emptyCard: {
    alignItems: "center",
  },
  emptyText: {
    fontSize: FontSize.body,
    color: Colors.textMuted,
  },
});
