/**
 * Badge — small status pill with tone colors.
 */

import { StyleSheet, Text, View } from "react-native";
import { FontSize, FontWeight, Radii, Spacing, ToneColors } from "@/constants/theme";
import type { Tone } from "@/constants/theme";

interface BadgeProps {
  label: string;
  tone?: Tone;
  size?: "sm" | "md";
  dot?: boolean;
}

export function Badge({ label, tone = "muted", size = "sm", dot = false }: BadgeProps) {
  const colors = ToneColors[tone];
  const isSm = size === "sm";

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, isSm ? styles.sm : styles.md]}>
      {dot && <View style={[styles.dot, { backgroundColor: colors.fg }]} />}
      <Text style={[styles.label, { color: colors.fg, fontSize: isSm ? FontSize.micro : FontSize.caption }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    borderRadius: Radii.pill,
    alignSelf: "flex-start",
  },
  sm: { paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  md: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  label: { fontWeight: FontWeight.semibold },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
