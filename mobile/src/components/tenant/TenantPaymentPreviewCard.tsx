import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import type { PaymentRow } from '../../types/database';
import { toDisplayDate } from '../../utils/dates';
import { formatStatusLabel, formatUGX } from '../../utils/format';

export function TenantPaymentPreviewCard({ payments }: { payments: PaymentRow[] }) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Recent Payments</Text>
        <Text style={styles.count}>{payments.length} shown</Text>
      </View>

      {payments.length === 0 ? (
        <Text style={styles.emptyText}>Payment records will appear here when available.</Text>
      ) : (
        payments.map((payment) => (
          <View key={payment.id} style={styles.paymentRow}>
            <View style={styles.paymentCopy}>
              <Text style={styles.amount}>{formatUGX(payment.amount)}</Text>
              <Text style={styles.meta}>{toDisplayDate(payment.created_at)}</Text>
              {payment.notes ? <Text style={styles.meta}>{payment.notes}</Text> : null}
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusText}>{formatStatusLabel(payment.status)}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  amount: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 15,
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
  count: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
  },
  emptyText: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 22,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  meta: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
    lineHeight: 18,
  },
  paymentCopy: {
    flex: 1,
    gap: 3,
  },
  paymentRow: {
    alignItems: 'flex-start',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    paddingTop: spacing.md,
  },
  statusPill: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusText: {
    color: colors.primary,
    fontFamily: typography.bodyStrong,
    fontSize: 11,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 24,
  },
});
