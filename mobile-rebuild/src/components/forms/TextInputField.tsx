import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';

interface TextInputFieldProps extends TextInputProps {
  error?: string;
  helperText?: string;
  label: string;
  rightAccessory?: React.ReactNode;
}

export function TextInputField({
  cursorColor,
  error,
  helperText,
  label,
  rightAccessory,
  selectionColor,
  style,
  ...props
}: TextInputFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          focused && styles.inputFocused,
          Boolean(error) && styles.inputError,
        ]}
      >
        <TextInput
          placeholderTextColor={colors.textMuted}
          cursorColor={cursorColor ?? colors.primary}
          selectionColor={selectionColor ?? colors.primaryLight}
          {...props}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
          style={[styles.input, style]}
        />
        {rightAccessory ? <View style={styles.accessory}>{rightAccessory}</View> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!error && helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  error: {
    color: colors.error,
    fontFamily: typography.body,
    fontSize: 12,
    lineHeight: 18,
  },
  helper: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
    lineHeight: 18,
  },
  input: {
    color: colors.textPrimary,
    flex: 1,
    fontFamily: typography.body,
    fontSize: 15,
    minHeight: 52,
    paddingVertical: spacing.sm,
  },
  inputError: {
    borderColor: colors.error,
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  inputRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.input,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  label: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 13,
  },
  accessory: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
