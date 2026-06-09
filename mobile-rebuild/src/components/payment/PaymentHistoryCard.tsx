import { StyleSheet, Text, View } from 'react-native';
import { getPaymentStatusMeta } from './payment-status';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import type { PaymentRow } from '../../types/database';
import { toDisplayDate } from '../../utils/dates';
import { formatUGX } from '../../utils/format';

export function PaymentHistoryCard({ payment }: { payment: PaymentRow }) {
  const statusMeta = getPaymentStatusMeta(payment.status);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.amount}>{formatUGX(payment.amount)}</Text>
        <View style={[styles.statusPill, { backgroundColor: statusMeta.backgroundColor }]}>
          <Text style={[styles.statusText, { color: statusMeta.textColor }]}>
            {statusMeta.label}
          </Text>
        </View>
      </View>
      <Text style={styles.meta}>
        {toDisplayDate(payment.period_start)} - {toDisplayDate(payment.period_end)}
      </Text>
      <Text style={styles.meta}>Created {toDisplayDate(payment.created_at)}</Text>
      {payment.notes ? <Text style={styles.note}>{payment.notes}</Text> : null}
      <View style={styles.assetRow}>
        <Text style={styles.assetText}>
          {payment.proof_url ? 'Proof on file' : 'No proof file'}
        </Text>
        <Text style={styles.assetText}>
          {payment.receipt_url ? 'Receipt on file' : 'No receipt yet'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  amount: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 18,
  },
  assetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  assetText: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 11,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
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
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  meta: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
  },
  note: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 20,
  },
  statusPill: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusText: {
    fontFamily: typography.bodyStrong,
    fontSize: 11,
  },
});
