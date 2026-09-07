/**
 * UnitsEditor — add, edit and remove a property's rental units.
 *
 * Used by both create-property (where units are held in local state until the
 * property exists, then created against its id) and edit-property (where each
 * change is saved immediately). The parent owns the list; this component only
 * renders and edits it.
 *
 * A property with no units keeps behaving exactly as before: the listing shows
 * the property-level rent. Units are additive.
 */

import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Bed, Bath, Pencil, Plus, Trash2 } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { Badge } from "@/src/components/Badge";
import { Button } from "@/src/components/Button";
import { Card } from "@/src/components/Card";
import { InputField } from "@/src/components/InputField";
import { SelectField } from "@/src/components/SelectField";
import { formatMoney } from "@/src/utils/format";
import type { RentalUnitStatus } from "@/src/services/rental-units";

/** A unit being edited. `id` is absent until it has been saved. */
export interface DraftUnit {
  id?: string;
  unit_number: string;
  floor_level?: string | null;
  bedrooms: number;
  bathrooms: number;
  rent_amount: number;
  status: RentalUnitStatus;
  description?: string | null;
}

const STATUS_OPTIONS: { label: string; value: RentalUnitStatus }[] = [
  { label: "Available", value: "available" },
  { label: "Occupied", value: "occupied" },
  { label: "Under maintenance", value: "maintenance" },
];

const EMPTY: DraftUnit = {
  unit_number: "",
  floor_level: "",
  bedrooms: 1,
  bathrooms: 1,
  rent_amount: 0,
  status: "available",
  description: "",
};

export function UnitsEditor({
  units,
  currency,
  onChange,
  onDelete,
}: {
  units: DraftUnit[];
  currency: string;
  onChange: (next: DraftUnit[]) => void;
  /** Called when a saved unit is removed, so the parent can delete it server-side. */
  onDelete?: (unit: DraftUnit) => void;
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<DraftUnit>(EMPTY);
  const [rentText, setRentText] = useState("");

  function startAdd() {
    setDraft({ ...EMPTY });
    setRentText("");
    setEditingIndex(-1);
  }

  function startEdit(index: number) {
    const unit = units[index];
    setDraft({ ...unit });
    setRentText(unit.rent_amount ? String(unit.rent_amount) : "");
    setEditingIndex(index);
  }

  function cancel() {
    setEditingIndex(null);
    setDraft(EMPTY);
    setRentText("");
  }

  function save() {
    const number = draft.unit_number.trim();
    if (!number) {
      Alert.alert("Unit name required", "Give the unit a name or number, e.g. “A1” or “Ground floor”.");
      return;
    }
    const rent = Number(rentText.replace(/[^0-9.]/g, ""));
    if (!rent || rent <= 0) {
      Alert.alert("Rent required", "Enter the monthly rent for this unit.");
      return;
    }
    const duplicate = units.some(
      (u, i) => i !== editingIndex && u.unit_number.trim().toLowerCase() === number.toLowerCase(),
    );
    if (duplicate) {
      Alert.alert("Duplicate unit", `You already have a unit called “${number}”.`);
      return;
    }

    const next = { ...draft, unit_number: number, rent_amount: rent };
    if (editingIndex === -1) {
      onChange([...units, next]);
    } else if (editingIndex !== null) {
      const copy = [...units];
      copy[editingIndex] = next;
      onChange(copy);
    }
    cancel();
  }

  function remove(index: number) {
    const unit = units[index];
    Alert.alert("Remove unit", `Remove “${unit.unit_number}”?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          onChange(units.filter((_, i) => i !== index));
          if (unit.id && onDelete) onDelete(unit);
        },
      },
    ]);
  }

  const rents = units.map((u) => Number(u.rent_amount)).filter((n) => n > 0);
  const min = rents.length ? Math.min(...rents) : null;
  const max = rents.length ? Math.max(...rents) : null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Units</Text>
        {units.length > 0 && (
          <Text style={styles.rangeText}>
            {min === max
              ? formatMoney(min, currency)
              : `${formatMoney(min, currency)} – ${formatMoney(max, currency)}`}
          </Text>
        )}
      </View>
      <Text style={styles.help}>
        Optional. Add units if this property is let as several separate spaces at
        different rents — the listing will show the range. Leave empty to let the
        whole property at one price.
      </Text>

      {units.map((unit, index) => (
        <Card key={unit.id ?? `${unit.unit_number}-${index}`} padding="md" style={styles.unitCard}>
          <View style={styles.unitHeader}>
            <Text style={styles.unitName}>{unit.unit_number}</Text>
            <Badge
              label={unit.status}
              tone={unit.status === "available" ? "success" : unit.status === "occupied" ? "primary" : "warning"}
              size="sm"
            />
          </View>
          <Text style={styles.unitRent}>{formatMoney(unit.rent_amount, currency)}</Text>
          <View style={styles.unitMeta}>
            <Bed size={14} color={Colors.textMuted} />
            <Text style={styles.metaText}>{unit.bedrooms}</Text>
            <Bath size={14} color={Colors.textMuted} />
            <Text style={styles.metaText}>{unit.bathrooms}</Text>
            {!!unit.floor_level && <Text style={styles.metaText}>· {unit.floor_level}</Text>}
          </View>
          <View style={styles.unitActions}>
            <Pressable onPress={() => startEdit(index)} style={styles.iconBtn} accessibilityLabel={`Edit ${unit.unit_number}`}>
              <Pencil size={16} color={Colors.primary} />
            </Pressable>
            <Pressable onPress={() => remove(index)} style={styles.iconBtn} accessibilityLabel={`Remove ${unit.unit_number}`}>
              <Trash2 size={16} color={Colors.danger} />
            </Pressable>
          </View>
        </Card>
      ))}

      {editingIndex !== null ? (
        <Card padding="md" style={styles.form}>
          <Text style={styles.formTitle}>{editingIndex === -1 ? "Add unit" : "Edit unit"}</Text>
          <InputField
            label="Unit name or number"
            value={draft.unit_number}
            onChangeText={(v) => setDraft({ ...draft, unit_number: v })}
            placeholder="e.g. A1"
          />
          <InputField
            label={`Monthly rent (${currency})`}
            value={rentText}
            onChangeText={setRentText}
            placeholder="0"
            keyboardType="numeric"
          />
          <View style={styles.row}>
            <View style={styles.rowItem}>
              <InputField
                label="Bedrooms"
                value={String(draft.bedrooms)}
                onChangeText={(v) => setDraft({ ...draft, bedrooms: Number(v.replace(/[^0-9]/g, "")) || 0 })}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.rowItem}>
              <InputField
                label="Bathrooms"
                value={String(draft.bathrooms)}
                onChangeText={(v) => setDraft({ ...draft, bathrooms: Number(v.replace(/[^0-9]/g, "")) || 0 })}
                keyboardType="numeric"
              />
            </View>
          </View>
          <InputField
            label="Floor or block (optional)"
            value={draft.floor_level ?? ""}
            onChangeText={(v) => setDraft({ ...draft, floor_level: v })}
            placeholder="e.g. Ground floor"
          />
          <SelectField
            label="Status"
            value={draft.status}
            options={STATUS_OPTIONS}
            onSelect={(v) => setDraft({ ...draft, status: v as RentalUnitStatus })}
            placeholder="Select status"
          />
          <View style={styles.formActions}>
            <Button label="Cancel" variant="ghost" onPress={cancel} flex />
            <Button label={editingIndex === -1 ? "Add unit" : "Save unit"} onPress={save} flex />
          </View>
        </Card>
      ) : (
        <Button
          label="Add a unit"
          variant="outline"
          leftIcon={<Plus size={18} color={Colors.primary} />}
          onPress={startAdd}
          fullWidth
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: FontSize.h3, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  rangeText: { fontSize: FontSize.caption, fontWeight: FontWeight.semibold, color: Colors.primary },
  help: { fontSize: FontSize.caption, color: Colors.textSecondary },
  unitCard: { gap: 4 },
  unitHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  unitName: { fontSize: FontSize.body, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  unitRent: { fontSize: FontSize.body, fontWeight: FontWeight.bold, color: Colors.primary },
  unitMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: FontSize.caption, color: Colors.textMuted },
  unitActions: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.xs },
  iconBtn: { padding: Spacing.xs },
  form: { gap: Spacing.sm },
  formTitle: { fontSize: FontSize.body, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  row: { flexDirection: "row", gap: Spacing.sm },
  rowItem: { flex: 1 },
  formActions: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.xs },
});
