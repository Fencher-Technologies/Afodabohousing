import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../theme';

interface ManagerEmptyStateProps {
  description: string;
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
}

export function ManagerEmptyState({
  description,
  icon = 'file-tray-outline',
  title,
}: ManagerEmptyStateProps) {
  return (
    <View style={styles.card}>
      <View style={styles.iconBadge}>
        <Ionicons color={colors.accent} name={icon} size={22} />
      </View>
      <View style={styles.accentLine} />
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    borderLeftColor: colors.accent,
    borderLeftWidth: 4,
    gap: spacing.md,
    padding: spacing.lg,
  },
  accentLine: {
    backgroundColor: colors.gold,
    borderRadius: radii.pill,
    height: 4,
    width: 44,
  },
  copy: {
    gap: spacing.xs,
  },
  description: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 22,
  },
  iconBadge: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.displayStrong,
    fontSize: 22,
  },
});
