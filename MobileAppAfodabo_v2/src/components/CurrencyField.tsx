/**
 * CurrencyField — pick a currency from a searchable list.
 *
 * Used for the manager's reporting currency, so totals can be shown in the
 * money they actually work in rather than always UGX.
 */

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react-native";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { CURRENCIES } from "@/src/utils/currencies";

interface CurrencyFieldProps {
  label?: string;
  value: string;
  onChange: (code: string) => void;
  hint?: string;
}

export function CurrencyField({ label, value, onChange, hint }: CurrencyFieldProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return CURRENCIES;
    return CURRENCIES.filter(
      (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
    );
  }, [search]);

  const selected = CURRENCIES.find((c) => c.code === value);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        style={styles.field}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Currency, currently ${selected?.name ?? value}`}
      >
        <Text style={styles.value}>
          {value}
          {selected ? ` - ${selected.name}` : ""}
        </Text>
        <ChevronDown size={18} color={Colors.textMuted} />
      </Pressable>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select currency</Text>
            <Pressable onPress={() => setOpen(false)} accessibilityRole="button">
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>
          <View style={styles.searchRow}>
            <Search size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.search}
              value={search}
              onChangeText={setSearch}
              placeholder="Search currency"
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
                onPress={() => { onChange(item.code); setOpen(false); setSearch(""); }}
                accessibilityRole="button"
              >
                <Text style={styles.rowCode}>{item.code}</Text>
                <Text style={styles.rowName}>{item.name}</Text>
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.empty}>No currency matches that search.</Text>}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.xs },
  label: { fontSize: FontSize.caption, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
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
  value: { fontSize: FontSize.body, color: Colors.textPrimary },
  hint: { fontSize: FontSize.caption, color: Colors.textMuted },
  modal: { flex: 1, backgroundColor: Colors.bg, paddingTop: Spacing.xl },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  modalTitle: { fontSize: FontSize.h3, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  close: { fontSize: FontSize.body, color: Colors.primary, fontWeight: FontWeight.semibold },
  searchRow: {
    flexDirection: "row", alignItems: "center", gap: Spacing.sm,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md, borderWidth: 1.5, borderColor: Colors.borderStrong,
    borderRadius: Radii.input, backgroundColor: Colors.surface, minHeight: 48,
  },
  search: { flex: 1, fontSize: FontSize.body, color: Colors.textPrimary },
  row: {
    flexDirection: "row", alignItems: "center", gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  rowCode: { width: 56, fontSize: FontSize.body, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  rowName: { flex: 1, fontSize: FontSize.body, color: Colors.textSecondary },
  empty: { textAlign: "center", color: Colors.textMuted, padding: Spacing.xl },
});
