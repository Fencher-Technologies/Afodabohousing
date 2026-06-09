import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../theme';

interface ProfileHeaderProps {
  email?: string;
  fullName?: string | null;
  phone?: string | null;
  roleLabel: string;
}

function getInitials(name?: string | null, email?: string) {
  const source = name || email || 'User';
  const words = source.trim().split(/\s+/);

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

export function ProfileHeader({ email, fullName, phone, roleLabel }: ProfileHeaderProps) {
  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(fullName, email)}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.name}>{fullName || email || 'Afodabo user'}</Text>
        <Text style={styles.meta}>{email || 'No email on file'}</Text>
        <Text style={styles.meta}>{phone || 'No phone number added'}</Text>
        <View style={styles.rolePill}>
          <Text style={styles.roleText}>{roleLabel}</Text>
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
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  avatarText: {
    color: colors.primaryForeground,
    fontFamily: typography.bodyStrong,
    fontSize: 20,
  },
  card: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  meta: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
  },
  name: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 26,
  },
  rolePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.pill,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  roleText: {
    color: colors.primary,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
  },
});
