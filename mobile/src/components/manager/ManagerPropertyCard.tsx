import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import type { PropertyRow } from '../../types/database';
import { formatStatusLabel, formatUGX } from '../../utils/format';

interface ManagerPropertyCardProps {
  onPress: () => void;
  property: PropertyRow;
}

export function ManagerPropertyCard({ onPress, property }: ManagerPropertyCardProps) {
  const imageUri = property.images?.[0];

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderText}>No image</Text>
        </View>
      )}
      <View style={styles.copy}>
        <View style={styles.headerRow}>
          <Text numberOfLines={1} style={styles.title}>
            {property.title}
          </Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>{formatStatusLabel(property.status)}</Text>
          </View>
        </View>
        <Text style={styles.location} numberOfLines={1}>
          {[property.district, property.city, property.area].filter(Boolean).join(', ')}
        </Text>
        <Text style={styles.price}>
          {formatUGX(property.rent_amount)} / {formatStatusLabel(property.rent_period)}
        </Text>
        <Text style={styles.meta}>
          {property.bedrooms} bed • {property.bathrooms} bath •{' '}
          {formatStatusLabel(property.property_type)}
        </Text>
      </View>
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
    overflow: 'hidden',
  },
  copy: {
    gap: spacing.xs,
    padding: spacing.md,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  image: {
    backgroundColor: colors.surfaceMuted,
    height: 150,
    width: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    height: 150,
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
  },
  location: {
    color: colors.textSecondary,
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
  },
  price: {
    color: colors.primary,
    fontFamily: typography.bodyStrong,
    fontSize: 15,
  },
  statusPill: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusText: {
    color: colors.primary,
    fontFamily: typography.bodyStrong,
    fontSize: 11,
  },
  title: {
    color: colors.textPrimary,
    flex: 1,
    fontFamily: typography.bodyStrong,
    fontSize: 17,
  },
});
