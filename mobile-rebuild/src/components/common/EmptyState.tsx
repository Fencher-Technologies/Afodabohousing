import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../theme';

interface EmptyStateProps {
  description: string;
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
}

export function EmptyState({ description, icon = 'home-outline', title }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <Ionicons color={colors.accent} name={icon} size={22} />
      </View>
      <View style={styles.accentLine} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...shadows.card,
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    gap: spacing.sm,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.lg,
  },
  accentLine: {
    backgroundColor: colors.gold,
    borderRadius: radii.pill,
    height: 4,
    width: 44,
  },
  description: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 22,
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.pill,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.displayStrong,
    fontSize: 22,
    lineHeight: 27,
  },
});
