/**
 * Button — standardized button with variants, sizes, loading state.
 */

import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Colors, Radii, FontSize, FontWeight, Spacing, Shadows } from "@/constants/theme";
import type { Tone } from "@/constants/theme";
import type { ReactNode } from "react";

type ButtonVariant = "solid" | "outline" | "ghost" | "danger" | "gold";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  tone?: Tone;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  flex?: boolean;
  accessibilityLabel?: string;
}

const sizeConfig: Record<ButtonSize, { height: number; fontSize: number; px: number }> = {
  sm: { height: 40, fontSize: FontSize.caption, px: Spacing.md },
  md: { height: 48, fontSize: FontSize.body, px: Spacing.lg },
  lg: { height: 56, fontSize: FontSize.h3, px: Spacing.xl },
};

export function Button({
  label,
  onPress,
  variant = "solid",
  size = "md",
  tone = "primary",
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  flex = false,
  accessibilityLabel,
}: ButtonProps) {
  const cfg = sizeConfig[size];
  const isDisabled = disabled || loading;
  const toneFg = tone === "muted" ? Colors.textSecondary : tone === "gold" ? Colors.gold : Colors[tone];

  const bg =
    variant === "solid"
      ? tone === "primary"
        ? Colors.primary
        : tone === "gold"
          ? Colors.gold
          : toneFg
      : variant === "danger"
        ? Colors.danger
        : "transparent";

  const fg =
    variant === "solid" || variant === "danger"
      ? Colors.textOnPrimary
      : variant === "gold"
        ? Colors.textOnGold
        : toneFg;

  const border = variant === "outline" ? { borderWidth: 1.5, borderColor: toneFg } : undefined;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled }}
      style={({ pressed }) => [
        styles.base,
        {
          height: cfg.height,
          paddingHorizontal: cfg.px,
          backgroundColor: bg,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
        border,
        fullWidth && { width: "100%" },
        flex && { flex: 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <View style={styles.content}>
          {leftIcon}
          <Text style={[styles.label, { fontSize: cfg.fontSize, color: fg }]}>{label}</Text>
          {rightIcon}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radii.button,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  label: {
    fontWeight: FontWeight.semibold,
  },
});
