/**
 * Card — standardized surface container with optional padding and border.
 */

import { StyleSheet, View, ViewStyle } from "react-native";
import { Colors, Radii, Shadows, Spacing } from "@/constants/theme";
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
  style?: ViewStyle;
  borderless?: boolean;
  onPress?: () => void;
}

const padMap = {
  none: 0,
  sm: Spacing.sm,
  md: Spacing.md,
  lg: Spacing.lg,
};

export function Card({ children, padding = "md", style, borderless = false }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        { padding: padMap[padding] },
        !borderless && styles.border,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.card,
    ...Shadows.card,
  },
  border: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
