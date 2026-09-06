/**
 * Tenant Payments — dedicated tab for the signed-in tenant.
 * Shows balance, expected rent, total paid and payment history. In-app rent
 * payments are not supported (payments in this app are only for manager
 * subscriptions); tenants can view their recorded rent payments here.
 * Edit/delete are manager-only and are intentionally excluded.
 */

import { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import {
  Wallet,
  Receipt,
  Download,
  ChevronRight,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Card } from "@/src/components/Card";
import { Badge } from "@/src/components/Badge";
import { Button } from "@/src/components/Button";
import { LoadingState } from "@/src/components/LoadingState";
import { ErrorState } from "@/src/components/ErrorState";
import { EmptyState } from "@/src/components/EmptyState";
import { PageHeader } from "@/src/components/PageHeader";
import { usePaymentList } from "@/src/hooks/usePayments";
import { useTenancyList } from "@/src/hooks/useTenancies";
import { useRefresh } from "@/src/hooks/useRefresh";
import { useMySubmissions } from "@/src/hooks/usePaymentVerifications";
import { useMyReceipts } from "@/src/hooks/useReceipts";
import { receiptsService } from "@/src/services/receipts";
import { fromBackendLease } from "@/src/mappers/tenancy-mapper";
import { RentCoverageCard } from "@/src/components/RentCoverageCard";
import { formatMoney, formatDate, formatMethod } from "@/src/utils/format";

export default function TenantPaymentsScreen() {
  const { data: paymentsData, isLoading, error, refetch } = usePaymentList();
  const { data: tenanciesData, refetch: refetchTenancies } = useTenancyList();
  const {
    data: submissions,
    refetch: refetchSubmissions,
  } = useMySubmissions();
  const { data: receiptsData, refetch: refetchReceipts } = useMyReceipts();
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);

  async function handleDownloadReceipt(id: string, receiptNumber: string) {
    setDownloadingReceiptId(id);
    try {
      const ok = await receiptsService.downloadPdf(id, receiptNumber);
      if (!ok) {
        Alert.alert("Download failed", "Could not save the receipt. Please try again.");
      }
    } finally {
      setDownloadingReceiptId(null);
    }
  }
  const receipts = receiptsData?.items ?? [];
  const { refreshing, onRefresh } = useRefresh({
    refetches: [refetch, refetchTenancies, refetchSubmissions, refetchReceipts],
  });

  const lease = useMemo(() => {
    if (!tenanciesData?.items?.length) return undefined;
    return (
      tenanciesData.items.find((l) => l.effective_status === "active" || l.status === "active") ?? undefined
    );
  }, [tenanciesData]);

  const tenancy = useMemo(() => (lease ? fromBackendLease(lease as never) : undefined), [lease]);

  const payments = useMemo(() => {
    const items = paymentsData?.items ?? [];
    return [...items].sort((a, b) => {
      const da = a.paid_date || a.created_at;
      const db = b.paid_date || b.created_at;
      return db.localeCompare(da);
    });
  }, [paymentsData]);

  const totalPaid = tenancy?.total_paid ?? 0;

  if (isLoading) return <LoadingState message="Loading payments…" />;

  if (error) {
    return (
      <Screen scroll>
        <PageHeader title="Payments" />
        <ErrorState title="Could not load payments" onRetry={() => refetch()} />
      </Screen>
    );
  }

  const hasBalance = (tenancy?.balance_due ?? 0) > 0;

  return (
    <Screen scroll onRefresh={onRefresh} refreshing={refreshing}>
      <PageHeader title="Payments" />

      <View style={styles.content}>
        {/* Summary */}
        <View style={styles.kpiRow}>
          <Card padding="md" style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Balance Due</Text>
            <Text style={[styles.kpiValue, hasBalance ? styles.danger : styles.success]}>
              {formatMoney(tenancy?.balance_due ?? 0, tenancy?.currency)}
            </Text>
          </Card>
          <Card padding="md" style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Expected Rent So Far</Text>
            <Text style={styles.kpiValue}>{formatMoney(tenancy?.expected_rent ?? 0, tenancy?.currency)}</Text>
          </Card>
          <Card padding="md" style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Total Paid</Text>
            <Text style={[styles.kpiValue, styles.success]}>{formatMoney(totalPaid, tenancy?.currency)}</Text>
          </Card>
        </View>

        {hasBalance && (
          <View style={styles.overdueBanner}>
            <AlertTriangle size={18} color={Colors.accent} />
            <Text style={styles.overdueText}>
              You have an outstanding balance of {formatMoney(tenancy?.balance_due ?? 0, tenancy?.currency)}.
            </Text>
          </View>
        )}

        {tenancy && <RentCoverageCard tenancy={tenancy} />}

        {/* Receipts, issued automatically when the manager approves a payment */}
        {receipts.length > 0 && (
          <View>
            <Text style={styles.sectionLabel}>Receipts</Text>
            <Card padding="none" style={styles.receiptsCard}>
              {receipts.map((r, i) => (
                <View key={r.id}>
                  <Pressable
                    style={styles.receiptRow}
                    onPress={() => handleDownloadReceipt(r.id, r.receipt_number)}
                    disabled={downloadingReceiptId === r.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Download receipt ${r.receipt_number}`}
                  >
                    <View style={styles.receiptIconWrap}>
                      <Receipt size={18} color={Colors.primary} />
                    </View>
                    <View style={styles.paymentLeft}>
                      <Text style={styles.paymentAmount}>{formatMoney(r.amount, tenancy?.currency)}</Text>
                      <Text style={styles.paymentMeta}>
                        {r.receipt_number}
                        {r.payment_date ? ` · ${formatDate(r.payment_date)}` : ""}
                      </Text>
                      {r.property_title ? (
                        <Text style={styles.paymentMeta}>
                          {r.property_title}{r.unit_label ? ` · Unit ${r.unit_label}` : ""}
                        </Text>
                      ) : null}
                    </View>
                    <Badge
                      label={r.status === "active" ? "Receipt" : "Voided"}
                      tone={r.status === "active" ? "primary" : "muted"}
                      size="sm"
                    />
                    {downloadingReceiptId === r.id ? (
                      <ActivityIndicator size="small" color={Colors.primary} style={styles.receiptAction} />
                    ) : (
                      <Download size={18} color={Colors.primary} style={styles.receiptAction} />
                    )}
                  </Pressable>
                  {i < receipts.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* History */}
        <Text style={styles.sectionLabel}>Payment History</Text>
        {payments.length === 0 ? (
          <EmptyState
            icon={<Receipt size={32} color={Colors.primary} />}
            title="No payments yet"
            description="Your payment history will appear here once payments are made."
          />
        ) : (
          <Card padding="none">
            {payments.map((payment, i) => {
              const statusTone =
                payment.status === "confirmed"
                  ? "success"
                  : payment.status === "pending"
                  ? "warning"
                  : "danger";
              return (
                <View key={payment.id}>
                  <Pressable
                    style={styles.paymentRow}
                    onPress={() => router.push(`/payment-detail?id=${payment.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel="View payment"
                  >
                    <View style={styles.paymentLeft}>
                      <Text style={styles.paymentAmount}>{formatMoney(payment.amount, tenancy?.currency)}</Text>
                      <Text style={styles.paymentMeta}>
                        {formatDate(payment.paid_date || payment.created_at)}
                        {payment.method ? ` · ${formatMethod(payment.method)}` : ""}
                      </Text>
                      {typeof payment.coverage_days === "number" && payment.coverage_days > 0 && (
                        <Text style={styles.paymentMeta}>Covers {payment.coverage_days} days</Text>
                      )}
                    </View>
                    <View style={styles.rowRight}>
                      <Badge
                        label={payment.status}
                        tone={statusTone}
                        size="sm"
                        dot={payment.status === "pending"}
                      />
                      <ChevronRight size={18} color={Colors.textMuted} />
                    </View>
                  </Pressable>
                  {i < payments.length - 1 && <View style={styles.divider} />}
                </View>
              );
            })}
          </Card>
        )}
      </View>

      {/* Submit Payment — full-width button */}
      {tenancy ? (
        <View style={styles.submitWrap}>
          <Button
            label="Submit Payment for Verification"
            tone="accent"
            size="lg"
            fullWidth
            leftIcon={<ShieldCheck size={20} color={Colors.textOnPrimary} />}
            onPress={() => router.push("/submit-payment")}
          />
        </View>
      ) : (
        <View style={styles.noActiveBanner}>
          <AlertTriangle size={18} color={Colors.textMuted} />
          <Text style={styles.noActiveText}>
            You currently do not have an active tenancy. Submit payment is only available with an active tenancy.
          </Text>
        </View>
      )}

      {/* Payment Submissions */}
      {submissions && submissions.length > 0 && (
        <View>
          <Text style={styles.sectionLabel}>Payment Submissions</Text>
          {submissions.map((s) => {
            const statusTone =
              s.status === "approved"
                ? "success"
                : s.status === "rejected"
                ? "danger"
                : "warning";
            const statusLabel =
              s.status === "pending"
                ? "Pending Verification"
                : s.status === "approved"
                ? "Approved"
                : "Rejected";
            return (
              <Card key={s.id} padding="md" style={styles.submissionCard}>
                <View style={styles.submissionHeader}>
                  <Text style={styles.submissionAmount}>
                    {formatMoney(s.amount, tenancy?.currency)}
                  </Text>
                  <Badge
                    label={statusLabel}
                    tone={statusTone}
                    size="sm"
                    dot={s.status === "pending"}
                  />
                </View>
                <Text style={styles.submissionMeta}>
                  {formatMethod(s.payment_method)}
                  {s.transaction_reference
                    ? ` · Ref: ${s.transaction_reference}`
                    : ""}
                </Text>
                <Text style={styles.submissionMeta}>
                  Submitted {formatDate(s.created_at)}
                  {s.status === "rejected" && s.rejection_reason ? (
                    <Text style={{ color: Colors.danger }}>
                      {"\n"}Reason: {s.rejection_reason}
                    </Text>
                  ) : null}
                </Text>
              </Card>
            );
          })}
        </View>
      )}

      <View style={{ height: 100 }} />

    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  kpiRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  kpiCard: {
    flex: 1,
    gap: 4,
  },
  kpiLabel: {
    fontSize: FontSize.micro,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  kpiValue: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  danger: { color: Colors.danger },
  success: { color: Colors.success },
  overdueBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.card,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  overdueText: {
    flex: 1,
    fontSize: FontSize.caption,
    color: Colors.accent,
    fontWeight: FontWeight.semibold,
  },
  sectionLabel: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
  },
  paymentLeft: { flex: 1 },
  paymentAmount: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  paymentMeta: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  submissionCard: {
    gap: 4,
    marginBottom: Spacing.sm,
  },
  submissionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  submissionAmount: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  submissionMeta: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  receiptsCard: {
    marginTop: Spacing.xs,
  },
  receiptRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  receiptAction: {
    marginLeft: Spacing.sm,
  },
  receiptIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  submitWrap: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
  },
  noActiveBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.card,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noActiveText: {
    flex: 1,
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
    lineHeight: 18,
  },
});
