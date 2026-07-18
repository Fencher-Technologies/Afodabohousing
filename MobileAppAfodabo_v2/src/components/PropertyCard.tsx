/**
 * PropertyCard — reusable card for property listings.
 */

import { MapPin, BedDouble, Bath } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Badge } from "./Badge";
import { formatUGXShort, formatPeriod, formatPropertyType } from "@/src/utils/format";
import type { Property } from "@/src/types";

interface PropertyCardProps {
  property: Property;
  onPress: () => void;
  occupiedUnits?: number;
  totalUnits?: number;
  showStatus?: boolean;
  featured?: boolean;
}

export function PropertyCard({ property, onPress, occupiedUnits, totalUnits, showStatus = false, featured = false }: PropertyCardProps) {
  const hasImage = property.images.length > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${property.title}, ${property.district}`}
    >
      <View style={styles.imageWrap}>
        {hasImage ? (
          <Image source={{ uri: property.images[0] }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <Text style={styles.placeholderText}>{property.title.charAt(0)}</Text>
          </View>
        )}
        <View style={styles.typeBadge}>
          <Badge label={formatPropertyType(property.type)} tone="primary" />
        </View>
        {featured && (
          <View style={styles.featuredBadge}>
            <Badge label="Featured" tone="accent" size="sm" />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>{property.title}</Text>
        <View style={styles.location}>
          <MapPin size={14} color={Colors.textMuted} />
          <Text style={styles.locationText} numberOfLines={1}>
            {[property.area, property.district].filter(Boolean).join(", ")}
          </Text>
        </View>

        <View style={styles.details}>
          {property.beds > 0 && (
            <View style={styles.detailItem}>
              <BedDouble size={15} color={Colors.textMuted} />
              <Text style={styles.detailText}>{property.beds} bed</Text>
            </View>
          )}
          {property.baths > 0 && (
            <View style={styles.detailItem}>
              <Bath size={15} color={Colors.textMuted} />
              <Text style={styles.detailText}>{property.baths} bath</Text>
            </View>
          )}
          {totalUnits !== undefined && totalUnits > 0 && (
            <Text style={styles.unitsText}>
              {occupiedUnits ?? 0}/{totalUnits} occupied
            </Text>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.price}>{formatUGXShort(property.rent_amount)}<Text style={styles.period}>{formatPeriod(property.rent_period)}</Text></Text>
          {showStatus && (
            <View style={styles.statusRow}>
              <Badge
                label={property.occupancy_status === "occupied" ? "Occupied" : "Available"}
                tone={property.occupancy_status === "occupied" ? "warning" : "success"}
                size="sm"
              />
              {property.status !== "active" && (
                <Badge label="Inactive" tone="muted" size="sm" />
              )}
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  pressed: { opacity: 0.9 },
  imageWrap: {
    position: "relative",
  },
  image: {
    width: "100%",
    height: 160,
    backgroundColor: Colors.surfaceAlt,
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primarySoft,
  },
  placeholderText: {
    fontSize: 48,
    fontWeight: FontWeight.bold,
    color: Colors.primaryMuted,
  },
  typeBadge: {
    position: "absolute",
    top: Spacing.sm,
    left: Spacing.sm,
  },
  featuredBadge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  title: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  location: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    flex: 1,
  },
  details: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
  },
  unitsText: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  price: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  period: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.regular,
    color: Colors.textMuted,
  },
});
