/**
 * SegmentedControl — role/type selector toggle.
 */

import { StyleSheet, Text, View } from "react-native";
import { Pressable } from "react-native";
import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";

interface Segment {
  label: string;
  value: string;
}

interface SegmentedControlProps {
  segments: Segment[];
  value: string;
  onChange: (value: string) => void;
}

export function SegmentedControl({ segments, value, onChange }: SegmentedControlProps) {
  return (
    <View style={styles.container}>
      {segments.map((seg) => {
        const active = seg.value === value;
        return (
          <Pressable
            key={seg.value}
            onPress={() => onChange(seg.value)}
            style={[styles.segment, active && styles.segmentActive]}
            accessibilityRole="button"
            accessibilityLabel={seg.label}
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{seg.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.button,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    alignItems: "center",
    borderRadius: Radii.sm,
  },
  segmentActive: {
    backgroundColor: Colors.surface,
    shadowColor: "#1A1F1C",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.medium,
    color: Colors.textMuted,
  },
  labelActive: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
});
