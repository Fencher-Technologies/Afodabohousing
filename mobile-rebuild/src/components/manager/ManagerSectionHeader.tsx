import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';

interface ManagerSectionHeaderProps {
  icon: keyof typeof Ionicons.glyphMap;
  subtitle?: string;
  title: string;
}

export function ManagerSectionHeader({ icon, subtitle, title }: ManagerSectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.iconBadge}>
        <Ionicons color={colors.primary} name={icon} size={18} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  copy: {
    flex: 1,
    gap: 2,
  },
  iconBadge: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
    lineHeight: 16,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 16,
    lineHeight: 21,
  },
});
