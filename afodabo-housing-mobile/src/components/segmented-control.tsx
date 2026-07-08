import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  const positions = useRef<number[]>([]);
  const widths = useRef<number[]>([]);
  const translateX = useRef(new Animated.Value(0)).current;
  const [indicatorWidth, setIndicatorWidth] = useState(0);

  const activeIndex = options.findIndex((o) => o.value === value);

  useEffect(() => {
    const x = positions.current[activeIndex];
    const w = widths.current[activeIndex];
    if (x !== undefined) {
      Animated.spring(translateX, {
        toValue: x,
        useNativeDriver: true,
        tension: 120,
        friction: 10,
      }).start();
    }
    if (w !== undefined) {
      setIndicatorWidth(w);
    }
  }, [value, activeIndex, translateX]);

  if (variant === 'pills') {
    return (
      <View style={styles.pillsContainer}>
        <Animated.View
          style={[
            styles.pillsIndicator,
            {
              width: indicatorWidth,
              transform: [{ translateX }],
            },
          ]}
        />
        {options.map((option, idx) => {
          const isActive = idx === activeIndex;
          return (
            <Pressable
              key={option.value}
              onLayout={(e) => {
                const { x, width } = e.nativeEvent.layout;
                positions.current[idx] = x;
                widths.current[idx] = width;
              }}
              onPress={() => onChange(option.value)}
              style={styles.pillsSegment}
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
    position: 'relative',
  },
  pillsIndicator: {
    backgroundColor: colors.surface,
    borderRadius: radii.pill - 4,
    position: 'absolute',
    top: 4,
    bottom: 4,
  },
  pillsSegment: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: spacing.md,
    zIndex: 1,
  },
  pillsText: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
  },
  pillsTextActive: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
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
