import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { getPaymentStatusMeta } from './payment-status';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import type { PaymentRow } from '../../types/database';
import { toDisplayDate } from '../../utils/dates';
import { formatUGX } from '../../utils/format';

export function PaymentDetailPreview({ payment }: { payment: PaymentRow | null }) {
  if (!payment) {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.iconBadge}>
            <Ionicons color={colors.accent} name="receipt-outline" size={20} />
          </View>
          <Text style={styles.eyebrow}>Latest Payment</Text>
        </View>
        <Text style={styles.title}>No payment yet</Text>
        <Text style={styles.body}>Your latest payment details will appear here.</Text>
      </View>
    );
  }

  const statusMeta = getPaymentStatusMeta(payment.status);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconBadge}>
          <Ionicons color={colors.primary} name="receipt-outline" size={20} />
        </View>
        <Text style={styles.eyebrow}>Latest Payment</Text>
      </View>
      <Text style={styles.title}>{formatUGX(payment.amount)}</Text>
      <View style={[styles.statusPill, { backgroundColor: statusMeta.backgroundColor }]}>
        <Text style={[styles.statusText, { color: statusMeta.textColor }]}>{statusMeta.label}</Text>
      </View>
      <Text style={styles.body}>
        Covers {toDisplayDate(payment.period_start)} to {toDisplayDate(payment.period_end)}.
      </Text>
      <Text style={styles.body}>{payment.notes || 'No notes were added.'}</Text>
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
  eyebrow: {
    color: colors.primary,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconBadge: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusText: {
    fontFamily: typography.bodyStrong,
    fontSize: 11,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 30,
  },
});
