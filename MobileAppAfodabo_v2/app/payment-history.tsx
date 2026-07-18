import { useMemo } from "react";
import { StyleSheet, Text, View, Pressable, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Receipt, ChevronRight, Pencil, Trash2 } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Card } from "@/src/components/Card";
import { Badge } from "@/src/components/Badge";
import { PageHeader } from "@/src/components/PageHeader";
import { EmptyState } from "@/src/components/EmptyState";
import { LoadingState } from "@/src/components/LoadingState";
import { usePaymentList, useDeletePayment } from "@/src/hooks/usePayments";
import { useAuth } from "@/src/context/auth-context";
import { useRefresh } from "@/src/hooks/useRefresh";
import { formatUGX, formatDate, formatMethod } from "@/src/utils/format";

export default function PaymentHistoryScreen() {
  const { id, tenancyId } = useLocalSearchParams<{ id: string; tenancyId: string }>();
  const leaseId = id || tenancyId || "";
  const { data, isLoading, refetch } = usePaymentList();
  const deletePayment = useDeletePayment();
  const { user } = useAuth();
  const isManager = user?.role === "manager";
  const { refreshing, onRefresh } = useRefresh({ refetches: [refetch] });

  const payments = useMemo(() => {
    if (!data?.items || !leaseId) return [];
    return data.items.filter((p) => p.lease_id === leaseId);
  }, [data, leaseId]);

  const totalPaid = payments.filter((p) => p.status === "confirmed").reduce((sum, p) => sum + p.amount, 0);

  const handleDelete = (payment: { id: string; amount: number }) => {
    Alert.alert(
      "Delete Payment",
      `Delete this ${formatUGX(payment.amount)} payment record? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deletePayment.mutateAsync(payment.id);
            } catch {
              Alert.alert("Error", "Failed to delete payment. Please try again.");
            }
          },
        },
      ]
    );
  };

  if (isLoading) return <LoadingState message="Loading payment history…" />;

  return (
    <Screen scroll onRefresh={onRefresh} refreshing={refreshing}>
      <PageHeader title="Payment History" onBack={() => router.back()} />

      <View style={styles.content}>
        <Card padding="lg" style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Paid</Text>
              <Text style={styles.summaryValue}>{formatUGX(totalPaid)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Payments</Text>
              <Text style={styles.summaryValue}>{payments.length}</Text>
            </View>
          </View>
        </Card>

        {payments.length === 0 ? (
          <EmptyState
            icon={<Receipt size={32} color={Colors.primary} />}
            title="No payments recorded"
            description="Your payment history will appear here once your manager records payments."
          />
        ) : (
          <View style={styles.list}>
            <Text style={styles.listTitle}>{payments.length} payments</Text>
            <Card padding="none">
              {payments.map((payment, i) => (
                <View key={payment.id}>
                  <Pressable
                    style={({ pressed }) => [styles.paymentRow, pressed && styles.pressed]}
                    onPress={() => router.push(`/payment-detail?id=${payment.id}`)}
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
                      tone={payment.status === "confirmed" ? "success" : payment.status === "pending" ? "warning" : "danger"}
                      size="sm"
                    />
                    <ChevronRight size={18} color={Colors.textMuted} />
                  </View>
                </Pressable>
                {isManager && (
                  <View style={styles.actionRow}>
                      <Pressable
                        style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                        onPress={() => router.push(`/payment-detail?id=${payment.id}`)}
                      >
                        <Pencil size={16} color={Colors.primary} />
                        <Text style={[styles.actionLabel, { color: Colors.primary }]}>Edit</Text>
                      </Pressable>
                      <View style={styles.actionDivider} />
                      <Pressable
                        style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                        onPress={() => handleDelete(payment)}
                      >
                        <Trash2 size={16} color={Colors.danger} />
                        <Text style={[styles.actionLabel, { color: Colors.danger }]}>Delete</Text>
                      </Pressable>
                    </View>
                  )}
                  {i < payments.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </Card>
          </View>
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
  summaryCard: {},
  summaryRow: {
    flexDirection: "row",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.lg,
  },
  summaryLabel: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
  },
  summaryValue: {
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  list: {
    gap: Spacing.sm,
  },
  listTitle: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
  },
  pressed: {
    backgroundColor: Colors.surfaceAlt,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: Colors.surfaceAlt,
  },
  actionLabel: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
  },
  actionDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
  },
  paymentLeft: {},
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
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
});
