import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import type { ManagerTenancy } from '../../services/tenancies.service';
import { toDisplayDate } from '../../utils/dates';
import { formatStatusLabel, formatUGX } from '../../utils/format';

export function ManagerTenancyDetailCard({ tenancy }: { tenancy: ManagerTenancy }) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>{formatStatusLabel(tenancy.status)}</Text>
      <Text style={styles.title}>{tenancy.property_title || 'Property tenancy'}</Text>
      <View style={styles.metaGrid}>
        <MetaItem label="Tenant" value={tenancy.tenant_name || 'Tenant'} />
        <MetaItem label="Phone" value={tenancy.tenant_phone || 'Not added'} />
        <MetaItem label="Rent" value={formatUGX(tenancy.rent_amount)} />
        <MetaItem label="Billing" value={formatStatusLabel(tenancy.rent_period)} />
      </View>
      <View style={styles.timeline}>
        <Text style={styles.sectionTitle}>Tenancy period</Text>
        <Text style={styles.body}>
          {toDisplayDate(tenancy.rent_start_date)} to {toDisplayDate(tenancy.rent_end_date)}
        </Text>
      </View>
      {tenancy.agreement_url ? (
        <Text style={styles.body}>Agreement file is linked to this tenancy.</Text>
      ) : (
        <Text style={styles.muted}>No agreement file linked.</Text>
      )}
    </View>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaValue}>{value}</Text>
      <Text style={styles.metaLabel}>{label}</Text>
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
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaItem: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.input,
    flexBasis: '47%',
    gap: spacing.xs,
    padding: spacing.md,
  },
  metaLabel: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
  },
  metaValue: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 15,
  },
  muted: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 15,
  },
  timeline: {
    gap: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 30,
  },
});
