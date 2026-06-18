import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ManagerMenuButton } from './ManagerMenuButton';
import { useManagerShell } from '../../context/ManagerShellContext';
import { colors, radii, shadows, spacing, typography } from '../../theme';

interface ManagerScreenHeaderProps {
  icon?: keyof typeof Ionicons.glyphMap;
  onOpenMenu?: () => void;
  subtitle?: string;
  title: string;
}

export function ManagerScreenHeader({
  icon = 'briefcase-outline',
  onOpenMenu,
  subtitle,
  title,
}: ManagerScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const { openMenu } = useManagerShell();
  const handleOpenMenu = onOpenMenu ?? openMenu;

  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.appBar}>
        <ManagerMenuButton onPress={handleOpenMenu} />
        <View style={styles.screenIcon}>
          <Ionicons color={colors.primary} name={icon} size={20} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>Manager</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons color={colors.primary} name="notifications-outline" size={19} />
        </Pressable>
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.accentRow}>
        <View style={styles.greenLine} />
        <View style={styles.goldDot} />
        <View style={styles.terracottaDot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  appBar: {
    ...shadows.card,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  eyebrow: {
    color: colors.accent,
    fontFamily: typography.bodyStrong,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  header: {
    backgroundColor: colors.background,
    gap: spacing.xs,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
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
  screenIcon: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 21,
    paddingHorizontal: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.displayStrong,
    fontSize: 26,
    lineHeight: 31,
  },
  accentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  goldDot: {
    backgroundColor: colors.gold,
    borderRadius: radii.pill,
    height: 7,
    width: 7,
  },
  greenLine: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    height: 4,
    width: 38,
  },
  terracottaDot: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    height: 7,
    width: 7,
  },
});
