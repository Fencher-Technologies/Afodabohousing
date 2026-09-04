/**
 * FormSteps: numbered step indicator for multi-step forms. Square markers
 * with the brand radius, connector lines, current step in burgundy.
 */

import { Check } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";

interface FormStepsProps {
  steps: string[];
  current: number;
}

export function FormSteps({ steps, current }: FormStepsProps) {
  return (
    <View style={styles.row}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <View key={label} style={styles.stepWrap}>
            {i > 0 && <View style={[styles.connector, done && styles.connectorDone]} />}
            <View style={[styles.marker, active && styles.markerActive, done && styles.markerDone]}>
              {done ? (
                <Check size={14} color={Colors.textOnPrimary} />
              ) : (
                <Text style={[styles.markerText, active && styles.markerTextActive]}>{i + 1}</Text>
              )}
            </View>
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  stepWrap: { flex: 1, alignItems: "center", gap: 4 },
  connector: {
    position: "absolute",
    top: 13,
    left: "-50%",
    right: "50%",
    height: 2,
    backgroundColor: Colors.border,
  },
  connectorDone: { backgroundColor: Colors.primary },
  marker: {
    width: 26,
    height: 26,
    borderRadius: Radii.input,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  markerActive: { borderColor: Colors.primary, backgroundColor: Colors.surfaceAlt },
  markerDone: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  markerText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.textMuted,
  },
  markerTextActive: { color: Colors.primary },
  label: { fontSize: FontSize.micro, color: Colors.textMuted, textAlign: "center" },
  labelActive: { color: Colors.primary, fontWeight: FontWeight.semibold },
});
