import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../theme';

interface ButtonProps {
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
}

export function Button({
  children,
  disabled = false,
  loading = false,
  onPress,
  variant = 'primary',
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const buttonStyle =
    variant === 'primary' ? styles.primary : variant === 'outline' ? styles.outline : styles.ghost;
  const textStyle =
    variant === 'primary'
      ? styles.primaryText
      : variant === 'outline'
        ? styles.outlineText
        : styles.ghostText;

  return (
    <Pressable
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        buttonStyle,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.primaryForeground : colors.primary}
        />
      ) : null}
      <Text style={[styles.text, textStyle]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radii.input,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  disabled: {
    opacity: 0.58,
  },
  ghost: {
    minHeight: 44,
  },
  ghostText: {
    color: colors.primary,
  },
  outline: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  outlineText: {
    color: colors.primary,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  primary: {
    ...shadows.card,
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    borderWidth: 1,
  },
  primaryText: {
    color: colors.primaryForeground,
  },
  text: {
    fontFamily: typography.bodyStrong,
    fontSize: 15,
  },
});
