import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../theme';

const actions = [
  {
    icon: 'cloud-upload-outline',
    label: 'Upload Proof',
    note: 'Coming soon',
    tone: colors.accent,
  },
  { icon: 'card-outline', label: 'Pay Rent', note: 'Coming soon', tone: colors.primary },
  { icon: 'chatbubbles-outline', label: 'Messages', note: 'Coming soon', tone: colors.gold },
];

export function TenantQuickActions() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Quick Actions</Text>
      <View style={styles.grid}>
        {actions.map((action) => (
          <View key={action.label} style={styles.actionTile}>
            <View style={styles.actionIcon}>
              <Ionicons
                color={action.tone}
                name={action.icon as keyof typeof Ionicons.glyphMap}
                size={19}
              />
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
            <Text style={styles.actionNote}>{action.note}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionIcon: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  actionLabel: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 13,
    lineHeight: 17,
  },
  actionNote: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 11,
  },
  actionTile: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.input,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xs,
    minHeight: 112,
    justifyContent: 'center',
    padding: spacing.sm,
  },
  card: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.displayStrong,
    fontSize: 24,
  },
});
