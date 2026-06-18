import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../theme';

interface AppHeaderProps {
  eyebrow?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  subtitle?: string;
  title: string;
}

export function AppHeader({
  eyebrow,
  icon = 'home-outline',
  style,
  subtitle,
  title,
}: AppHeaderProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.topRow}>
        <View style={styles.iconBadge}>
          <Ionicons color={colors.primary} name={icon} size={22} />
        </View>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      </View>
      <Text adjustsFontSizeToFit numberOfLines={2} style={styles.title}>
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.accentRow}>
        <View style={styles.greenLine} />
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
    paddingTop: spacing.xs,
  },
  card: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  eyebrow: {
    color: colors.accent,
    flex: 1,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
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
    width: 42,
  },
  iconBadge: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 23,
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
    fontSize: 32,
    lineHeight: 38,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
