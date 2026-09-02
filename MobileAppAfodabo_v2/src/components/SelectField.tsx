/**
 * SelectField, dropdown picker styled as a tappable field.
 *
 * Lists open in a bottom sheet with a built-in search box, so long lists
 * (countries, districts, currencies) are both scrollable and typable.
 * Pass `allowCustom` to let the user keep free-typed text that matches no
 * option (used for towns the directory does not know yet).
 */

import { Check, ChevronDown, Search } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";

interface SelectOption {
  label: string;
  value: string;
}

interface SelectFieldProps {
  label?: string;
  value: string;
  options: SelectOption[];
  onSelect: (value: string) => void;
  placeholder?: string;
  error?: string | null;
  /** Force the search box on or off. Defaults to on for 8+ options. */
  searchable?: boolean;
  /** Offer a "Use '<typed text>'" row when nothing matches. */
  allowCustom?: boolean;
  disabled?: boolean;
}

export function SelectField({
  label,
  value,
  options,
  onSelect,
  placeholder = "Select…",
  error = null,
  searchable,
  allowCustom = false,
  disabled = false,
}: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((o) => o.value === value);
  const showSearch = searchable ?? options.length >= 8;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const customText = query.trim();
  const exactMatch = options.some(
    (o) => o.label.toLowerCase() === customText.toLowerCase() || o.value.toLowerCase() === customText.toLowerCase(),
  );
  const showCustomRow = allowCustom && customText.length > 0 && !exactMatch;

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const pick = (v: string) => {
    onSelect(v);
    close();
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        style={[styles.field, error && styles.fieldError, disabled && styles.fieldDisabled]}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: selected?.label ?? (allowCustom && value ? value : placeholder) }}
      >
        <Text
          style={[styles.value, !selected && !(allowCustom && value) && styles.placeholder]}
          numberOfLines={1}
        >
          {selected?.label ?? (allowCustom && value ? value : placeholder)}
        </Text>
        <ChevronDown size={20} color={Colors.textMuted} />
      </Pressable>
      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <Pressable style={styles.overlay} onPress={close}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            {showSearch && (
              <View style={styles.searchRow}>
                <Search size={18} color={Colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  value={query}
                  onChangeText={setQuery}
                  placeholder={allowCustom ? "Search or type your own…" : "Search…"}
                  placeholderTextColor={Colors.textMuted}
                  autoFocus
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="done"
                />
              </View>
            )}
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.value || item.label}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={20}
              maxToRenderPerBatch={24}
              windowSize={9}
              ListHeaderComponent={
                showCustomRow ? (
                  <Pressable onPress={() => pick(customText)} style={styles.customRow}>
                    <Text style={styles.customRowText}>
                      Use “{customText}”
                    </Text>
                  </Pressable>
                ) : null
              }
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  {query.trim() ? "No matches found." : "No options available."}
                </Text>
              }
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <Pressable
                    onPress={() => pick(item.value)}
                    style={[styles.option, isSelected && styles.optionSelected]}
                  >
                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                      {item.label}
                    </Text>
                    {isSelected && <Check size={18} color={Colors.primary} />}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
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
  field: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    borderRadius: Radii.input,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    minHeight: 52,
  },
  fieldError: { borderColor: Colors.danger },
  fieldDisabled: { opacity: 0.5 },
  value: { fontSize: FontSize.body, color: Colors.textPrimary, flex: 1 },
  placeholder: { color: Colors.textMuted },
  errorText: { fontSize: FontSize.caption, color: Colors.danger },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.modal,
    borderTopRightRadius: Radii.modal,
    paddingBottom: Spacing.xxl,
    maxHeight: "70%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderStrong,
    alignSelf: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.input,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: Spacing.md,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    paddingVertical: Spacing.sm,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  optionSelected: { backgroundColor: Colors.primarySoft },
  optionText: {
    fontSize: FontSize.body,
    color: Colors.textPrimary,
  },
  optionTextSelected: { color: Colors.primary, fontWeight: FontWeight.semibold },
  customRow: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  customRowText: {
    fontSize: FontSize.body,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  emptyText: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    textAlign: "center",
    paddingVertical: Spacing.xl,
  },
});
