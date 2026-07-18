import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Button } from "./Button";
import { InputField } from "./InputField";
import { SelectField } from "./SelectField";

const MONTHS = [
  { label: "January", value: "01" },
  { label: "February", value: "02" },
  { label: "March", value: "03" },
  { label: "April", value: "04" },
  { label: "May", value: "05" },
  { label: "June", value: "06" },
  { label: "July", value: "07" },
  { label: "August", value: "08" },
  { label: "September", value: "09" },
  { label: "October", value: "10" },
  { label: "November", value: "11" },
  { label: "December", value: "12" },
];

function pad2(n: string): string {
  return n.length === 1 ? "0" + n : n;
}

function toIso(day: string, month: string, year: string): string {
  if (!day || !month || !year) return "";
  return `${year}-${month}-${pad2(day)}`;
}

interface RenewTenancyModalProps {
  currentEndDate: string;
  currentRent?: number;
  tenantName?: string;
  visible: boolean;
  onClose: () => void;
  onRenew: (values: { newEndDate: string; monthlyRent?: number; notes?: string }) => Promise<void> | void;
}

export function RenewTenancyModal({
  currentEndDate,
  currentRent,
  tenantName,
  visible,
  onClose,
  onRenew,
}: RenewTenancyModalProps) {
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [rent, setRent] = useState(currentRent != null ? String(currentRent) : "");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const newEndDate = useMemo(() => toIso(day, month, year), [day, month, year]);

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
      const parsedRent = rent.trim() ? Number(rent) : undefined;
      await onRenew({
        newEndDate,
        monthlyRent: parsedRent != null && !Number.isNaN(parsedRent) ? parsedRent : undefined,
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

          <Text style={styles.dateLabel}>New End Date</Text>
          <View style={styles.dateRow}>
            <View style={{ flex: 1 }}>
              <InputField label="Day" value={day} onChangeText={setDay} placeholder="DD" keyboardType="numeric" />
            </View>
            <View style={{ width: Spacing.sm }} />
            <View style={{ flex: 2 }}>
              <SelectField label="Month" value={month} options={MONTHS} onSelect={setMonth} placeholder="Month" />
            </View>
            <View style={{ width: Spacing.sm }} />
            <View style={{ flex: 1.2 }}>
              <InputField label="Year" value={year} onChangeText={setYear} placeholder="YYYY" keyboardType="numeric" />
            </View>
          </View>

          <InputField
            label="Monthly rent (optional — leave blank to keep current)"
            value={rent}
            onChangeText={setRent}
            placeholder="0"
            keyboardType="numeric"
          />
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
  error: {
    fontSize: FontSize.caption,
    color: Colors.danger,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
});
