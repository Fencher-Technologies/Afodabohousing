import { useMemo, useState, useCallback } from "react";
import { StyleSheet, Text, View, Pressable, FlatList, ScrollView } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Compass, MapPin, SlidersHorizontal, RotateCcw } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { PropertyCard } from "@/src/components/PropertyCard";
import { EmptyState } from "@/src/components/EmptyState";
import { LoadingState } from "@/src/components/LoadingState";
import { ErrorState } from "@/src/components/ErrorState";
import { SearchInput } from "@/src/components/SearchInput";
import { SelectField } from "@/src/components/SelectField";
import { InputField } from "@/src/components/InputField";
import { Button } from "@/src/components/Button";
import { usePublicProperties } from "@/src/hooks/useProperties";
import { useRefresh } from "@/src/hooks/useRefresh";
import type { Amenity, Property, PropertyType } from "@/src/types";

const POPULAR_DISTRICTS = ["Kampala", "Wakiso", "Mukono", "Entebbe", "Jinja", "Mbarara"];

const DISTRICT_OPTIONS = [
  { label: "All Districts", value: "" },
  ...POPULAR_DISTRICTS.map((d) => ({ label: d, value: d })),
];

const PROPERTY_TYPE_OPTIONS: { label: string; value: PropertyType | "" }[] = [
  { label: "All Types", value: "" },
  { label: "Apartment", value: "apartment" },
  { label: "House", value: "house" },
  { label: "Studio", value: "studio" },
  { label: "Single Room", value: "single_room" },
  { label: "Shop / Office", value: "shop" },
];

const BEDROOM_OPTIONS = [
  { label: "Any", value: "" },
  { label: "1+", value: "1" },
  { label: "2+", value: "2" },
  { label: "3+", value: "3" },
  { label: "4+", value: "4" },
];

const BATHROOM_OPTIONS = [
  { label: "Any", value: "" },
  { label: "1+", value: "1" },
  { label: "2+", value: "2" },
  { label: "3+", value: "3" },
];

const AMENITIES: Amenity[] = [
  "water",
  "electricity",
  "parking",
  "security",
  "wifi",
  "furnished",
  "garden",
  "balcony",
  "solar",
  "borehole",
];

export default function ExploreScreen() {
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType | "">("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<Amenity[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Backend-supported filters go to the API; the rest are applied client-side.
  const apiParams = useMemo(
    () => ({
      state: district || undefined,
      property_type: propertyType || undefined,
      min_price: minPrice ? Number(minPrice) : undefined,
      max_price: maxPrice ? Number(maxPrice) : undefined,
    }),
    [district, propertyType, minPrice, maxPrice],
  );

  const { data, isLoading, error, refetch } = usePublicProperties(apiParams);
  const { refreshing, onRefresh } = useRefresh({ refetches: [refetch] });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const properties = data?.items ?? [];

  const filtered = useMemo(() => {
    let result = properties;
    const q = query.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.district.toLowerCase().includes(q) ||
          p.area.toLowerCase().includes(q),
      );
    }
    const minBeds = bedrooms ? Number(bedrooms) : 0;
    const minBaths = bathrooms ? Number(bathrooms) : 0;
    if (minBeds) result = result.filter((p) => p.beds >= minBeds);
    if (minBaths) result = result.filter((p) => p.baths >= minBaths);
    if (selectedAmenities.length) {
      result = result.filter((p) =>
        selectedAmenities.every((a) => (p.amenities ?? []).includes(a)),
      );
    }
    return result;
  }, [properties, query, bedrooms, bathrooms, selectedAmenities]);

  const hasActiveFilters =
    !!district || !!propertyType || !!minPrice || !!maxPrice || !!bedrooms || !!bathrooms || selectedAmenities.length > 0;

  const resetFilters = () => {
    setDistrict("");
    setPropertyType("");
    setMinPrice("");
    setMaxPrice("");
    setBedrooms("");
    setBathrooms("");
    setSelectedAmenities([]);
  };

  const toggleAmenity = (amenity: Amenity) => {
    setSelectedAmenities((current) =>
      current.includes(amenity)
        ? current.filter((a) => a !== amenity)
        : [...current, amenity],
    );
  };

  return (
    <Screen scroll onRefresh={onRefresh} refreshing={refreshing}>
      {/* Hero header */}
      <View style={styles.hero}>
        <View style={styles.heroBadge}>
          <Compass size={14} color={Colors.accent} />
          <Text style={styles.heroBadgeText}>Uganda Rental Marketplace</Text>
        </View>
        <Text style={styles.heroTitle}>Find Your Perfect Home</Text>
        <Text style={styles.heroSubtitle}>
          Browse verified rental properties across Uganda
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <SearchInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, area, district…"
        />
      </View>

      {/* Popular districts */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Popular Districts</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {POPULAR_DISTRICTS.map((d) => {
            const active = district === d;
            return (
              <Pressable
                key={d}
                onPress={() => setDistrict(active ? "" : d)}
                style={[styles.chip, active && styles.chipActive]}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${d}`}
              >
                <MapPin size={13} color={active ? Colors.textOnPrimary : Colors.textMuted} />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{d}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Filter toggle */}
      <Pressable
        style={[styles.filterToggle, showFilters && styles.filterToggleActive]}
        onPress={() => setShowFilters((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel="Toggle filters"
      >
        <View style={styles.filterToggleLeft}>
          <SlidersHorizontal size={18} color={showFilters ? Colors.textOnPrimary : Colors.primary} />
          <Text style={[styles.filterToggleText, showFilters && styles.filterToggleTextActive]}>
            Filters{hasActiveFilters ? " (active)" : ""}
          </Text>
        </View>
        {hasActiveFilters && (
          <Pressable
            onPress={resetFilters}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Reset filters"
          >
            <RotateCcw size={16} color={Colors.textMuted} />
          </Pressable>
        )}
      </Pressable>

      {showFilters && (
        <View style={styles.filterCard}>
          <View style={styles.filterRow}>
            <View style={styles.filterCol}>
              <SelectField
                label="District"
                value={district}
                options={DISTRICT_OPTIONS}
                onSelect={setDistrict}
                placeholder="All districts"
              />
            </View>
            <View style={styles.filterCol}>
              <SelectField
                label="Property Type"
                value={propertyType}
                options={PROPERTY_TYPE_OPTIONS}
                onSelect={(v) => setPropertyType(v as PropertyType | "")}
                placeholder="All types"
              />
            </View>
          </View>

          <View style={styles.filterRow}>
            <View style={styles.filterCol}>
              <InputField
                label="Min Price (UGX)"
                value={minPrice}
                onChangeText={setMinPrice}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.filterCol}>
              <InputField
                label="Max Price (UGX)"
                value={maxPrice}
                onChangeText={setMaxPrice}
                placeholder="Any"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.filterRow}>
            <View style={styles.filterCol}>
              <SelectField
                label="Min Bedrooms"
                value={bedrooms}
                options={BEDROOM_OPTIONS}
                onSelect={setBedrooms}
                placeholder="Any"
              />
            </View>
            <View style={styles.filterCol}>
              <SelectField
                label="Min Bathrooms"
                value={bathrooms}
                options={BATHROOM_OPTIONS}
                onSelect={setBathrooms}
                placeholder="Any"
              />
            </View>
          </View>

          <Text style={styles.filterSectionLabel}>Amenities</Text>
          <View style={styles.amenitiesWrap}>
            {AMENITIES.map((amenity) => {
              const active = selectedAmenities.includes(amenity);
              return (
                <Pressable
                  key={amenity}
                  onPress={() => toggleAmenity(amenity)}
                  style={[styles.amenityChip, active && styles.amenityChipActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`Toggle ${amenity}`}
                >
                  <Text style={[styles.amenityText, active && styles.amenityTextActive]}>
                    {amenity}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {hasActiveFilters && (
            <Button label="Reset Filters" variant="ghost" onPress={resetFilters} />
          )}
        </View>
      )}

      {/* Results */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsTitle}>
          {isLoading ? "Finding homes…" : `${filtered.length} ${filtered.length === 1 ? "home" : "homes"}`}
        </Text>
      </View>

      <View style={styles.list}>
        {isLoading ? (
          <LoadingState message="Finding properties…" />
        ) : error ? (
          <ErrorState title="Could not load properties" description="Check your connection and try again." onRetry={() => refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Compass size={32} color={Colors.primary} />}
            title="No properties found"
            description="Try adjusting your search or filters to find more homes."
          />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <PropertyCard
                property={item as Property}
                onPress={() => router.push(`/property-detail?id=${item.id}&role=guest`)}
                featured={(item as { isBoosted?: boolean }).isBoosted ?? false}
              />
            )}
            scrollEnabled={false}
            contentContainerStyle={{ gap: Spacing.md }}
          />
        )}
      </View>

      <View style={{ height: 100 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: Colors.accentSoft,
    borderRadius: Radii.pill,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  heroBadgeText: {
    fontSize: FontSize.micro,
    fontWeight: FontWeight.semibold,
    color: Colors.accent,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  heroSubtitle: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  searchWrap: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  section: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionLabel: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  chips: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.textOnPrimary,
  },
  filterToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.card,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterToggleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  filterToggleText: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  filterToggleTextActive: {
    color: Colors.textOnPrimary,
  },
  filterCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.card,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  filterCol: {
    flex: 1,
  },
  filterSectionLabel: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  amenitiesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  amenityChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  amenityChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  amenityText: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    textTransform: "capitalize",
  },
  amenityTextActive: {
    color: Colors.textOnPrimary,
  },
  resultsHeader: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  resultsTitle: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  list: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
});
