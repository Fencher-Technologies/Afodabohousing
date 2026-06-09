import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../theme';

interface ProfileMenuItemProps {
  destructive?: boolean;
  onPress: () => void;
  subtitle?: string;
  title: string;
}

export function ProfileMenuItem({
  destructive = false,
  onPress,
  subtitle,
  title,
}: ProfileMenuItemProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.copy}>
        <Text style={[styles.title, destructive && styles.destructive]}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Text style={[styles.chevron, destructive && styles.destructive]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chevron: {
    color: colors.textMuted,
    fontFamily: typography.bodyStrong,
    fontSize: 24,
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  destructive: {
    color: colors.error,
  },
  pressed: {
    opacity: 0.72,
  },
  row: {
    ...shadows.card,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.input,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    minHeight: 62,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
    lineHeight: 18,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 15,
  },
});
