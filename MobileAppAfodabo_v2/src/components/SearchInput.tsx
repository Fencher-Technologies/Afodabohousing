/**
 * SearchInput — debounced search field with clear button.
 */

import { Search, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Colors, FontSize, Radii, Spacing } from "@/constants/theme";

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  autoFocus?: boolean;
}

export function SearchInput({ value, onChangeText, placeholder = "Search…", onClear, autoFocus = false }: SearchInputProps) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const handleChange = (text: string) => {
    setLocal(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onChangeText(text), 300);
  };

  const handleClear = () => {
    setLocal("");
    onChangeText("");
    onClear?.();
  };

  return (
    <View style={styles.container}>
      <Search size={20} color={Colors.textMuted} />
      <TextInput
        value={local}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        style={styles.input}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={placeholder}
      />
      {local.length > 0 && (
        <Pressable onPress={handleClear} accessibilityLabel="Clear search" style={styles.clear}>
          <X size={18} color={Colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.input,
    paddingHorizontal: Spacing.md,
    height: 44,
  },
  input: {
    flex: 1,
    fontSize: FontSize.body,
    color: Colors.textPrimary,
  },
  clear: { padding: Spacing.xs },
});
