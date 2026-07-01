import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../theme/tokens';

interface StatCardProps {
  label: string;
  subtitle: string;
  value: string;
}

export function StatCard({ label, subtitle, value }: StatCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    padding: spacing.md,
    ...shadows.card,
  },
  label: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 14,
    marginTop: 4,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
    marginTop: 4,
  },
  value: {
    color: colors.gold,
    fontFamily: typography.display,
    fontSize: 28,
  },
});
