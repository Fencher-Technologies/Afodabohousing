import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/button';
import { EmptyState } from '../components/empty-state';
import { InputField } from '../components/input-field';
import { PropertyCard } from '../components/property-card';
import { Screen } from '../components/screen';
import { SelectField } from '../components/select-field';
import { fetchProperties } from '../services/properties';
import { colors, radii, spacing, typography } from '../theme/tokens';
import {
  AMENITIES,
  DISTRICTS,
  PROPERTY_TYPE_OPTIONS,
  RENT_PERIOD_OPTIONS,
} from '../utils/constants';
import type { Database } from '../types/supabase';
import type { RootStackParamList } from '../navigation/types';
import type { ListRenderItem } from 'react-native';
import type { PropertyRow } from '../types/supabase';

const districtOptions = [
  { label: 'All Districts', value: '' as const },
  ...DISTRICTS.map((district) => ({ label: district, value: district })),
];

const propertyTypeOptions = [
  { label: 'All Types', value: 'all' as const },
  ...PROPERTY_TYPE_OPTIONS.map((option) => ({ label: option.label, value: option.value })),
];

const rentPeriodOptions = [
  { label: 'Any Period', value: 'all' as const },
  ...RENT_PERIOD_OPTIONS.map((option) => ({ label: option.label, value: option.value })),
];

export function ExploreScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [districtFilter, setDistrictFilter] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [propertyType, setPropertyType] = useState<
    Database['public']['Enums']['property_type'] | 'all'
  >('all');
  const [rentPeriod, setRentPeriod] = useState<Database['public']['Enums']['rent_period'] | 'all'>(
    'all',
  );

  const filters = useMemo(
    () => ({
      amenities: selectedAmenities,
      bathrooms,
      bedrooms,
      district: districtFilter,
      maxPrice,
      minPrice,
      propertyType,
      rentPeriod,
    }),
    [
      bathrooms,
      bedrooms,
      districtFilter,
      maxPrice,
      minPrice,
      propertyType,
      rentPeriod,
      selectedAmenities,
    ],
  );

  const propertiesQuery = useQuery({
    queryFn: () => fetchProperties(filters),
    queryKey: ['explore-properties', filters],
  });

  const properties = propertiesQuery.data?.properties ?? [];
  const resetFilters = useCallback(() => {
    setDistrictFilter('');
    setBedrooms('');
    setBathrooms('');
    setMinPrice('');
    setMaxPrice('');
    setSelectedAmenities([]);
    setPropertyType('all');
    setRentPeriod('all');
  }, []);
  const renderItem = useCallback<ListRenderItem<PropertyRow>>(
    ({ index, item }) => (
      <PropertyCard
        index={index}
        onPress={() => navigation.navigate('PropertyDetails', { propertyId: item.id })}
        property={item}
      />
    ),
    [navigation],
  );
  const keyExtractor = useCallback((item: PropertyRow) => item.id, []);
  const emptyComponent = useMemo(
    () =>
      propertiesQuery.isLoading ? (
        <View style={styles.loadingCard}>
          <Text style={styles.sectionSubtitle}>Loading properties...</Text>
        </View>
      ) : (
        <EmptyState
          description="Try changing your district, property type, or budget filters."
          title="No properties match your search"
        />
      ),
    [propertiesQuery.isLoading],
  );
  const header = useMemo(
    () => (
      <View style={styles.headerWrapper}>
        <ImageBackground
          imageStyle={styles.heroImage}
          source={require('../../assets/brand/hero-bg.jpg')}
          style={styles.hero}
        >
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.eyebrow}>Uganda's Number One District Relocation Housing App</Text>
            <Text style={styles.heroTitle}>Find Your Perfect Home in Uganda</Text>
          </View>
        </ImageBackground>

        <View style={styles.filterCard}>
          <Text style={styles.sectionTitle}>Filters</Text>
          <SelectField
            label="District"
            onChange={setDistrictFilter}
            options={districtOptions}
            placeholder="Select a district"
            value={districtFilter}
          />
          <SelectField
            label="Property Type"
            onChange={setPropertyType}
            options={propertyTypeOptions}
            placeholder="Select property type"
            value={propertyType}
          />
          <SelectField
            label="Rent Period"
            onChange={setRentPeriod}
            options={rentPeriodOptions}
            placeholder="Select rent period"
            value={rentPeriod}
          />

          <View style={styles.priceRow}>
            <View style={styles.priceField}>
              <InputField
                keyboardType="numeric"
                label="Min Price"
                onChangeText={setMinPrice}
                placeholder="0"
                value={minPrice}
              />
            </View>
            <View style={styles.priceField}>
              <InputField
                keyboardType="numeric"
                label="Max Price"
                onChangeText={setMaxPrice}
                placeholder="800000"
                value={maxPrice}
              />
            </View>
          </View>

          <View style={styles.priceRow}>
            <View style={styles.priceField}>
              <InputField
                keyboardType="numeric"
                label="Min Bedrooms"
                onChangeText={setBedrooms}
                placeholder="1"
                value={bedrooms}
              />
            </View>
            <View style={styles.priceField}>
              <InputField
                keyboardType="numeric"
                label="Min Bathrooms"
                onChangeText={setBathrooms}
                placeholder="1"
                value={bathrooms}
              />
            </View>
          </View>

          <View style={styles.amenitiesSection}>
            <Text style={styles.sectionSubtitle}>Amenities</Text>
            <View style={styles.amenitiesWrap}>
              {AMENITIES.map((amenity) => {
                const active = selectedAmenities.includes(amenity);
                return (
                  <Button
                    key={amenity}
                    onPress={() =>
                      setSelectedAmenities((current) =>
                        current.includes(amenity)
                          ? current.filter((item) => item !== amenity)
                          : [...current, amenity],
                      )
                    }
                    variant={active ? 'primary' : 'secondary'}
                  >
                    {amenity}
                  </Button>
                );
              })}
            </View>
          </View>

          <Button onPress={resetFilters} variant="outline">
            Reset Filters
          </Button>
        </View>

        <View style={styles.listHeading}>
          <Text style={styles.sectionTitle}>
            {districtFilter ? `Homes in ${districtFilter}` : 'Available Properties'}
          </Text>
          <Text style={styles.sectionSubtitle}>
            {propertiesQuery.data?.count || 0} results ready to explore
          </Text>
        </View>
      </View>
    ),
    [
      bathrooms,
      bedrooms,
      districtFilter,
      maxPrice,
      minPrice,
      propertiesQuery.data?.count,
      propertyType,
      rentPeriod,
      resetFilters,
      selectedAmenities,
    ],
  );

  return (
    <Screen padded={false} scrollable={false}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={properties}
        initialNumToRender={6}
        keyExtractor={keyExtractor}
        ListEmptyComponent={emptyComponent}
        ListHeaderComponent={header}
        maxToRenderPerBatch={6}
        removeClippedSubviews
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        updateCellsBatchingPeriod={50}
        windowSize={5}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  amenitiesSection: {
    gap: spacing.xs,
  },
  amenitiesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.modal,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  headerWrapper: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  hero: {
    height: 220,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: radii.modal,
  },
  heroContent: {
    gap: spacing.sm,
    zIndex: 1,
  },
  heroImage: {
    borderRadius: radii.modal,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.heroOverlay,
    borderRadius: radii.modal,
  },
  heroTitle: {
    color: colors.primaryForeground,
    fontFamily: typography.display,
    fontSize: 32,
  },
  eyebrow: {
    color: colors.gold,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  listHeading: {
    gap: 4,
  },
  loadingCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    padding: spacing.xl,
  },
  priceField: {
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 24,
  },
});
