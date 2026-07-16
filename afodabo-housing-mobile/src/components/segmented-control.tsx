import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../theme/tokens';

interface SegmentedControlProps<T extends string> {
  onChange: (value: T) => void;
  options: { label: string; value: T }[];
  value: T;
}

export function SegmentedControl<T extends string>({
  onChange,
  options,
  value,
}: SegmentedControlProps<T>) {
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
