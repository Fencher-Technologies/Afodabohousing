/**
 * PaymentDetailScreen — view a recorded payment with full details and
 * edit / delete (CRUD) so mistakes can be corrected.
 */

import { useMemo, useState } from "react";
import { StyleSheet, Text, View, Pressable, Alert, ScrollView } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Pencil, Trash2, ArrowLeft, CheckCircle, Clock } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Card } from "@/src/components/Card";
import { Badge } from "@/src/components/Badge";
import { Button } from "@/src/components/Button";
import { InputField } from "@/src/components/InputField";
import { SegmentedControl } from "@/src/components/SegmentedControl";
import { LoadingState } from "@/src/components/LoadingState";
import { ErrorState } from "@/src/components/ErrorState";
import { PageHeader } from "@/src/components/PageHeader";
import { usePayment, useUpdatePayment, useDeletePayment } from "@/src/hooks/usePayments";
import { useAuth } from "@/src/context/auth-context";
import { formatUGX, formatDate, formatMethod } from "@/src/utils/format";
import type { PaymentMethod } from "@/src/types";

export default function PaymentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: payment, isLoading } = usePayment(id || "");
  const updatePayment = useUpdatePayment();
  const deletePayment = useDeletePayment();
  const { user } = useAuth();
  const isManager = user?.role === "manager";

  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState("");
  const [paidDate, setPaidDate] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("mobile_money");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (isLoading) return <LoadingState message="Loading payment…" />;

  if (!payment) {
    return (
      <Screen scroll>
        <PageHeader title="Payment" onBack={() => router.back()} />
        <ErrorState title="Payment not found" onRetry={() => router.back()} />
      </Screen>
    );
  }

  const startEdit = () => {
    setAmount(String(payment.amount));
    setPaidDate(payment.paid_date ?? payment.due_date ?? "");
    setMethod((payment.method as PaymentMethod) ?? "mobile_money");
    setNotes(payment.notes ?? "");
    setError(null);
    setEditing(true);
  };

  const handleSave = async () => {
    const numericAmount = parseInt(amount.replace(/[^0-9]/g, ""), 10) || 0;
    if (numericAmount <= 0) {
      setError("Amount must be greater than 0");
      return;
    }
    try {
      await updatePayment.mutateAsync({
        id: payment.id,
        data: {
          amount: numericAmount,
          paid_date: paidDate,
          payment_method: method,
          notes,
        },
      });
      setEditing(false);
      setError(null);
    } catch {
      setError("Failed to update payment. Please try again.");
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Payment",
      "This will permanently remove the payment record. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deletePayment.mutateAsync(payment.id);
              router.back();
            } catch {
              Alert.alert("Error", "Failed to delete payment. Please try again.");
            }
          },
        },
      ]
    );
  };

  const statusTone = payment.status === "confirmed"
    ? "success"
    : payment.status === "pending"
    ? "warning"
    : "danger";

  const isConfirmed = payment.status === "confirmed";

  return (
    <Screen scroll>
      <PageHeader
        title="Payment Record"
        onBack={() => router.back()}
        rightAction={
          !editing && isManager ? (
            <View style={styles.headerActions}>
              <Pressable onPress={startEdit} style={styles.iconBtn} accessibilityLabel="Edit payment">
                <Pencil size={20} color={Colors.primary} />
              </Pressable>
              <Pressable onPress={handleDelete} style={styles.iconBtn} accessibilityLabel="Delete payment">
                <Trash2 size={20} color={Colors.danger} />
              </Pressable>
            </View>
          ) : undefined
        }
      />

      <View style={styles.content}>
        <Card padding="lg">
          <View style={styles.topRow}>
            <Text style={styles.amount}>{formatUGX(payment.amount)}</Text>
            <Badge
              label={payment.status}
              tone={statusTone}
              size="md"
              dot
            />
          </View>
          <Text style={styles.subtitle}>
            {payment.tenant_name} · {payment.property_title}
          </Text>
        </Card>

        {editing ? (
          <Card padding="lg" style={{ gap: Spacing.md }}>
            <InputField
              label="Amount (UGX)"
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              keyboardType="numeric"
              error={error ?? undefined}
            />
            <InputField
              label="Paid Date (YYYY-MM-DD)"
              value={paidDate}
              onChangeText={setPaidDate}
              placeholder="YYYY-MM-DD"
              keyboardType="numeric"
            />
            <View>
              <Text style={styles.label}>Payment Method</Text>
              <SegmentedControl
                segments={[
                  { label: "Cash", value: "cash" },
                  { label: "Bank", value: "bank" },
                  { label: "Mobile", value: "mobile_money" },
                ]}
                value={method}
                onChange={(v) => setMethod(v as PaymentMethod)}
              />
            </View>
            <InputField
              label="Notes (optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. partial payment, receipt #"
              multiline
              numberOfLines={2}
            />
            <View style={styles.editActions}>
              <Button label="Cancel" onPress={() => setEditing(false)} variant="ghost" flex />
              <Button label="Save" onPress={handleSave} flex loading={updatePayment.isPending} />
            </View>
          </Card>
        ) : (
          <>
            <Card padding="lg" style={styles.detailCard}>
              <DetailRow label="Tenant" value={payment.tenant_name} />
              <DetailRow label="Property" value={payment.property_title} />
              <DetailRow label="Type" value={payment.payment_type} />
              <DetailRow label="Method" value={formatMethod(payment.method)} />
              <DetailRow label="Due Date" value={formatDate(payment.due_date)} />
              <DetailRow label="Paid Date" value={formatDate(payment.paid_date)} />
              <DetailRow label="Balance After" value={formatUGX(payment.balance_after)} />
              <DetailRow label="Recorded" value={formatDate(payment.created_at)} />
              {payment.notes ? <DetailRow label="Notes" value={payment.notes} /> : null}
            </Card>

            {payment.status === "pending" && (
              <View style={styles.pendingNote}>
                <Clock size={16} color={Colors.warning} />
                <Text style={styles.pendingText}>This payment is pending confirmation.</Text>
              </View>
            )}
            {isConfirmed && (
              <View style={styles.confirmedNote}>
                <CheckCircle size={16} color={Colors.success} />
                <Text style={styles.confirmedText}>This payment is confirmed and counted toward the balance.</Text>
              </View>
            )}
          </>
        )}
      </View>
    </Screen>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, value === "—" && styles.muted]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  headerActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radii.button,
    backgroundColor: Colors.surfaceAlt,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amount: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    marginTop: 4,
  },
  detailCard: { gap: Spacing.sm },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailLabel: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  detailValue: {
    fontSize: FontSize.caption,
    color: Colors.textPrimary,
    fontWeight: FontWeight.semibold,
    flex: 1,
    textAlign: "right",
    marginLeft: Spacing.md,
  },
  muted: { color: Colors.textMuted },
  label: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  editActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  pendingNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.warningSoft,
    borderRadius: Radii.card,
    padding: Spacing.md,
  },
  pendingText: {
    fontSize: FontSize.caption,
    color: Colors.warning,
    fontWeight: FontWeight.medium,
    flex: 1,
  },
  confirmedNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.successSoft,
    borderRadius: Radii.card,
    padding: Spacing.md,
  },
  confirmedText: {
    fontSize: FontSize.caption,
    color: Colors.success,
    fontWeight: FontWeight.medium,
    flex: 1,
  },
});
