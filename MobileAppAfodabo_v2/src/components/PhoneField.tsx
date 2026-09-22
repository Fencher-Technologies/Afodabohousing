/**
 * PhoneField — phone input with a country picker.
 *
 * People had to type "+256" themselves, and anyone outside Uganda could not
 * sign up at all. The country is chosen from a list and the full
 * international number ("+256752738927") is what the app sends.
 */

import { useMemo, useState } from "react";
import { ChevronDown, Phone, Search } from "lucide-react-native";
import {
  FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View, ViewStyle,
} from "react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { COUNTRIES, Country, DEFAULT_COUNTRY, joinPhone, splitPhone } from "@/src/utils/countries";

interface PhoneFieldProps {
  label?: string;
  /** Full number, e.g. "+256752738927". */
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string | null;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function PhoneField({
  label,
  value,
  onChangeText,
  placeholder = "752 738 927",
  error,
  style,
  accessibilityLabel,
}: PhoneFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { country, national } = useMemo(() => splitPhone(value), [value]);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dial.includes(q.replace("+", "")),
    );
  }, [search]);

  const choose = (next: Country) => {
    onChangeText(joinPhone(next, national));
    setPickerOpen(false);
    setSearch("");
  };

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={[styles.inputRow, error ? styles.inputError : null]}>
        <Pressable
          onPress={() => setPickerOpen(true)}
          style={styles.codeButton}
          accessibilityRole="button"
          accessibilityLabel={`Country code, currently ${country.name} plus ${country.dial}`}
        >
          <Text style={styles.flag}>{country.flag}</Text>
          <Text style={styles.code}>+{country.dial}</Text>
          <ChevronDown size={16} color={Colors.textMuted} />
        </Pressable>

        <View style={styles.divider} />
        <Phone size={18} color={Colors.textMuted} style={styles.leftIcon} />

        <TextInput
          style={styles.input}
          value={national}
          onChangeText={(text) => onChangeText(joinPhone(country, text))}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          keyboardType="phone-pad"
          autoComplete="tel-device"
          textContentType="telephoneNumber"
          accessibilityLabel={accessibilityLabel ?? label ?? "Phone number"}
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal visible={pickerOpen} animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select country</Text>
            <Pressable onPress={() => setPickerOpen(false)} accessibilityRole="button">
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>

          <View style={styles.searchRow}>
            <Search size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.search}
              value={search}
              onChangeText={setSearch}
              placeholder="Search country or code"
              placeholderTextColor={Colors.textMuted}
              autoCorrect={false}
            />
          </View>

          <FlatList
            data={results}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={styles.row}
                onPress={() => choose(item)}
                accessibilityRole="button"
                accessibilityLabel={`${item.name} plus ${item.dial}`}
              >
                <Text style={styles.flag}>{item.flag}</Text>
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowDial}>+{item.dial}</Text>
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.empty}>No country matches that search.</Text>}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.xs },
  label: { fontSize: FontSize.caption, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
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
  codeButton: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: Spacing.sm },
  flag: { fontSize: 18 },
  code: { fontSize: FontSize.body, color: Colors.textPrimary, fontWeight: FontWeight.semibold },
  divider: {
    width: 1,
    height: 22,
    backgroundColor: Colors.borderStrong,
    marginHorizontal: Spacing.sm,
  },
  leftIcon: { marginRight: Spacing.sm },
  input: { flex: 1, fontSize: FontSize.body, color: Colors.textPrimary, paddingVertical: Spacing.sm },
  errorText: { fontSize: FontSize.caption, color: Colors.danger },
  modal: { flex: 1, backgroundColor: Colors.bg, paddingTop: Spacing.xl },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  modalTitle: { fontSize: FontSize.h3, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  close: { fontSize: FontSize.body, color: Colors.primary, fontWeight: FontWeight.semibold },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    borderRadius: Radii.input,
    backgroundColor: Colors.surface,
    minHeight: 48,
  },
  search: { flex: 1, fontSize: FontSize.body, color: Colors.textPrimary },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowName: { flex: 1, fontSize: FontSize.body, color: Colors.textPrimary },
  rowDial: { fontSize: FontSize.body, color: Colors.textSecondary },
  empty: { textAlign: "center", color: Colors.textMuted, padding: Spacing.xl },
});
