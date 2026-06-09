import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../theme';

interface PageHeaderProps {
  label: string;
  onBack?: () => void;
  subtitle: string;
  title: string;
}

export function PageHeader({ label, onBack, subtitle, title }: PageHeaderProps) {
  return (
    <View style={styles.shell}>
      <View style={styles.topAccent}>
        <View style={styles.goldDot} />
        <View style={styles.greenLine} />
        <View style={styles.terracottaDot} />
      </View>
      {onBack ? (
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Ionicons color={colors.primary} name="chevron-back" size={21} />
        </Pressable>
      ) : null}
      <View style={styles.labelPill}>
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text adjustsFontSizeToFit numberOfLines={2} style={styles.title}>
        {title}
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <View style={styles.accentRow}>
        <View style={styles.smallGreenLine} />
        <View style={styles.goldDot} />
        <View style={styles.terracottaDot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  accentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    paddingTop: 2,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    left: spacing.md,
    position: 'absolute',
    top: spacing.md,
    width: 38,
  },
  pressed: {
    opacity: 0.72,
  },
  shell: {
    ...shadows.card,
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.modal,
    borderWidth: 1,
    gap: spacing.xs,
    overflow: 'hidden',
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  goldDot: {
    backgroundColor: colors.gold,
    borderRadius: radii.pill,
    height: 8,
    width: 8,
  },
  greenLine: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    height: 4,
    width: 72,
  },
  label: {
    color: colors.accent,
    fontFamily: typography.bodyStrong,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  labelPill: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  smallGreenLine: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    height: 4,
    width: 38,
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 300,
    textAlign: 'center',
  },
  terracottaDot: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    height: 8,
    width: 8,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.displayStrong,
    fontSize: 33,
    lineHeight: 39,
    textAlign: 'center',
  },
  topAccent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    paddingBottom: spacing.sm,
    width: '100%',
  },
});
