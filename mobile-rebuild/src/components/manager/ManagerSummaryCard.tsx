import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import type { ManagerDashboardSummary } from '../../services/manager.service';

const summaryItems = [
  {
    backgroundColor: colors.primarySoft,
    key: 'totalProperties',
    label: 'Properties',
    tone: colors.primary,
  },
  {
    backgroundColor: colors.surfaceMuted,
    key: 'activeTenancies',
    label: 'Tenancies',
    tone: colors.primaryLight,
  },
  {
    backgroundColor: colors.accentSoft,
    key: 'pendingProofs',
    label: 'Proofs',
    tone: colors.accent,
  },
  {
    backgroundColor: colors.surfaceMuted,
    key: 'unreadMessages',
    label: 'Unread',
    tone: colors.warning,
  },
] as const;

export function ManagerSummaryCard({ summary }: { summary: ManagerDashboardSummary }) {
  const proofTitle =
    summary.pendingProofs === 0
      ? 'No proof checks waiting'
      : `${summary.pendingProofs} proof ${summary.pendingProofs === 1 ? 'check' : 'checks'} waiting`;

  return (
    <View style={styles.card}>
      <View style={styles.heroRow}>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>Priority</Text>
          <Text style={styles.title}>{proofTitle}</Text>
        </View>
        <View style={styles.proofBadge}>
          <Text style={styles.proofValue}>{summary.pendingProofs}</Text>
          <Text style={styles.proofLabel}>Proofs</Text>
        </View>
      </View>
      <View style={styles.grid}>
        {summaryItems.map((item) => (
          <View key={item.key} style={[styles.stat, { backgroundColor: item.backgroundColor }]}>
            <Text style={[styles.statValue, { color: item.tone }]}>{summary[item.key]}</Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </View>
        ))}
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
    gap: spacing.md,
    padding: spacing.md,
  },
  eyebrow: {
    color: colors.accent,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  heroCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  heroRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  proofBadge: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.input,
    minWidth: 72,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  proofLabel: {
    color: colors.primaryForeground,
    fontFamily: typography.body,
    fontSize: 11,
    opacity: 0.8,
  },
  proofValue: {
    color: colors.primaryForeground,
    fontFamily: typography.bodyStrong,
    fontSize: 22,
  },
  stat: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.input,
    flexBasis: '47%',
    gap: 3,
    padding: spacing.md,
  },
  statLabel: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
  },
  statValue: {
    color: colors.primary,
    fontFamily: typography.bodyStrong,
    fontSize: 20,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 24,
    lineHeight: 30,
  },
});
