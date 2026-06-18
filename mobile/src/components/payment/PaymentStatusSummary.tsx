import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import type { TenantPaymentSummary } from '../../hooks/tenant/useTenantPayments';
import { formatUGX } from '../../utils/format';

export function PaymentStatusSummary({ summary }: { summary: TenantPaymentSummary }) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Payment Summary</Text>
      <Text style={styles.amount}>{formatUGX(summary.totalConfirmedAmount)}</Text>
      <Text style={styles.helper}>Total confirmed rent payments.</Text>
      <View style={styles.statsRow}>
        <View style={[styles.stat, styles.confirmedStat]}>
          <Text style={styles.statValue}>{summary.confirmedCount}</Text>
          <Text style={styles.statLabel}>Confirmed</Text>
        </View>
        <View style={[styles.stat, styles.pendingStat]}>
          <Text style={[styles.statValue, styles.pendingValue]}>{summary.pendingReviewCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.stat, styles.rejectedStat]}>
          <Text style={[styles.statValue, styles.rejectedValue]}>{summary.rejectedCount}</Text>
          <Text style={styles.statLabel}>Rejected</Text>
        </View>
      </View>
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
  helper: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
  },
  confirmedStat: {
    backgroundColor: colors.primarySoft,
  },
  pendingStat: {
    backgroundColor: colors.surfaceMuted,
  },
  pendingValue: {
    color: colors.warning,
  },
  rejectedStat: {
    backgroundColor: colors.accentSoft,
  },
  rejectedValue: {
    color: colors.error,
  },
  stat: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.input,
    flex: 1,
    gap: 3,
    padding: spacing.md,
  },
  statLabel: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statValue: {
    color: colors.primary,
    fontFamily: typography.bodyStrong,
    fontSize: 18,
  },
});
