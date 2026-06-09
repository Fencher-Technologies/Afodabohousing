import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import { formatRoleLabel } from '../../utils/format';
import type { AppRole } from '../../types/database';

interface ManagerProfileCardProps {
  email?: string;
  fullName?: string | null;
  phone?: string | null;
  role: AppRole | null;
}

function getInitial(name?: string | null, email?: string) {
  return (name || email || 'M').charAt(0).toUpperCase();
}

export function ManagerProfileCard({ email, fullName, phone, role }: ManagerProfileCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.heroRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitial(fullName, email)}</Text>
        </View>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.name}>
            {fullName || 'House Manager'}
          </Text>
          <Text numberOfLines={1} style={styles.email}>
            {email || 'No email on file'}
          </Text>
        </View>
      </View>
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Role</Text>
          <Text style={styles.metaValue}>{formatRoleLabel(role)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Phone</Text>
          <Text style={styles.metaValue}>{phone || 'Not added'}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderColor: colors.gold,
    borderWidth: 2,
    borderRadius: radii.pill,
    height: 62,
    justifyContent: 'center',
    width: 62,
  },
  avatarText: {
    color: colors.primaryForeground,
    fontFamily: typography.bodyStrong,
    fontSize: 24,
  },
  card: {
    ...shadows.floating,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.card,
    gap: spacing.lg,
    padding: spacing.lg,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  email: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 13,
    opacity: 0.8,
  },
  heroRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  metaItem: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.input,
    flex: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  metaLabel: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metaValue: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 13,
  },
  name: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 28,
  },
});
