import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, typography } from '../theme/tokens';

interface BadgeProps {
  children: React.ReactNode;
  tone?: 'accent' | 'default' | 'gold' | 'primary' | 'success' | 'warning';
  textDecorationLine?: 'underline' | 'line-through' | 'underline line-through' | 'none';
}

export function Badge({ children, tone = 'default', textDecorationLine }: BadgeProps) {
  const palette = {
    accent: { backgroundColor: '#F9E2D6', color: colors.accent },
    default: { backgroundColor: colors.surfaceMuted, color: colors.textSecondary },
    gold: { backgroundColor: '#FCECC1', color: '#8A6410' },
    primary: { backgroundColor: '#DDEAE3', color: colors.primary },
    success: { backgroundColor: '#D9EEE2', color: colors.success },
    warning: { backgroundColor: '#F8EACA', color: colors.warning },
  }[tone];

  return (
    <View style={[styles.badge, { backgroundColor: palette.backgroundColor }]}>
      <Text style={[styles.text, { color: palette.color }, textDecorationLine && { textDecorationLine }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  text: {
    fontFamily: typography.bodyStrong,
    fontSize: 12,
  },
});
