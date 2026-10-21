import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Button } from "./Button";
import { InputField } from "./InputField";
import { DatePickerField } from "./DatePickerField";

interface RenewTenancyModalProps {
  currentEndDate: string;
  tenantName?: string;
  visible: boolean;
  onClose: () => void;
  onRenew: (values: { newEndDate: string; notes?: string }) => Promise<void> | void;
}

export function RenewTenancyModal({
  currentEndDate,
  tenantName,
  visible,
  onClose,
  onRenew,
}: RenewTenancyModalProps) {
  const [newEndDate, setNewEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleRenew = async () => {
    if (!newEndDate) {
      setError("Please enter the new end date.");
      return;
    }
    const current = new Date(currentEndDate);
    const next = new Date(newEndDate);
    if (isNaN(next.getTime()) || next <= current) {
      setError("New end date must be later than the current end date.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onRenew({
        newEndDate,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not renew tenancy. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Renew tenancy</Text>
          <Text style={styles.subtitle}>
            {tenantName ? `${tenantName} · ` : ""}
            Current period ends {currentEndDate || "—"}. The new end date must be later.
          </Text>

          <DatePickerField
            label="New End Date"
            value={newEndDate}
            onChange={setNewEndDate}
          />

          <Text style={styles.unchangedNote}>
            Renewing extends this tenancy only. The tenancy record, start date, monthly rent, payments, and rent calculations stay unchanged.
          </Text>

          <InputField label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="Any renewal notes" />

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.actions}>
            <Button label="Cancel" onPress={onClose} variant="outline" flex />
            <Button label={busy ? "Renewing…" : "Renew tenancy"} onPress={handleRenew} loading={busy} flex disabled={busy || !newEndDate} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.modal,
    borderTopRightRadius: Radii.modal,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  title: {
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  dateLabel: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  unchangedNote: {
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.card,
    padding: Spacing.md,
  },
  error: {
    fontSize: FontSize.caption,
    color: Colors.danger,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
});
