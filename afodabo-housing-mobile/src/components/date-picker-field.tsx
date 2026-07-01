import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme/tokens';

interface DatePickerFieldProps {
  label: string;
  maxDate?: string;
  minDate?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}

function parseDateValue(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIsoDate(value: Date) {
  return format(value, 'yyyy-MM-dd');
}

function isBlocked(date: Date, minDate?: Date | null, maxDate?: Date | null) {
  if (minDate && isBefore(date, minDate) && !isSameDay(date, minDate)) {
    return true;
  }

  if (maxDate && isAfter(date, maxDate) && !isSameDay(date, maxDate)) {
    return true;
  }

  return false;
}

export function DatePickerField({
  label,
  maxDate,
  minDate,
  onChange,
  placeholder = 'Select date',
  value,
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const selectedDate = parseDateValue(value);
  const parsedMinDate = parseDateValue(minDate);
  const parsedMaxDate = parseDateValue(maxDate);
  const [monthCursor, setMonthCursor] = useState<Date>(selectedDate ?? parsedMinDate ?? new Date());

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(monthCursor);
    const monthEnd = endOfMonth(monthCursor);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({
      end: calendarEnd,
      start: calendarStart,
    });
  }, [monthCursor]);

  const openPicker = () => {
    setMonthCursor(selectedDate ?? parsedMinDate ?? new Date());
    setOpen(true);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={openPicker} style={styles.trigger}>
        <Text style={value ? styles.triggerValue : styles.triggerPlaceholder}>
          {selectedDate ? format(selectedDate, 'EEE, MMM d, yyyy') : placeholder}
        </Text>
        <Text style={styles.triggerMeta}>{value || 'Tap to choose'}</Text>
      </Pressable>

      <Modal animationType="fade" onRequestClose={() => setOpen(false)} transparent visible={open}>
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.sheet}>
                <View style={styles.sheetHeader}>
                  <View>
                    <Text style={styles.sheetEyebrow}>{label}</Text>
                    <Text style={styles.sheetTitle}>{format(monthCursor, 'MMMM yyyy')}</Text>
                  </View>
                  <View style={styles.navRow}>
                    <Pressable
                      onPress={() => setMonthCursor((current) => subMonths(current, 1))}
                      style={styles.navButton}
                    >
                      <Text style={styles.navButtonText}>Prev</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setMonthCursor((current) => addMonths(current, 1))}
                      style={styles.navButton}
                    >
                      <Text style={styles.navButtonText}>Next</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.weekRow}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayLabel) => (
                    <Text key={dayLabel} style={styles.weekLabel}>
                      {dayLabel}
                    </Text>
                  ))}
                </View>

                <View style={styles.grid}>
                  {calendarDays.map((day) => {
                    const dayOutsideMonth = !isSameMonth(day, monthCursor);
                    const disabled = isBlocked(day, parsedMinDate, parsedMaxDate);
                    const selected = selectedDate ? isSameDay(day, selectedDate) : false;

                    return (
                      <Pressable
                        disabled={disabled}
                        key={day.toISOString()}
                        onPress={() => {
                          onChange(toIsoDate(day));
                          setOpen(false);
                        }}
                        style={[
                          styles.dayCell,
                          selected ? styles.dayCellSelected : null,
                          disabled ? styles.dayCellDisabled : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            dayOutsideMonth ? styles.dayTextMuted : null,
                            selected ? styles.dayTextSelected : null,
                            disabled ? styles.dayTextDisabled : null,
                            isToday(day) && !selected ? styles.dayTextToday : null,
                          ]}
                        >
                          {format(day, 'd')}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.sheetFooter}>
                  <Pressable
                    onPress={() => {
                      onChange('');
                      setOpen(false);
                    }}
                    style={styles.footerButton}
                  >
                    <Text style={styles.footerButtonText}>Clear</Text>
                  </Pressable>
                  <Pressable onPress={() => setOpen(false)} style={styles.footerButton}>
                    <Text style={styles.footerButtonText}>Close</Text>
                  </Pressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  dayCell: {
    alignItems: 'center',
    borderRadius: radii.input,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  dayCellDisabled: {
    opacity: 0.35,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayText: {
    color: colors.textPrimary,
    fontFamily: typography.body,
    fontSize: 14,
  },
  dayTextDisabled: {
    color: colors.textMuted,
  },
  dayTextMuted: {
    color: colors.textMuted,
  },
  dayTextSelected: {
    color: colors.primaryForeground,
    fontFamily: typography.bodyStrong,
  },
  dayTextToday: {
    color: colors.accent,
    fontFamily: typography.bodyStrong,
  },
  footerButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: 88,
    paddingHorizontal: spacing.md,
  },
  footerButtonText: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
  label: {
    color: colors.textSecondary,
    fontFamily: typography.bodyStrong,
    fontSize: 13,
    marginBottom: 8,
  },
  navButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    justifyContent: 'center',
    minHeight: 36,
    minWidth: 64,
    paddingHorizontal: spacing.sm,
  },
  navButtonText: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 13,
  },
  navRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  overlay: {
    backgroundColor: colors.overlay,
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.modal,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  sheetEyebrow: {
    color: colors.textMuted,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 24,
  },
  trigger: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.input,
    borderWidth: 1,
    gap: 4,
    minHeight: 58,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  triggerMeta: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
  },
  triggerPlaceholder: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 15,
  },
  triggerValue: {
    color: colors.textPrimary,
    fontFamily: typography.body,
    fontSize: 15,
  },
  weekLabel: {
    color: colors.textMuted,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
    textAlign: 'center',
    width: 40,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  wrapper: {
    gap: 2,
  },
});
