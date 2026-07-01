import { useQuery } from '@tanstack/react-query';
import type { StackScreenProps } from '@react-navigation/stack';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Badge } from '../components/badge';
import { Button } from '../components/button';
import { EmptyState } from '../components/empty-state';
import { ErrorState } from '../components/error-state';
import { LoadingState } from '../components/loading-state';
import { PageHeader } from '../components/page-header';
import { ScrollableScreenContainer } from '../components/scrollable-screen-container';
import { useAuth } from '../context/auth-context';
import { useManagerProperty } from '../hooks/manager/use-manager-properties';
import { deleteProperty, fetchManagerPropertyUnits, updateProperty } from '../services/manager';
import { colors, radii, spacing, typography } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';
import { formatUGX, formatUGXFull, propertyTypeLabel, rentPeriodSuffix } from '../utils/format';

const fallbackImages = [
  require('../../assets/brand/property-1.jpg'),
  require('../../assets/brand/property-2.jpg'),
  require('../../assets/brand/property-3.jpg'),
];

export function ManagerPropertyDetailsScreen({
  navigation,
  route,
}: StackScreenProps<RootStackParamList, 'ManagerPropertyDetails'>) {
  const { user } = useAuth();
  const propertyQuery = useManagerProperty(user?.id, route.params.propertyId);
  const unitsQuery = useQuery({
    enabled: Boolean(user?.id),
    queryFn: () => fetchManagerPropertyUnits(route.params.propertyId),
    queryKey: ['manager-property-units', route.params.propertyId],
  });
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const property = propertyQuery.property;
  const units = unitsQuery.data ?? [];
  const images = property?.images?.length ? property.images : fallbackImages;
  const locationLabel = [property?.address, property?.area, property?.city, property?.district]
    .filter(Boolean)
    .join(', ');

  if (!user) {
    return (
      <ScrollableScreenContainer>
        <EmptyState
          description="Sign in as a house manager to view this listing."
          title="Property unavailable"
        />
      </ScrollableScreenContainer>
    );
  }

  if (propertyQuery.isLoading) {
    return <LoadingState message="Loading property" />;
  }

  if (propertyQuery.isError) {
    return (
      <ScrollableScreenContainer>
        <ErrorState
          description={
            propertyQuery.error instanceof Error ? propertyQuery.error.message : 'Please try again.'
          }
          onRetry={() => {
            void propertyQuery.refetch();
          }}
          title="Could not load property"
        />
      </ScrollableScreenContainer>
    );
  }

  if (!property) {
    return (
      <ScrollableScreenContainer>
        <EmptyState
          description="This listing could not be found for your account."
          title="Property not found"
        />
      </ScrollableScreenContainer>
    );
  }

  const handleGalleryScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement } = event.nativeEvent;
    if (!layoutMeasurement.width) {
      return;
    }

    const nextIndex = Math.round(contentOffset.x / layoutMeasurement.width);
    setActiveImageIndex(nextIndex);
  };

  return (
    <ScrollableScreenContainer contentContainerStyle={styles.content}>
      <View style={styles.galleryWrap}>
        <ScrollView
          horizontal
          onMomentumScrollEnd={handleGalleryScroll}
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.gallery}
        >
          {images.map((image, index) =>
            typeof image === 'string' ? (
              <Image
                key={`${image}-${index}`}
                source={{ uri: image }}
                style={styles.galleryImage}
              />
            ) : (
              <Image key={`fallback-${index}`} source={image} style={styles.galleryImage} />
            ),
          )}
        </ScrollView>
        <View style={styles.galleryOverlay}>
          <Badge tone="accent">{propertyTypeLabel(property.property_type)}</Badge>
          <Badge tone={property.status === 'available' ? 'primary' : 'default'}>
            {property.status === 'available' ? 'Available now' : property.status}
          </Badge>
        </View>
        <View style={styles.galleryDots}>
          {images.map((_, index) => (
            <View
              key={`dot-${index}`}
              style={[
                styles.galleryDot,
                index === activeImageIndex ? styles.galleryDotActive : null,
              ]}
            />
          ))}
        </View>
      </View>

      <PageHeader subtitle={locationLabel || property.district} title={property.title} />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Listing Actions</Text>
        <View style={styles.actionRow}>
          <Button
            onPress={() =>
              navigation.navigate('ManagerEditProperty', {
                propertyId: property.id,
              })
            }
            variant="outline"
          >
            Edit Listing
          </Button>
          <Button
            onPress={async () => {
              const nextStatus = property.status === 'inactive' ? 'available' : 'inactive';

              try {
                await updateProperty(property.id, {
                  status: nextStatus,
                });
                await propertyQuery.refetch();
                Alert.alert(
                  nextStatus === 'inactive' ? 'Listing deactivated' : 'Listing activated',
                  `${property.title} is now marked ${nextStatus}.`,
                );
              } catch (error) {
                Alert.alert(
                  'Could not update listing',
                  error instanceof Error ? error.message : 'Please try again.',
                );
              }
            }}
            variant="secondary"
          >
            {property.status === 'inactive' ? 'Activate Listing' : 'Deactivate Listing'}
          </Button>
          <Button
            onPress={() =>
              Alert.alert('Delete property', `Delete ${property.title}?`, [
                { style: 'cancel', text: 'Cancel' },
                {
                  style: 'destructive',
                  text: 'Delete',
                  onPress: async () => {
                    await deleteProperty(property.id);
                    navigation.goBack();
                  },
                },
              ])
            }
            variant="destructive"
          >
            Delete Listing
          </Button>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.price}>
          {formatUGX(property.rent_amount)}
          <Text style={styles.pricePeriod}>{rentPeriodSuffix(property.rent_period)}</Text>
        </Text>
        <Text style={styles.metaLine}>Full rent: {formatUGXFull(property.rent_amount)}</Text>
        {property.description ? <Text style={styles.body}>{property.description}</Text> : null}
      </View>

      {property.amenities?.length ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Amenities</Text>
          <View style={styles.badgeWrap}>
            {property.amenities.map((amenity) => (
              <Badge key={amenity} tone="gold">
                {amenity}
              </Badge>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Property Details</Text>
        <View style={styles.detailGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Address</Text>
            <Text style={styles.detailValue}>{property.address || 'Not provided'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Area</Text>
            <Text style={styles.detailValue}>{property.area || 'Not provided'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>City</Text>
            <Text style={styles.detailValue}>{property.city || 'Not provided'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Status</Text>
            <Text style={styles.detailValue}>{property.status}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Rent period</Text>
            <Text style={styles.detailValue}>{property.rent_period}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>District</Text>
            <Text style={styles.detailValue}>{property.district}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Bedrooms</Text>
            <Text style={styles.detailValue}>{property.bedrooms}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Bathrooms</Text>
            <Text style={styles.detailValue}>{property.bathrooms}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Sitting Rooms</Text>
            <Text style={styles.detailValue}>{property.sitting_rooms}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Kitchens</Text>
            <Text style={styles.detailValue}>{property.kitchens}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Property ID</Text>
            <Text style={styles.detailValue}>{property.id}</Text>
          </View>
        </View>
      </View>

      {units.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Rental Units</Text>
          {units.map((unit) => (
            <View key={unit.id} style={styles.unitCard}>
              <View style={styles.unitHeader}>
                <Text style={styles.unitTitle}>Unit {unit.unit_number}</Text>
                <Text style={styles.unitPrice}>{formatUGX(unit.rent_amount)}</Text>
              </View>
              <Text style={styles.body}>
                {unit.bedrooms} bed • {unit.bathrooms} bath • {unit.sitting_rooms} sitting •{' '}
                {unit.kitchens} kitchen
              </Text>
              {unit.floor_level ? (
                <Text style={styles.metaLine}>Floor: {unit.floor_level}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Manager Contact</Text>
        <Text style={styles.body}>{property.manager_phone || 'No phone saved'}</Text>
        <Text style={styles.body}>{property.manager_email || 'No email saved'}</Text>
        <View style={styles.actionRow}>
          {property.manager_phone ? (
            <Button onPress={() => void Linking.openURL(`tel:${property.manager_phone}`)}>
              Call Contact
            </Button>
          ) : null}
          {property.manager_email ? (
            <Button
              onPress={() => void Linking.openURL(`mailto:${property.manager_email}`)}
              variant="outline"
            >
              Email Contact
            </Button>
          ) : null}
        </View>
      </View>
    </ScrollableScreenContainer>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badgeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  body: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  content: {
    gap: spacing.lg,
  },
  detailGrid: {
    gap: spacing.md,
  },
  detailItem: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: 4,
    paddingBottom: spacing.sm,
  },
  detailLabel: {
    color: colors.textMuted,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  detailValue: {
    color: colors.textPrimary,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 22,
  },
  gallery: {
    borderRadius: radii.modal,
    overflow: 'hidden',
  },
  galleryDot: {
    backgroundColor: colors.primaryForeground,
    borderRadius: radii.pill,
    height: 8,
    opacity: 0.55,
    width: 8,
  },
  galleryDotActive: {
    backgroundColor: colors.primaryForeground,
    opacity: 1,
    width: 22,
  },
  galleryDots: {
    alignItems: 'center',
    bottom: spacing.md,
    flexDirection: 'row',
    gap: 6,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  galleryImage: {
    height: 260,
    width: 360,
  },
  galleryOverlay: {
    flexDirection: 'row',
    gap: spacing.sm,
    left: spacing.md,
    position: 'absolute',
    top: spacing.md,
  },
  galleryWrap: {
    position: 'relative',
  },
  metaLine: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 20,
  },
  price: {
    color: colors.primary,
    fontFamily: typography.display,
    fontSize: 28,
  },
  pricePeriod: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 15,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 22,
  },
  unitCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.card,
    gap: spacing.xs,
    padding: spacing.md,
  },
  unitHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  unitPrice: {
    color: colors.primary,
    fontFamily: typography.display,
    fontSize: 20,
  },
  unitTitle: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 16,
  },
});
