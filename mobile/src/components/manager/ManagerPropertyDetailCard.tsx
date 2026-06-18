import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import type { PropertyRow } from '../../types/database';
import { formatStatusLabel, formatUGX } from '../../utils/format';

export function ManagerPropertyDetailCard({ property }: { property: PropertyRow }) {
  const imageUri = property.images?.[0];

  return (
    <View style={styles.card}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderText}>No image</Text>
        </View>
      )}
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>{formatStatusLabel(property.status)}</Text>
        <Text style={styles.title}>{property.title}</Text>
        <Text style={styles.location}>
          {[property.address, property.area, property.city, property.district]
            .filter(Boolean)
            .join(', ')}
        </Text>
        <Text style={styles.price}>
          {formatUGX(property.rent_amount)} / {formatStatusLabel(property.rent_period)}
        </Text>
        <View style={styles.metaGrid}>
          <MetaItem label="Bedrooms" value={String(property.bedrooms)} />
          <MetaItem label="Bathrooms" value={String(property.bathrooms)} />
          <MetaItem label="Kitchens" value={String(property.kitchens)} />
          <MetaItem label="Sitting rooms" value={String(property.sitting_rooms)} />
        </View>
        {property.description ? (
          <Text style={styles.description}>{property.description}</Text>
        ) : null}
      </View>
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
  card: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  copy: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  description: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 22,
  },
  eyebrow: {
    color: colors.primary,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  image: {
    backgroundColor: colors.surfaceMuted,
    height: 230,
    width: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    height: 230,
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
    fontSize: 14,
    lineHeight: 22,
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
    gap: 3,
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
    fontSize: 18,
  },
  price: {
    color: colors.primary,
    fontFamily: typography.display,
    fontSize: 28,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 32,
  },
});
