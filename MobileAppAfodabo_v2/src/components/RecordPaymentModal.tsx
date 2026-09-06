/**
 * RecordPaymentModal — bottom sheet for recording a payment.
 */

import { X } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Button } from "./Button";
import { InputField } from "./InputField";
import { DatePickerField } from "./DatePickerField";
import { SegmentedControl } from "./SegmentedControl";
import { useCreatePayment } from "@/src/hooks/usePayments";
import { todayLocalISO } from "@/src/lib/dates";
import { useToast } from "./Toast";
import { formatMoney } from "@/src/utils/format";
import type { Tenancy, PaymentMethod } from "@/src/types";

interface RecordPaymentModalProps {
  visible: boolean;
  tenancy: Tenancy | null;
  onClose: () => void;
  onRecord?: (data: { amount: number; date: string; method: PaymentMethod; notes: string }) => void;
}

export function RecordPaymentModal({ visible, tenancy, onClose, onRecord }: RecordPaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayLocalISO());
  const [method, setMethod] = useState<PaymentMethod>("mobile_money");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createPayment = useCreatePayment();
  const toast = useToast();

  if (!tenancy) return null;

  const numericAmount = parseFloat(amount.replace(/[^0-9.]/g, "")) || 0;
  // Money ledger preview: the tenant's position is a single balance
  // (advance − arrears) plus this payment.
  const arrears = tenancy.arrears_amount;
  const advance = tenancy.advance_amount;
  const netBalance = advance - arrears + numericAmount;
  const newArrears = Math.max(0, -netBalance);
  const newAdvance = Math.max(0, netBalance);
  const dailyRate = tenancy.rent_amount > 0 ? tenancy.rent_amount / 30 : 0;
  const coverageDays = dailyRate > 0 ? Math.floor(numericAmount / dailyRate) : 0;

  const handleRecord = async () => {
    if (createPayment.isPending) return; // double-submit guard
    if (numericAmount <= 0) {
      setError("Amount must be greater than 0");
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
      toast.show(`Payment for ${tenancy.tenant_name} of ${formatMoney(numericAmount, tenancy.currency)} recorded.`, "success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to record payment. Please try again.");
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
                <Text style={styles.balanceLabel}>Balance Due</Text>
                <Text style={styles.balanceValue}>{formatMoney(tenancy.balance_due, tenancy.currency)}</Text>
              </View>
              <View style={[styles.balanceItem, { borderLeftWidth: 1, borderLeftColor: Colors.border, paddingLeft: Spacing.md }]}>
                <Text style={styles.balanceLabel}>In Advance</Text>
                <Text style={[styles.balanceValue, { color: Colors.success }]}>{formatMoney(tenancy.advance_amount, tenancy.currency)}</Text>
              </View>
            </View>

            <InputField
              label="Amount (UGX)"
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              keyboardType="decimal-pad"
              error={error}
            />

            <View style={styles.gap} />

            <DatePickerField
              label="Payment Date"
              value={date}
              onChange={setDate}
              disableFuture
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
              <Text style={styles.previewLabel}>New Arrears After Payment</Text>
              <Text style={[styles.previewValue, newArrears === 0 && styles.previewZero]}>
                {formatMoney(newArrears, tenancy.currency)}
              </Text>
              {newArrears === 0 && newAdvance > 0 && (
                <Text style={styles.previewNote}>
                  Paid up — {formatMoney(newAdvance, tenancy.currency)} in advance for future rent.
                </Text>
              )}
              {coverageDays > 0 && (
                <Text style={styles.previewNote}>
                  This payment covers about {coverageDays} day{coverageDays === 1 ? "" : "s"} of rent (30-day months).
                </Text>
              )}
            </View>

            <View style={styles.actions}>
              <Button label="Cancel" onPress={handleClose} variant="ghost" flex disabled={createPayment.isPending} />
              <Button label="Record Payment" onPress={handleRecord} flex loading={createPayment.isPending} />
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
    backgroundColor: Colors.surfaceAlt,
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
  previewNote: {
    fontSize: FontSize.micro,
    color: Colors.textMuted,
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
