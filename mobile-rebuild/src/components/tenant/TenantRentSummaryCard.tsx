import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import type { TenantDashboardSummary } from '../../services/tenant.service';
import { formatUGX } from '../../utils/format';
import { toDisplayDate } from '../../utils/dates';

const statusCopy = {
  active: {
    helper: 'Your tenancy is active.',
    label: 'Rent Active',
  },
  due_soon: {
    helper: 'Your rent period is ending soon.',
    label: 'Due Soon',
  },
  no_tenancy: {
    helper: 'A house manager needs to link an active tenancy first.',
    label: 'No Tenancy',
  },
  overdue: {
    helper: 'Your current rent period has passed.',
    label: 'Overdue',
  },
};

export function TenantRentSummaryCard({ summary }: { summary: TenantDashboardSummary }) {
  const { activeTenancy, daysRemaining, rentStatus } = summary;
  const copy = statusCopy[rentStatus];
  const isUrgent = rentStatus === 'overdue' || rentStatus === 'due_soon';

  return (
    <View style={[styles.card, isUrgent && styles.urgentCard]}>
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>Rent Status</Text>
        <View style={[styles.statusPill, isUrgent && styles.urgentPill]}>
          <Text style={[styles.statusText, isUrgent && styles.urgentText]}>{copy.label}</Text>
        </View>
      </View>

      <Text style={styles.amount}>
        {activeTenancy ? formatUGX(activeTenancy.rent_amount) : 'No active rent'}
      </Text>
      <Text style={styles.helper}>{copy.helper}</Text>

      {activeTenancy ? (
        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Period ends</Text>
            <Text style={styles.metaValue}>{toDisplayDate(activeTenancy.rent_end_date)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Days left</Text>
            <Text style={styles.metaValue}>
              {daysRemaining !== null && daysRemaining >= 0 ? `${daysRemaining} days` : 'Overdue'}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  amount: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 32,
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
  eyebrow: {
    color: colors.primary,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  helper: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 22,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metaItem: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.input,
    flex: 1,
    gap: 3,
    padding: spacing.md,
  },
  metaLabel: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
  },
  metaValue: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 14,
  },
  statusPill: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  statusText: {
    color: colors.primary,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
  },
  urgentCard: {
    borderColor: colors.accent,
  },
  urgentPill: {
    backgroundColor: colors.accentSoft,
  },
  urgentText: {
    color: colors.accent,
  },
});
