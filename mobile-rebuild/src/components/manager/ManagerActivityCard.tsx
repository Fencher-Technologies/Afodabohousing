import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import type { ManagerDashboardPayload } from '../../services/manager.service';
import { toDisplayDate } from '../../utils/dates';
import { formatStatusLabel, formatUGX } from '../../utils/format';

export function ManagerActivityCard({ dashboard }: { dashboard: ManagerDashboardPayload }) {
  const rows = [
    {
      label: 'Latest property',
      value: dashboard.latestProperty?.title || 'No property yet',
    },
    {
      label: 'Latest payment',
      value: dashboard.latestPayment
        ? `${formatUGX(dashboard.latestPayment.amount)} - ${formatStatusLabel(
            dashboard.latestPayment.status,
          )}`
        : 'No payment records',
    },
    {
      label: 'Latest message',
      value: dashboard.latestMessage
        ? `${toDisplayDate(dashboard.latestMessage.created_at)} - ${dashboard.latestMessage.content}`
        : 'No messages yet',
    },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Latest Activity</Text>
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <Text style={styles.label}>{row.label}</Text>
          <Text numberOfLines={2} style={styles.value}>
            {row.value}
          </Text>
        </View>
      ))}
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
    gap: spacing.sm,
    padding: spacing.md,
  },
  label: {
    color: colors.primary,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  row: {
    backgroundColor: colors.primarySoft,
    borderLeftColor: colors.accent,
    borderLeftWidth: 3,
    borderRadius: radii.input,
    gap: spacing.xs,
    padding: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 22,
  },
  value: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 21,
  },
});
