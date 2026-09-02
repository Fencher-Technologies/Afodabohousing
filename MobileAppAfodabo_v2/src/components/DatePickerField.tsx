/**
 * DatePickerField: tap-to-open calendar modal. Replaces free-text date
 * entry, which the iOS numeric keypad made impossible to type (no hyphen).
 * Values are local-timezone YYYY-MM-DD strings.
 */

import { Calendar, ChevronLeft, ChevronRight } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { formatISODateLong, toLocalISODate } from "@/src/lib/dates";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parseISO(iso: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) };
}

interface DatePickerFieldProps {
  label?: string;
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  error?: string | null;
  /** Disallow dates after today (e.g. payment dates). */
  disableFuture?: boolean;
}

export function DatePickerField({
  label,
  value,
  onChange,
  placeholder = "Select date",
  error = null,
  disableFuture = false,
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const today = useMemo(() => parseISO(toLocalISODate(new Date()))!, []);
  const selected = parseISO(value);
  const [viewYear, setViewYear] = useState((selected ?? today).y);
  const [viewMonth, setViewMonth] = useState((selected ?? today).m);

  const openPicker = () => {
    const base = selected ?? today;
    setViewYear(base.y);
    setViewMonth(base.m);
    setOpen(true);
  };

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  // Monday-first grid
  const firstWeekday = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const isDisabledDay = (day: number) =>
    disableFuture &&
    new Date(viewYear, viewMonth, day) > new Date(today.y, today.m, today.d);

  const pick = (day: number) => {
    onChange(toLocalISODate(new Date(viewYear, viewMonth, day)));
    setOpen(false);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Pressable
        onPress={openPicker}
        style={[styles.field, error && styles.fieldError]}
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        accessibilityHint="Opens a calendar to choose a date"
      >
        <Calendar size={18} color={Colors.textMuted} />
        <Text style={[styles.value, !selected && styles.placeholder]}>
          {selected ? formatISODateLong(value) : placeholder}
        </Text>
      </Pressable>
      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <Pressable
                onPress={() => shiftMonth(-1)}
                style={styles.navBtn}
                accessibilityRole="button"
                accessibilityLabel="Previous month"
              >
                <ChevronLeft size={20} color={Colors.textPrimary} />
              </Pressable>
              <Text style={styles.monthLabel}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </Text>
              <Pressable
                onPress={() => shiftMonth(1)}
                style={styles.navBtn}
                accessibilityRole="button"
                accessibilityLabel="Next month"
              >
                <ChevronRight size={20} color={Colors.textPrimary} />
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {WEEKDAYS.map((w) => (
                <Text key={w} style={styles.weekday}>{w}</Text>
              ))}
            </View>

            <View style={styles.grid}>
              {cells.map((day, i) => {
                if (day === null) return <View key={`blank-${i}`} style={styles.cell} />;
                const isSelected =
                  !!selected && selected.y === viewYear && selected.m === viewMonth && selected.d === day;
                const isToday = today.y === viewYear && today.m === viewMonth && today.d === day;
                const disabledDay = isDisabledDay(day);
                return (
                  <Pressable
                    key={day}
                    style={[
                      styles.cell,
                      isToday && styles.cellToday,
                      isSelected && styles.cellSelected,
                    ]}
                    onPress={() => pick(day)}
                    disabled={disabledDay}
                    accessibilityRole="button"
                    accessibilityLabel={`${day} ${MONTH_NAMES[viewMonth]} ${viewYear}`}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        disabledDay && styles.dayDisabled,
                        isSelected && styles.dayTextSelected,
                      ]}
                    >
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const CELL = 44;

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
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    borderRadius: Radii.input,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    minHeight: 52,
  },
  fieldError: { borderColor: Colors.danger },
  value: { flex: 1, fontSize: FontSize.body, color: Colors.textPrimary },
  placeholder: { color: Colors.textMuted },
  errorText: { fontSize: FontSize.caption, color: Colors.danger },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.modal,
    padding: Spacing.lg,
    width: "100%",
    maxWidth: 380,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  navBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  monthLabel: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  weekRow: { flexDirection: "row", marginBottom: Spacing.xs },
  weekday: {
    width: CELL,
    textAlign: "center",
    fontSize: FontSize.micro,
    fontWeight: FontWeight.semibold,
    color: Colors.textMuted,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: CELL,
    height: CELL,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radii.input,
  },
  cellToday: { borderWidth: 1.5, borderColor: Colors.borderStrong },
  cellSelected: { backgroundColor: Colors.primary },
  dayText: { fontSize: FontSize.body, color: Colors.textPrimary },
  dayDisabled: { color: Colors.textMuted, opacity: 0.4 },
  dayTextSelected: { color: Colors.textOnPrimary, fontWeight: FontWeight.bold },
});
