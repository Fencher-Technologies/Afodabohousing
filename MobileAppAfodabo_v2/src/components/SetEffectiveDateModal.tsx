/**
 * SetEffectiveDateModal — bottom sheet for setting a tenancy's rent coverage
 * effective date (the anchor for rent-day tracking). Set once per lease.
 */

import { useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { CalendarDays, X } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Button } from "./Button";
import { InputField } from "./InputField";
import { useSetEffectiveDate } from "@/src/hooks/useTenancies";
import { todayLocalISO } from "@/src/lib/dates";

interface SetEffectiveDateModalProps {
  visible: boolean;
  leaseId: string;
  onClose: () => void;
}

export function SetEffectiveDateModal({
  visible,
  leaseId,
  onClose,
}: SetEffectiveDateModalProps) {
  const [date, setDate] = useState(todayLocalISO());
  const [error, setError] = useState<string | null>(null);
  const setEffectiveDate = useSetEffectiveDate();

  const handleSave = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError("Enter the date as YYYY-MM-DD");
      return;
    }
    setError(null);
    try {
      await setEffectiveDate.mutateAsync({ leaseId, rentEffectiveDate: date });
      setDate(todayLocalISO());
      onClose();
      Alert.alert("Effective Date Set", "Rent coverage tracking is now active for this tenancy.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not set the effective date. Please try again.");
    }
  };

  const handleClose = () => {
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
              <Text style={styles.title}>Set Effective Date</Text>
              <Text style={styles.subtitle}>
                Start of the first rent coverage cycle — used to track paid-until, days remaining
                and arrears. This can only be set once.
              </Text>
            </View>
            <Pressable onPress={handleClose} style={styles.closeBtn} accessibilityLabel="Close">
              <X size={20} color={Colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.iconRow}>
            <CalendarDays size={20} color={Colors.primary} />
            <Text style={styles.hint}>Usually the date the tenant first moved in or started paying rent.</Text>
          </View>

          <InputField
            label="Effective Date (YYYY-MM-DD)"
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            keyboardType="numeric"
            error={error}
          />

          <View style={styles.actions}>
            <Button label="Cancel" onPress={handleClose} variant="ghost" flex />
            <Button
              label="Set Date"
              onPress={handleSave}
              flex
              loading={setEffectiveDate.isPending}
            />
          </View>
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
    marginTop: 4,
    lineHeight: 18,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.primarySoft,
    borderRadius: Radii.card,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  hint: {
    flex: 1,
    fontSize: FontSize.caption,
    color: Colors.primaryMuted,
    fontWeight: FontWeight.medium,
    lineHeight: 18,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
});
