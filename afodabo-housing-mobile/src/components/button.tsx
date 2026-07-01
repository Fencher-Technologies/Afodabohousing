import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radii, typography } from '../theme/tokens';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';

interface ButtonProps {
  children: React.ReactNode;
  disabled?: boolean;
  onPress?: () => void;
  variant?: Variant;
}

export function Button({ children, disabled, onPress, variant = 'primary' }: ButtonProps) {
  const palette = {
    destructive: {
      backgroundColor: colors.error,
      borderColor: colors.error,
      color: colors.accentForeground,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      color: colors.primary,
    },
    outline: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      color: colors.textPrimary,
    },
    primary: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      color: colors.primaryForeground,
    },
    secondary: {
      backgroundColor: colors.surfaceMuted,
      borderColor: colors.surfaceMuted,
      color: colors.textPrimary,
    },
  }[variant];

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        palette,
        disabled ? styles.disabled : null,
        pressed && !disabled ? styles.pressed : null,
      ]}
    >
      {typeof children === 'string' ? (
        <Text style={[styles.label, { color: palette.color }]}>{children}</Text>
      ) : disabled ? (
        <ActivityIndicator color={palette.color} />
      ) : (
        children
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: radii.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    fontFamily: typography.bodyStrong,
    fontSize: 15,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});
