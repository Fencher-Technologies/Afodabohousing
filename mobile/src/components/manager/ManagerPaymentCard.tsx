import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getPaymentStatusMeta } from '../payment/payment-status';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import type { PaymentRow } from '../../types/database';
import { toDisplayDate } from '../../utils/dates';
import { formatUGX } from '../../utils/format';

interface ManagerPaymentCardProps {
  onConfirm: (payment: PaymentRow) => void;
  onReject: (payment: PaymentRow) => void;
  payment: PaymentRow;
  reviewing?: boolean;
}

export function ManagerPaymentCard({
  onConfirm,
  onReject,
  payment,
  reviewing = false,
}: ManagerPaymentCardProps) {
  const statusMeta = getPaymentStatusMeta(payment.status);
  const canReview = payment.status === 'pending' || payment.status === 'uploaded';

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
        Period: {toDisplayDate(payment.period_start)} - {toDisplayDate(payment.period_end)}
      </Text>
      <Text style={styles.meta}>Tenant ID: {payment.tenant_id}</Text>
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
      {canReview ? (
        <View style={styles.reviewRow}>
          <Pressable
            disabled={reviewing}
            onPress={() => onReject(payment)}
            style={({ pressed }) => [
              styles.reviewButton,
              styles.rejectButton,
              reviewing && styles.disabledAction,
              pressed && !reviewing && styles.pressedAction,
            ]}
          >
            <Text style={[styles.reviewButtonText, styles.rejectButtonText]}>Reject</Text>
          </Pressable>
          <Pressable
            disabled={reviewing}
            onPress={() => onConfirm(payment)}
            style={({ pressed }) => [
              styles.reviewButton,
              styles.confirmButton,
              reviewing && styles.disabledAction,
              pressed && !reviewing && styles.pressedAction,
            ]}
          >
            <Text style={[styles.reviewButtonText, styles.confirmButtonText]}>Confirm</Text>
          </Pressable>
        </View>
      ) : null}
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
  disabledAction: {
    opacity: 0.5,
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  confirmButtonText: {
    color: colors.primaryForeground,
  },
  pressedAction: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  rejectButton: {
    backgroundColor: colors.surface,
    borderColor: colors.error,
    borderWidth: 1,
  },
  rejectButtonText: {
    color: colors.error,
  },
  reviewButton: {
    alignItems: 'center',
    borderRadius: radii.input,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 96,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  reviewButtonText: {
    fontFamily: typography.bodyStrong,
    fontSize: 14,
  },
  reviewRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
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
