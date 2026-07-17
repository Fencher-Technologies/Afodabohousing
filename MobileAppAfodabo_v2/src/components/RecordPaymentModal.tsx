/**
 * RecordPaymentModal — bottom sheet for recording a payment.
 */

import { X } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Button } from "./Button";
import { InputField } from "./InputField";
import { SegmentedControl } from "./SegmentedControl";
import { useCreatePayment } from "@/src/hooks/usePayments";
import { formatUGX } from "@/src/utils/format";
import type { Tenancy, PaymentMethod } from "@/src/types";

interface RecordPaymentModalProps {
  visible: boolean;
  tenancy: Tenancy | null;
  onClose: () => void;
  onRecord?: (data: { amount: number; date: string; method: PaymentMethod; notes: string }) => void;
}

export function RecordPaymentModal({ visible, tenancy, onClose, onRecord }: RecordPaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState<PaymentMethod>("mobile_money");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createPayment = useCreatePayment();

  if (!tenancy) return null;

  const numericAmount = parseInt(amount.replace(/[^0-9]/g, ""), 10) || 0;
  const newBalance = Math.max(0, tenancy.balance_due - numericAmount);
  const exceedsBalance = numericAmount > tenancy.balance_due && tenancy.balance_due > 0;

  const handleRecord = async () => {
    if (numericAmount <= 0) {
      setError("Amount must be greater than 0");
      return;
    }
    const today = new Date().toISOString().split("T")[0];
    if (date > today) {
      setError("Date cannot be in the future");
      return;
    }
    setError(null);
    try {
      await createPayment.mutateAsync({
        lease_id: tenancy.id,
        amount: numericAmount,
        payment_method: method,
        notes,
        paid_date: date,
        payment_type: "rent",
        status: "confirmed",
      });
      if (onRecord) {
        onRecord({ amount: numericAmount, date, method, notes });
      }
      setAmount("");
      setNotes("");
      onClose();
    } catch (e) {
      setError("Failed to record payment. Please try again.");
    }
  };

  const handleClose = () => {
    setAmount("");
    setNotes("");
    setError(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Record Payment</Text>
              <Text style={styles.subtitle}>
                {tenancy.tenant_name} · {tenancy.property_title} · Unit {tenancy.unit_label}
              </Text>
            </View>
            <Pressable onPress={handleClose} style={styles.closeBtn} accessibilityLabel="Close">
              <X size={20} color={Colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.balanceRow}>
              <View style={styles.balanceItem}>
                <Text style={styles.balanceLabel}>Current Balance</Text>
                <Text style={styles.balanceValue}>{formatUGX(tenancy.balance_due)}</Text>
              </View>
            </View>

            <InputField
              label="Amount (UGX)"
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              keyboardType="numeric"
              error={error}
            />

            <View style={styles.gap} />

            <InputField
              label="Date"
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              keyboardType="numeric"
            />

            <View style={styles.gap} />

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

            <View style={styles.gap} />

            <InputField
              label="Notes (optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. MTN Mobile Money, partial payment…"
              multiline
              numberOfLines={2}
            />

            <View style={styles.preview}>
              <Text style={styles.previewLabel}>New Balance After Payment</Text>
              <Text style={[styles.previewValue, newBalance === 0 && styles.previewZero]}>
                {formatUGX(newBalance)}
              </Text>
              {exceedsBalance && (
                <Text style={styles.warnText}>
                  ⚠️ Amount exceeds balance due — this will create a credit.
                </Text>
              )}
            </View>

            <View style={styles.actions}>
              <Button label="Cancel" onPress={handleClose} variant="ghost" flex />
              <Button label="Record Payment" onPress={handleRecord} flex />
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.modal,
    borderTopRightRadius: Radii.modal,
    padding: Spacing.lg,
    maxHeight: "90%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderStrong,
    alignSelf: "center",
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  balanceRow: {
    flexDirection: "row",
    backgroundColor: Colors.primarySoft,
    borderRadius: Radii.card,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  balanceItem: { flex: 1 },
  balanceLabel: {
    fontSize: FontSize.caption,
    color: Colors.primaryMuted,
    fontWeight: FontWeight.medium,
  },
  balanceValue: {
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    marginTop: 2,
  },
  gap: { height: Spacing.md },
  label: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  preview: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.card,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    alignItems: "center",
  },
  previewLabel: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
  },
  previewValue: {
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginTop: 4,
  },
  previewZero: { color: Colors.success },
  warnText: {
    fontSize: FontSize.caption,
    color: Colors.warning,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
});
