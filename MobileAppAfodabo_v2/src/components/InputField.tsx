/**
 * InputField — standardized text input with label, error, and secure toggle.
 */

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react-native";
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native";
import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";

interface InputFieldProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad" | "numeric" | "decimal-pad" | "number-pad";
  error?: string | null;
  multiline?: boolean;
  numberOfLines?: number;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  maxLength?: number;
  onBlur?: () => void;
  leftIcon?: React.ReactNode;
  style?: ViewStyle;
  accessibilityLabel?: string;
  /**
   * Autofill hints. Without them Android Autofill (Google Password Manager)
   * and iOS Keychain cannot tell which field is the email and which is the
   * password, so saved passwords were never offered or saved.
   * Login: "email" + "password"; new/changed password: "new-password".
   */
  autoComplete?: TextInputProps["autoComplete"];
  textContentType?: TextInputProps["textContentType"];
}

export function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = "default",
  error = null,
  multiline = false,
  numberOfLines = 1,
  autoCapitalize = "sentences",
  maxLength,
  onBlur,
  leftIcon,
  style,
  accessibilityLabel,
  autoComplete,
  textContentType,
}: InputFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isSecure = secureTextEntry && !showPassword;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputRow, error && styles.inputError, style]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : undefined}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          onBlur={onBlur}
          style={styles.input}
          autoComplete={autoComplete}
          textContentType={textContentType}
          importantForAutofill={autoComplete ? "yes" : "auto"}
          accessibilityLabel={accessibilityLabel ?? label}
          // Never read a password aloud through the screen reader.
          accessibilityValue={secureTextEntry ? undefined : { text: value }}
        />
        {secureTextEntry && (
          <Pressable
            onPress={() => setShowPassword(!showPassword)}
            accessibilityLabel={showPassword ? "Hide password" : "Show password"}
            style={styles.toggle}
          >
            {showPassword ? <EyeOff size={20} color={Colors.textMuted} /> : <Eye size={20} color={Colors.textMuted} />}
          </Pressable>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.xs },
  label: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    borderRadius: Radii.input,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    minHeight: 52,
  },
  inputError: { borderColor: Colors.danger },
  input: {
    flex: 1,
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    paddingVertical: Spacing.sm,
  },
  leftIcon: { marginRight: Spacing.sm },
  toggle: { padding: Spacing.xs },
  errorText: {
    fontSize: FontSize.caption,
    color: Colors.danger,
  },
});
