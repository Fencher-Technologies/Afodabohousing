import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';
import type { PaymentFilterValue } from '../../hooks/tenant/useTenantPayments';

interface PaymentStatusFilterProps {
  onChange: (value: PaymentFilterValue) => void;
  value: PaymentFilterValue;
}

const options: { label: string; value: PaymentFilterValue }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Uploaded', value: 'uploaded' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Rejected', value: 'rejected' },
];

export function PaymentStatusFilter({ onChange, value }: PaymentStatusFilterProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {options.map((option) => {
        const active = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textSecondary,
    fontFamily: typography.bodyStrong,
    fontSize: 13,
  },
  chipTextActive: {
    color: colors.primaryForeground,
  },
  content: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
});
