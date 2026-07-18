/**
 * Tenant Payments — dedicated tab for the signed-in tenant.
 * Shows balance, expected rent, total paid and payment history. In-app rent
 * payments are not supported (payments in this app are only for manager
 * subscriptions); tenants can view their recorded rent payments here.
 * Edit/delete are manager-only and are intentionally excluded.
 */

import { useMemo } from "react";
import { StyleSheet, Text, View, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import {
  Wallet,
  Receipt,
  CheckCircle,
  Clock,
  ChevronRight,
  AlertTriangle,
} from "lucide-react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Card } from "@/src/components/Card";
import { Badge } from "@/src/components/Badge";
import { LoadingState } from "@/src/components/LoadingState";
import { ErrorState } from "@/src/components/ErrorState";
import { EmptyState } from "@/src/components/EmptyState";
import { PageHeader } from "@/src/components/PageHeader";
import { usePaymentList } from "@/src/hooks/usePayments";
import { useTenancyList } from "@/src/hooks/useTenancies";
import { useRefresh } from "@/src/hooks/useRefresh";
import { fromBackendLease } from "@/src/mappers/tenancy-mapper";
import { formatUGX, formatDate, formatMethod } from "@/src/utils/format";

export default function TenantPaymentsScreen() {
  const { data: paymentsData, isLoading, error, refetch } = usePaymentList();
  const { data: tenanciesData, refetch: refetchTenancies } = useTenancyList();
  const { refreshing, onRefresh } = useRefresh({ refetches: [refetch, refetchTenancies] });

  const lease = useMemo(() => {
    if (!tenanciesData?.items?.length) return undefined;
    return (
      tenanciesData.items.find((l) => l.status === "active") ?? tenanciesData.items[0]
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

  const totalPaid = payments
    .filter((p) => p.status === "confirmed")
    .reduce((sum, p) => sum + p.amount, 0);

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
              {formatUGX(tenancy?.balance_due ?? 0)}
            </Text>
          </Card>
          <Card padding="md" style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Expected Rent</Text>
            <Text style={styles.kpiValue}>{formatUGX(tenancy?.expected_rent ?? 0)}</Text>
          </Card>
          <Card padding="md" style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Total Paid</Text>
            <Text style={[styles.kpiValue, styles.success]}>{formatUGX(totalPaid)}</Text>
          </Card>
        </View>

        {hasBalance && (
          <View style={styles.overdueBanner}>
            <AlertTriangle size={18} color={Colors.accent} />
            <Text style={styles.overdueText}>
              You have an outstanding balance of {formatUGX(tenancy?.balance_due ?? 0)}.
            </Text>
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
                      <Text style={styles.paymentAmount}>{formatUGX(payment.amount)}</Text>
                      <Text style={styles.paymentMeta}>
                        {formatDate(payment.paid_date || payment.created_at)}
                        {payment.method ? ` · ${formatMethod(payment.method)}` : ""}
                      </Text>
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
    backgroundColor: Colors.accentSoft,
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
});
