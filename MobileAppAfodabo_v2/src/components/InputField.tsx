/**
 * InputField — standardized text input with label, error, and secure toggle.
 */

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react-native";
import { Pressable, StyleSheet, Text, TextInput, View, ViewStyle } from "react-native";
import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";

interface InputFieldProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad" | "numeric";
  error?: string | null;
  multiline?: boolean;
  numberOfLines?: number;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  leftIcon?: React.ReactNode;
  style?: ViewStyle;
  accessibilityLabel?: string;
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
  leftIcon,
  style,
  accessibilityLabel,
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
          style={styles.input}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityValue={{ text: value }}
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
