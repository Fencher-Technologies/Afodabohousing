import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ManagerMenuButton } from './ManagerMenuButton';
import { useManagerShell } from '../../context/ManagerShellContext';
import { colors, radii, shadows, spacing, typography } from '../../theme';

interface ManagerHomeHeaderProps {
  displayName: string;
  onOpenMenu?: () => void;
}

export function ManagerHomeHeader({ displayName, onOpenMenu }: ManagerHomeHeaderProps) {
  const insets = useSafeAreaInsets();
  const { openMenu } = useManagerShell();
  const handleOpenMenu = onOpenMenu ?? openMenu;
  const firstName = displayName.split(' ')[0] || 'Manager';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <View style={[styles.shell, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.appBar}>
        <ManagerMenuButton onPress={handleOpenMenu} variant="brand" />
        <View style={styles.brandBlock}>
          <Text style={styles.brand}>Afodabo Housing</Text>
          <Text style={styles.role}>Manager workspace</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons color={colors.primary} name="notifications-outline" size={20} />
        </Pressable>
      </View>

      <View style={styles.greetingRow}>
        <View style={styles.greetingCopy}>
          <Text style={styles.eyebrow}>Today</Text>
          <Text style={styles.title}>Hi {firstName}</Text>
          <Text style={styles.subtitle}>
            Quick checks for properties, tenants, payments, and chats.
          </Text>
          <View style={styles.accentRow}>
            <View style={styles.greenLine} />
            <View style={styles.goldDot} />
            <View style={styles.terracottaDot} />
          </View>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  appBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  avatarText: {
    color: colors.accentForeground,
    fontFamily: typography.bodyStrong,
    fontSize: 20,
  },
  brand: {
    color: colors.primary,
    fontFamily: typography.bodyStrong,
    fontSize: 14,
  },
  brandBlock: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    color: colors.accent,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  greetingCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  greetingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
    paddingTop: spacing.lg,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  pressed: {
    opacity: 0.78,
  },
  role: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
    opacity: 0.78,
  },
  shell: {
    ...shadows.floating,
    backgroundColor: colors.surfaceMuted,
    borderBottomColor: colors.border,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    borderBottomWidth: 1,
    gap: spacing.md,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 21,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.displayStrong,
    fontSize: 32,
  },
  accentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  goldDot: {
    backgroundColor: colors.gold,
    borderRadius: radii.pill,
    height: 8,
    width: 8,
  },
  greenLine: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    height: 4,
    width: 42,
  },
  terracottaDot: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    height: 8,
    width: 8,
  },
});
