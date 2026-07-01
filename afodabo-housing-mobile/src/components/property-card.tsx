import React, { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { PropertyRow } from '../types/supabase';
import { colors, radii, shadows, spacing, typography } from '../theme/tokens';
import { formatUGX, propertyTypeLabel, rentPeriodSuffix } from '../utils/format';

const fallbackImages = [
  require('../../assets/brand/property-1.jpg'),
  require('../../assets/brand/property-2.jpg'),
  require('../../assets/brand/property-3.jpg'),
];

interface PropertyCardProps {
  index?: number;
  onPress: () => void;
  property: PropertyRow;
}

function PropertyCardComponent({ index = 0, onPress, property }: PropertyCardProps) {
  const imageUri = property.images?.[0];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
    >
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.image} />
      ) : (
        <Image source={fallbackImages[index % fallbackImages.length]} style={styles.image} />
      )}

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.typePill}>
            <Text style={styles.typeText}>{propertyTypeLabel(property.property_type)}</Text>
          </View>
          <View
            style={[
              styles.typePill,
              property.status === 'available' ? styles.availablePill : styles.defaultPill,
            ]}
          >
            <Text
              style={[
                styles.typeText,
                property.status === 'available' ? styles.availableText : styles.defaultText,
              ]}
            >
              {property.status === 'available' ? 'Available' : property.status}
            </Text>
          </View>
        </View>

        <Text numberOfLines={1} style={styles.title}>
          {property.title}
        </Text>
        <Text numberOfLines={1} style={styles.location}>
          {[property.area, property.district].filter(Boolean).join(', ')}
        </Text>
        <Text style={styles.meta}>
          {property.bedrooms} bed • {property.bathrooms} bath • {property.sitting_rooms} sitting
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>
            {formatUGX(property.rent_amount)}
            <Text style={styles.priceSuffix}> {rentPeriodSuffix(property.rent_period)}</Text>
          </Text>
          <Text style={styles.period}>{property.rent_period}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export const PropertyCard = memo(PropertyCardComponent);

const styles = StyleSheet.create({
  availablePill: {
    backgroundColor: colors.primarySoft,
  },
  availableText: {
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadows.card,
  },
  cardPressed: {
    opacity: 0.95,
  },
  content: {
    gap: 8,
    padding: spacing.md,
  },
  defaultPill: {
    backgroundColor: colors.surfaceMuted,
  },
  defaultText: {
    color: colors.textSecondary,
  },
  image: {
    height: 200,
    width: '100%',
  },
  location: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
  },
  meta: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
  },
  period: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  price: {
    color: colors.primary,
    fontFamily: typography.display,
    fontSize: 24,
  },
  priceRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  priceSuffix: {
    color: colors.textMuted,
    fontFamily: typography.bodyMedium,
    fontSize: 14,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 22,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typePill: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  typeText: {
    color: colors.accent,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
  },
});
