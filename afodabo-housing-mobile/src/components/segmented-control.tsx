import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme/tokens';

interface SegmentedControlProps<T extends string> {
  onChange: (value: T) => void;
  options: { label: string; value: T }[];
  value: T;
  variant?: 'segments' | 'pills';
}

export function SegmentedControl<T extends string>({
  onChange,
  options,
  value,
  variant = 'segments',
}: SegmentedControlProps<T>) {
  if (variant === 'pills') {
    return (
      <View style={styles.pillsContainer}>
        {options.map((option) => {
          const isActive = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[styles.pillsSegment, isActive && styles.pillsSegmentActive]}
            >
              <Text style={[styles.pillsText, isActive && styles.pillsTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scrollView}
    >
      <View style={styles.container}>
        {options.map((option) => {
          const active = option.value === value;

          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[styles.segment, active ? styles.activeSegment : null]}
            >
              <Text style={[styles.text, active ? styles.activeText : null]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  activeSegment: {
    backgroundColor: colors.primary,
  },
  activeText: {
    color: colors.primaryForeground,
  },
  container: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.card,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: 6,
  },
  pillsContainer: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    flexDirection: 'row',
    padding: 4,
  },
  pillsSegment: {
    alignItems: 'center',
    borderRadius: radii.pill,
    flex: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: spacing.md,
  },
  pillsSegmentActive: {
    backgroundColor: colors.primary,
  },
  pillsText: {
    color: colors.textSecondary,
    fontFamily: typography.bodyStrong,
    fontSize: 14,
  },
  pillsTextActive: {
    color: colors.primaryForeground,
  },
  scrollContent: {
    alignItems: 'flex-start',
  },
  scrollView: {
    flexGrow: 0,
  },
  segment: {
    borderRadius: radii.card,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  text: {
    color: colors.textSecondary,
    fontFamily: typography.bodyStrong,
    fontSize: 14,
  },
});
