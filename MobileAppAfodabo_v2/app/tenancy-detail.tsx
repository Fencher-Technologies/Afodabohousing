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
  UserX,
  Info,
} from "lucide-react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Card } from "@/src/components/Card";
import { Badge } from "@/src/components/Badge";
import { Button } from "@/src/components/Button";
import { PageHeader } from "@/src/components/PageHeader";
import { RecordPaymentModal } from "@/src/components/RecordPaymentModal";
import { RenewTenancyModal } from "@/src/components/RenewTenancyModal";
import { RentCoverageCard } from "@/src/components/RentCoverageCard";
import { SetEffectiveDateModal } from "@/src/components/SetEffectiveDateModal";
import { TermHelpSheet } from "@/src/components/TermHelpSheet";
import { LoadingState } from "@/src/components/LoadingState";
import { ErrorState } from "@/src/components/ErrorState";
import { useTenancy, useRenewTenancy, useRenewalHistory, useTerminateTenancy } from "@/src/hooks/useTenancies";
import { usePaymentList } from "@/src/hooks/usePayments";
import { useRefresh } from "@/src/hooks/useRefresh";
import { useAuth } from "@/src/context/auth-context";
import { AgreementFlow } from "@/src/components/AgreementFlow";
import { SubscriptionGate } from "@/src/components/SubscriptionGate";
import { fromBackendLease } from "@/src/mappers/tenancy-mapper";
import { formatUGX, formatDate, formatMethod, formatPeriod } from "@/src/utils/format";
import { MessageTemplates, openWhatsApp } from "@/src/utils/whatsapp";
import type { Tenancy } from "@/src/types";

export default function TenancyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, subscription } = useAuth();
  const { data: lease, isLoading, refetch: refetchTenancy } = useTenancy(id || "");
  const { data: paymentsData, refetch: refetchPayments } = usePaymentList();
  const { refreshing, onRefresh } = useRefresh({ refetches: [refetchTenancy, refetchPayments] });

  const [showGate, setShowGate] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showEffectiveDateModal, setShowEffectiveDateModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const renewTenancy = useRenewTenancy();
  const terminateTenancy = useTerminateTenancy();
  const { data: renewalHistory } = useRenewalHistory(id || "");

  const payments = paymentsData?.items || [];

  const tenancy: Tenancy | null = useMemo(() => {
    if (!lease) return null;
    return fromBackendLease(lease as never);
  }, [lease]);

  const isManager = user?.role === "manager";
  const isExpired = isManager && subscription?.status !== "active";
  const isTerminated =
    tenancy?.effective_status === "terminated" || tenancy?.status === "terminated";

  const handlePaymentModalClose = useCallback(() => {
    setShowPaymentModal(false);
  }, []);

  if (isLoading) return <LoadingState message="Loading tenancy…" />;
  if (!tenancy) {
    return (
      <Screen scroll>
        <PageHeader title="Tenancy" onBack={() => router.back()} />
        <ErrorState title="Tenancy not found" onRetry={() => router.back()} />
      </Screen>
    );
  }

  const handleTerminate = () => {
    if (isExpired) {
      setShowGate(true);
      return;
    }
    Alert.alert(
      "Terminate Tenancy",
      `This will immediately end ${tenancy.tenant_name}'s tenancy at ${tenancy.property_title}. The property will be released and marked available, and the tenant will no longer have an active tenancy. Their tenancy history will be preserved. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Terminate",
          style: "destructive",
          onPress: async () => {
            try {
              await terminateTenancy.mutateAsync({ leaseId: id || "" });
              Alert.alert(
                "Tenancy Terminated",
                "The tenancy has been ended and the property is now available.",
                [{ text: "OK", onPress: () => router.back() }],
              );
            } catch {
              Alert.alert("Error", "Could not terminate the tenancy. Please try again.");
            }
          },
        },
      ],
    );
  };

  const handleReminder = () => {
    openWhatsApp(
      tenancy.tenant_phone,
      MessageTemplates.reminder(
        tenancy.tenant_name,
        tenancy.property_title,
        tenancy.balance_due,
        tenancy.next_payment_due_date ?? tenancy.rent_end_date
      )
    );
  };

  // The effective date is set-once and gates all confirmed rent payments, so a
  // manager must set it before recording rent. Without it, rent coverage
  // tracking would be permanently unavailable for this lease.
  const handleRecordPaymentPress = () => {
    if (isExpired) {
      setShowGate(true);
      return;
    }
    if (!tenancy.rent_effective_date) {
      Alert.alert(
        "Enable Rent Tracking",
        "Set an effective date before recording the first rent payment. The date anchors rent coverage (paid until, days remaining, days in arrears) and can only be set once.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Set Date", onPress: () => setShowEffectiveDateModal(true) },
        ],
      );
      return;
    }
    setShowPaymentModal(true);
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
              <Text style={styles.tenantName} numberOfLines={1}>{tenancy.tenant_name || "Tenant"}</Text>
              <Text style={styles.tenantContact} numberOfLines={1}>{tenancy.tenant_phone}</Text>
            </View>
            <Badge
              label={isTerminated ? "Terminated" : tenancy.health === "good" ? "Current" : tenancy.health === "warn" ? "Expiring" : "Expired"}
              tone={isTerminated ? "danger" : tenancy.health === "good" ? "success" : tenancy.health === "warn" ? "warning" : "danger"}
              dot
            />
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Rent</Text>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{formatUGX(tenancy.rent_amount)}</Text>
              <Text style={styles.statSub}>{formatPeriod(tenancy.rent_period)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Balance Due</Text>
              <Text style={[styles.statValue, balanceDue > 0 && styles.balanceDue]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {formatUGX(balanceDue)}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Paid</Text>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{formatUGX(totalPaid)}</Text>
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

        <RentCoverageCard
          tenancy={tenancy}
          canSetDate={isManager && !isTerminated}
          onSetDate={() => {
            if (isExpired) {
              setShowGate(true);
              return;
            }
            setShowEffectiveDateModal(true);
          }}
        />

        <Card padding="md">
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Payment Standing</Text>
            <Pressable
              onPress={() => setShowHelp(true)}
              hitSlop={8}
              style={styles.sectionTitleHelpBtn}
              accessibilityRole="button"
              accessibilityLabel="Explain payment standing terms"
            >
              <Info size={17} color={Colors.accent} />
            </Pressable>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Expected Rent So Far</Text>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{formatUGX(tenancy.expected_rent)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Outstanding</Text>
              <Text style={[styles.statValue, balanceDue > 0 && styles.balanceDue]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {formatUGX(balanceDue)}
              </Text>
              <Text style={styles.statSub}>{tenancy.is_overdue ? "Overdue" : "Expected"}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Tenant Credit</Text>
              <Text style={[styles.statValue, { color: Colors.success }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {formatUGX(tenancy.tenant_credit)}
              </Text>
            </View>
          </View>
        </Card>

        {renewalHistory && renewalHistory.length > 0 && (
          <Card padding="md">
            <Text style={styles.sectionTitle}>Renewal History</Text>
            <Text style={styles.renewalCardNote}>
              Each renewal extends this same tenancy — the start date, rent, payments, and rent calculations stay unchanged.
            </Text>
            {renewalHistory.map((item, i) => (
              <View key={item.id} style={[styles.renewalItem, i > 0 && styles.renewalItemDivider]}>
                <View style={styles.renewalRow}>
                  <Text style={styles.renewalDates}>
                    {item.previous_end_date ? `${formatDate(item.previous_end_date)} → ` : ""}
                    {formatDate(item.new_end_date)}
                  </Text>
                  <Badge label="Renewed" tone="success" size="sm" />
                </View>
                <Text style={styles.renewalMeta}>
                  {`Renewed ${formatDate(item.renewed_at ?? null)}`}
                  {item.renewed_by_name ? ` by ${item.renewed_by_name}` : ""}
                </Text>
                {item.notes ? <Text style={styles.renewalNotes}>{item.notes}</Text> : null}
              </View>
            ))}
          </Card>
        )}

        {isTerminated && (
          <Card padding="md" style={{ borderLeftWidth: 4, borderLeftColor: Colors.danger }}>
            <Text style={styles.sectionTitle}>Tenancy terminated</Text>            <Text style={{ fontSize: FontSize.caption, color: Colors.textSecondary, marginBottom: Spacing.sm }}>
              This tenancy has been ended and the property has been released. The tenant&apos;s history,
              agreement, and payment records remain available below.
            </Text>
          </Card>
        )}

        {(tenancy.effective_status === "expired" || tenancy.status === "expired") && isManager && !isTerminated && (
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

        <View style={styles.actionButtons}>
          {!isTerminated && (isManager || balanceDue > 0) && (
            <Button
              label="Update Payment"
              onPress={handleRecordPaymentPress}
              fullWidth
              size="lg"
              leftIcon={<Wallet size={20} color={Colors.textOnPrimary} />}
            />
          )}

          {isManager && !isTerminated && (
            <Button
              label="Terminate Tenancy"
              onPress={handleTerminate}
              variant="danger"
              fullWidth
              size="lg"
              loading={terminateTenancy.isPending}
              leftIcon={<UserX size={20} color={Colors.textOnPrimary} />}
            />
          )}
        </View>

        <View style={styles.quickActions}>
          {isManager && !isTerminated && (
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
          readOnly={isTerminated}
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
                    {typeof p.coverage_days === "number" && p.coverage_days > 0 && (
                      <Text style={styles.cellSubText}>covers {p.coverage_days} days</Text>
                    )}
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
        onClose={handlePaymentModalClose}
      />

      <SetEffectiveDateModal
        visible={showEffectiveDateModal}
        leaseId={id || ""}
        onClose={() => setShowEffectiveDateModal(false)}
      />

      <RenewTenancyModal
        visible={showRenewModal}
        currentEndDate={tenancy.rent_end_date}
        tenantName={tenancy.tenant_name}
        onClose={() => setShowRenewModal(false)}
        onRenew={async ({ newEndDate, notes }) => {
          if (isExpired) {
            setShowGate(true);
            return;
          }
          if (!id) return;
          await renewTenancy.mutateAsync({ leaseId: id, newEndDate, notes });
          Alert.alert("Tenancy renewed", `The tenancy now ends ${newEndDate}. Rent and payment history are unchanged.`);
        }}
      />

      <TermHelpSheet visible={showHelp} role="manager" onClose={() => setShowHelp(false)} />

      <SubscriptionGate
        visible={showGate}
        actionLabel="managing tenancies"
        onClose={() => setShowGate(false)}
        onRenew={() => {
          setShowGate(false);
          router.push("/subscription");
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
  statusInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
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
    alignItems: "stretch",
    paddingVertical: Spacing.md,
    marginVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    alignSelf: "stretch",
  },
  statLabel: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
    textAlign: "center",
  },
  statValue: {
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginTop: 4,
    textAlign: "center",
  },
  statSub: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    marginTop: 2,
    textAlign: "center",
  },
  balanceDue: {
    color: Colors.danger,
  },
  dateRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  dateItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  dateText: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    flexShrink: 1,
  },
  actionButtons: {
    gap: Spacing.sm,
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  quickAction: {
    flexGrow: 1,
    flexBasis: "22%",
    minWidth: 88,
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
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
    textAlign: "center",
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
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitleHelpBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  renewalCardNote: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    marginTop: 2,
    marginBottom: Spacing.xs,
    lineHeight: 18,
  },
  renewalItem: {
    paddingVertical: Spacing.sm,
  },
  renewalItemDivider: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  renewalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  renewalDates: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  renewalMeta: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  renewalNotes: {
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
    marginTop: 2,
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
  cellSubText: {
    fontSize: FontSize.micro,
    color: Colors.textMuted,
    marginTop: 2,
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
