import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import type { ManagerPaymentSummary } from '../../hooks/manager/useManagerPayments';
import { formatUGX } from '../../utils/format';

const stats: {
  backgroundColor: string;
  icon: keyof typeof Ionicons.glyphMap;
  key: keyof Pick<
    ManagerPaymentSummary,
    'confirmedCount' | 'pendingReviewCount' | 'rejectedCount' | 'totalPayments'
  >;
  label: string;
  tone: string;
}[] = [
  {
    backgroundColor: colors.surfaceMuted,
    icon: 'receipt-outline',
    key: 'totalPayments',
    label: 'Total',
    tone: colors.primary,
  },
  {
    backgroundColor: colors.primarySoft,
    icon: 'checkmark-circle-outline',
    key: 'confirmedCount',
    label: 'Confirmed',
    tone: colors.success,
  },
  {
    backgroundColor: colors.accentSoft,
    icon: 'time-outline',
    key: 'pendingReviewCount',
    label: 'Pending',
    tone: colors.warning,
  },
  {
    backgroundColor: colors.surfaceMuted,
    icon: 'close-circle-outline',
    key: 'rejectedCount',
    label: 'Rejected',
    tone: colors.error,
  },
];

export function ManagerPaymentSummaryCard({ summary }: { summary: ManagerPaymentSummary }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons color={colors.primary} name="wallet-outline" size={20} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Payment Review</Text>
          <Text style={styles.title}>{summary.pendingReviewCount} need attention</Text>
          <Text style={styles.body}>
            {formatUGX(summary.totalConfirmedAmount)} confirmed rent total.
          </Text>
        </View>
      </View>
      <View style={styles.grid}>
        {stats.map((stat) => (
          <Stat
            backgroundColor={stat.backgroundColor}
            icon={stat.icon}
            key={stat.key}
            label={stat.label}
            tone={stat.tone}
            value={summary[stat.key]}
          />
        ))}
      </View>
    </View>
  );
}

function Stat({
  backgroundColor,
  icon,
  label,
  tone,
  value,
}: {
  backgroundColor: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone: string;
  value: number;
}) {
  return (
    <View style={[styles.stat, { backgroundColor }]}>
      <View style={[styles.statIcon, { backgroundColor: colors.surface }]}>
        <Ionicons color={tone} name={icon} size={18} />
      </View>
      <Text style={[styles.statValue, { color: tone }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
    gap: spacing.md,
    padding: spacing.lg,
  },
  eyebrow: {
    color: colors.primary,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  headerIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  stat: {
    alignItems: 'center',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.input,
    flexBasis: '47%',
    gap: spacing.xs,
    minHeight: 112,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  statIcon: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  statLabel: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
    textAlign: 'center',
  },
  statValue: {
    fontFamily: typography.bodyStrong,
    fontSize: 24,
    lineHeight: 28,
    textAlign: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 26,
    lineHeight: 32,
  },
});
