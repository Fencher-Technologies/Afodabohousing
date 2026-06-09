import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import type { ManagerTenancy } from '../../services/tenancies.service';
import { toDisplayDate } from '../../utils/dates';
import { formatStatusLabel, formatUGX } from '../../utils/format';

interface ManagerTenancyCardProps {
  onPress: () => void;
  tenancy: ManagerTenancy;
}

function getStatusColors(status: ManagerTenancy['status']) {
  if (status === 'active') {
    return {
      backgroundColor: colors.primarySoft,
      color: colors.success,
    };
  }

  if (status === 'terminated') {
    return {
      backgroundColor: colors.accentSoft,
      color: colors.error,
    };
  }

  return {
    backgroundColor: colors.surfaceMuted,
    color: colors.textSecondary,
  };
}

export function ManagerTenancyCard({ onPress, tenancy }: ManagerTenancyCardProps) {
  const statusColors = getStatusColors(tenancy.status);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text numberOfLines={1} style={styles.title}>
            {tenancy.property_title || 'Property tenancy'}
          </Text>
          <Text numberOfLines={1} style={styles.tenant}>
            {tenancy.tenant_name || 'Tenant'}{' '}
            {tenancy.tenant_phone ? `- ${tenancy.tenant_phone}` : ''}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: statusColors.backgroundColor }]}>
          <Text style={[styles.statusText, { color: statusColors.color }]}>
            {formatStatusLabel(tenancy.status)}
          </Text>
        </View>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.label}>Rent</Text>
        <Text style={styles.value}>{formatUGX(tenancy.rent_amount)}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.label}>Period</Text>
        <Text style={styles.value}>
          {toDisplayDate(tenancy.rent_start_date)} - {toDisplayDate(tenancy.rent_end_date)}
        </Text>
      </View>
      <Text style={styles.meta}>{formatStatusLabel(tenancy.rent_period)} billing</Text>
    </Pressable>
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
    padding: spacing.lg,
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  label: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
  },
  meta: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.99 }],
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
  tenant: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 13,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 17,
  },
  titleBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  value: {
    color: colors.textPrimary,
    flex: 1,
    fontFamily: typography.bodyStrong,
    fontSize: 14,
    textAlign: 'right',
  },
});
