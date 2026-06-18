import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { getPaymentStatusMeta } from '../payment/payment-status';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import type { PaymentRow } from '../../types/database';
import { toDisplayDate } from '../../utils/dates';
import { formatUGX } from '../../utils/format';

export function ManagerPaymentLatestCard({ payment }: { payment: PaymentRow | null }) {
  if (!payment) {
    return (
      <View style={styles.card}>
        <View style={styles.emptyRow}>
          <View style={styles.emptyIcon}>
            <Ionicons color={colors.accent} name="receipt-outline" size={24} />
          </View>
          <View style={styles.emptyCopy}>
            <Text style={styles.eyebrow}>Latest Payment</Text>
            <Text style={styles.emptyTitle}>No payment yet</Text>
            <Text style={styles.body}>Tenant payment activity will appear here.</Text>
          </View>
        </View>
      </View>
    );
  }

  const statusMeta = getPaymentStatusMeta(payment.status);

  return (
    <View style={styles.card}>
      <View style={styles.paymentHeader}>
        <View style={styles.paymentIcon}>
          <Ionicons color={colors.primary} name="receipt-outline" size={22} />
        </View>
        <View style={styles.paymentCopy}>
          <Text style={styles.eyebrow}>Latest Payment</Text>
          <Text style={styles.title}>{formatUGX(payment.amount)}</Text>
        </View>
      </View>
      <View style={styles.statusRow}>
        <View style={[styles.statusPill, { backgroundColor: statusMeta.backgroundColor }]}>
          <Text style={[styles.statusText, { color: statusMeta.textColor }]}>
            {statusMeta.label}
          </Text>
        </View>
      </View>
      <Text style={styles.body}>
        Created {toDisplayDate(payment.created_at)}.{' '}
        {payment.proof_url ? 'Proof is available.' : 'No proof uploaded yet.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 22,
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
  emptyCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  emptyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 18,
    lineHeight: 23,
  },
  eyebrow: {
    color: colors.primary,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusRow: {
    alignItems: 'flex-start',
  },
  statusText: {
    fontFamily: typography.bodyStrong,
    fontSize: 11,
  },
  paymentCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  paymentHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  paymentIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 28,
    lineHeight: 34,
  },
});
