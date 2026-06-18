import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../theme';

interface BrandMarkProps {
  compact?: boolean;
}

export function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <View style={styles.row}>
      <View style={[styles.mark, compact && styles.compactMark]}>
        <View style={styles.goldDot} />
        <Ionicons color={colors.primaryForeground} name="home" size={compact ? 18 : 24} />
      </View>
      {!compact ? (
        <View style={styles.copy}>
          <Text style={styles.name}>Afodabo Housing</Text>
          <Text style={styles.tagline}>Uganda homes, simply managed</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  compactMark: {
    height: 42,
    width: 42,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  goldDot: {
    backgroundColor: colors.gold,
    borderRadius: radii.pill,
    height: 10,
    position: 'absolute',
    right: 8,
    top: 8,
    width: 10,
  },
  mark: {
    ...shadows.card,
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  name: {
    color: colors.textPrimary,
    fontFamily: typography.displayStrong,
    fontSize: 20,
    lineHeight: 24,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  tagline: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
  },
});
