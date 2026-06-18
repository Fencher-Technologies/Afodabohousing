import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import type { TenantTenancy } from '../../services/tenant.service';
import { formatStatusLabel, formatUGX } from '../../utils/format';

export function TenantTenancyCard({ tenancy }: { tenancy: TenantTenancy | null }) {
  if (!tenancy) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Current Tenancy</Text>
        <Text style={styles.body}>
          You are not linked to an active tenancy yet. Your house manager can connect your account
          from the web dashboard.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{tenancy.property_title || 'Current Tenancy'}</Text>
      <View style={styles.detailRow}>
        <Text style={styles.label}>Manager</Text>
        <Text style={styles.value}>{tenancy.manager_name || 'House Manager'}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.label}>Phone</Text>
        <Text style={styles.value}>{tenancy.manager_phone || 'Not added'}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.label}>Rent</Text>
        <Text style={styles.value}>{formatUGX(tenancy.rent_amount)}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.label}>Period</Text>
        <Text style={styles.value}>{formatStatusLabel(tenancy.rent_period)}</Text>
      </View>
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
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  label: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 24,
  },
  value: {
    color: colors.textPrimary,
    flex: 1,
    fontFamily: typography.bodyStrong,
    fontSize: 14,
    textAlign: 'right',
  },
});
