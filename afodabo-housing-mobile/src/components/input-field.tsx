import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '../theme/tokens';

interface InputFieldProps {
  autoCapitalize?: 'none' | 'sentences' | 'words';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  value: string;
}

export function InputField({
  autoCapitalize = 'sentences',
  keyboardType = 'default',
  label,
  multiline,
  onChangeText,
  placeholder,
  secureTextEntry,
  value,
}: InputFieldProps) {
  const [hidePassword, setHidePassword] = useState(secureTextEntry ?? false);
  const showToggle = secureTextEntry && !multiline;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
        <TextInput
          autoCapitalize={autoCapitalize}
          cursorColor={colors.primary}
          keyboardType={keyboardType}
          multiline={multiline}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={hidePassword}
          style={[styles.input, multiline ? styles.multiline : null, showToggle ? styles.inputWithToggle : null]}
          value={value}
        />
        {showToggle ? (
          <Pressable
            hitSlop={8}
            onPress={() => setHidePassword((prev) => !prev)}
            style={styles.toggle}
          >
            <Ionicons
              color={colors.textMuted}
              name={hidePassword ? 'eye-off' : 'eye'}
              size={22}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.input,
    borderWidth: 1,
    color: colors.textPrimary,
    fontFamily: typography.body,
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  inputContainer: {
    position: 'relative',
  },
  inputWithToggle: {
    paddingRight: 44,
  },
  label: {
    color: colors.textSecondary,
    fontFamily: typography.bodyStrong,
    fontSize: 13,
    marginBottom: 8,
  },
  multiline: {
    minHeight: 104,
    textAlignVertical: 'top',
  },
  toggle: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    position: 'absolute',
    right: 12,
    top: 0,
    width: 30,
  },
  wrapper: {
    gap: 2,
  },
});
