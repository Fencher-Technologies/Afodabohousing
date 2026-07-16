import { useQuery } from '@tanstack/react-query';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import React, { useMemo, useState } from 'react';
import { Alert, Image, Linking, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../components/badge';
import { Button } from '../components/button';
import { EmptyState } from '../components/empty-state';
import { InputField } from '../components/input-field';
import { Screen } from '../components/screen';
import { useAuth } from '../context/auth-context';
import { fetchPropertyDetails } from '../services/properties';
import { isPropertyBoosted } from '../services/property-boosts';
import { sendTenantMessage } from '../services/tenant';
import propertyImage1 from '../../assets/brand/property-1.jpg';
import propertyImage2 from '../../assets/brand/property-2.jpg';
import propertyImage3 from '../../assets/brand/property-3.jpg';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { formatUGX, formatUGXFull, propertyTypeLabel } from '../utils/format';
import type { RootStackParamList } from '../navigation/types';

type PropertyDetailsRoute = RouteProp<RootStackParamList, 'PropertyDetails'>;

const fallbackImages = [propertyImage1, propertyImage2, propertyImage3];

export function PropertyDetailsScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<PropertyDetailsRoute>();
  const { role, user } = useAuth();
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  const detailsQuery = useQuery({
    queryFn: () => fetchPropertyDetails(route.params.propertyId),
    queryKey: ['property-details', route.params.propertyId],
  });

  const property = detailsQuery.data?.property ?? null;
  const units = detailsQuery.data?.units ?? [];

  const images = useMemo(() => (property?.images?.length ? property.images : []), [property]);

  if (detailsQuery.isLoading) {
    return (
      <Screen>
        <View style={styles.panel}>
          <Text style={styles.mutedText}>Loading property details...</Text>
        </View>
      </Screen>
    );
  }

  if (!property) {
    return (
      <Screen>
        <EmptyState
          description="This listing may have been removed or is no longer available."
          title="Property not found"
        />
      </Screen>
    );
  }

  const locationLabel = [property.address, property.area, property.city, property.district]
    .filter(Boolean)
    .join(', ');
  const mapsQuery = encodeURIComponent(
    [property.address, property.area, property.city, property.district, 'Uganda']
      .filter(Boolean)
      .join(', '),
  );

  return (
    <Screen>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.gallery}
      >
        {(images.length > 0 ? images : fallbackImages).map((image, index) =>
          typeof image === 'string' ? (
            <Image key={image} source={{ uri: image }} style={styles.galleryImage} />
          ) : (
            <Image key={index} source={image} style={styles.galleryImage} />
          ),
        )}
      </ScrollView>

      <View style={styles.section}>
        <View style={styles.badgeRow}>
          {isPropertyBoosted(property) ? <Badge tone="gold">Boosted</Badge> : null}
          <Badge tone="accent">{propertyTypeLabel(property.property_type)}</Badge>
          <Badge tone={property.status === 'available' ? 'primary' : 'default'}>
            {property.status === 'available' ? 'Available now' : property.status}
          </Badge>
        </View>
        <Text style={styles.title}>{property.title}</Text>
        <Text style={styles.location}>{locationLabel || `${property.district}, Uganda`}</Text>
        <Text style={styles.priceLabel}>
          {formatUGX(property.rent_amount)}{' '}
          <Text style={styles.periodText}>per {property.rent_period.replace('ly', '')}</Text>
        </Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Quick Details</Text>
        <View style={styles.detailList}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Bedrooms</Text>
            <Text style={styles.detailValue}>{property.bedrooms}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Bathrooms</Text>
            <Text style={styles.detailValue}>{property.bathrooms}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Sitting Rooms</Text>
            <Text style={styles.detailValue}>{property.sitting_rooms}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Kitchens</Text>
            <Text style={styles.detailValue}>{property.kitchens}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Full Rent</Text>
            <Text style={styles.detailValue}>{formatUGXFull(property.rent_amount)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Property Details</Text>
        <View style={styles.detailList}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Address</Text>
            <Text style={styles.detailValue}>{property.address || 'Not provided'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Area</Text>
            <Text style={styles.detailValue}>{property.area || 'Not provided'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>City</Text>
            <Text style={styles.detailValue}>{property.city || 'Not provided'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>District</Text>
            <Text style={styles.detailValue}>{property.district}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Property Type</Text>
            <Text style={styles.detailValue}>{propertyTypeLabel(property.property_type)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Rent Period</Text>
            <Text style={styles.detailValue}>{property.rent_period}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <Text style={styles.detailValue}>
              {property.status === 'available' ? 'Available now' : property.status}
            </Text>
          </View>
        </View>
      </View>

      {property.description ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>About This Property</Text>
          <Text style={styles.bodyText}>{property.description}</Text>
        </View>
      ) : null}

      {property.amenities?.length ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Amenities</Text>
          <View style={styles.amenities}>
            {property.amenities.map((amenity) => (
              <Badge key={amenity} tone="gold">
                {amenity}
              </Badge>
            ))}
          </View>
        </View>
      ) : null}

      {units.length > 0 ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Rental Units</Text>
          {units.map((unit) => (
            <View key={unit.id} style={styles.unitCard}>
              <Text style={styles.unitTitle}>Unit {unit.unit_number}</Text>
              <Text style={styles.detailText}>
                {unit.bedrooms} bed • {unit.bathrooms} bath • {unit.sitting_rooms} sitting •{' '}
                {unit.kitchens} kitchen
              </Text>
              <Text style={styles.unitPrice}>{formatUGX(unit.rent_amount)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Contact House Manager</Text>
        <View style={styles.actionGroup}>
          {property.manager_phone ? (
            <Button onPress={() => Linking.openURL(`tel:${property.manager_phone}`)}>
              Call Manager
            </Button>
          ) : null}
          {property.manager_email ? (
            <Button
              onPress={() => Linking.openURL(`mailto:${property.manager_email}`)}
              variant="outline"
            >
              Email Manager
            </Button>
          ) : null}
          <Button
            onPress={async () => {
              const candidates = [
                `geo:0,0?q=${mapsQuery}`,
                `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`,
                `https://www.openstreetmap.org/search?query=${mapsQuery}`,
              ];

              for (const candidate of candidates) {
                try {
                  const supported = await Linking.canOpenURL(candidate);
                  if (supported) {
                    await Linking.openURL(candidate);
                    return;
                  }
                } catch {
                  continue;
                }
              }
            }}
            variant="secondary"
          >
            Open Directions
          </Button>
          <Button
            onPress={() =>
              Share.share({
                message: `${property.title} in ${property.district} - ${formatUGXFull(property.rent_amount)}`,
              })
            }
            variant="outline"
          >
            Share Listing
          </Button>
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Send an Inquiry</Text>
        {!user ? (
          <View style={styles.actionGroup}>
            <Text style={styles.bodyText}>
              Sign in to message the house manager directly from the app.
            </Text>
            <Button onPress={() => navigation.navigate('Login')}>Sign In to Contact</Button>
            <Button onPress={() => navigation.navigate('Register')} variant="outline">
              Create Account
            </Button>
          </View>
        ) : user.id === property.manager_id ? (
          <Text style={styles.bodyText}>This listing belongs to your account.</Text>
        ) : (
          <View style={styles.actionGroup}>
            <InputField
              label="Your message"
              multiline
              onChangeText={setMessageText}
              placeholder="Hello, I am interested in this property. Is it still available?"
              value={messageText}
            />
            <Button
              disabled={sending || !messageText.trim()}
              onPress={async () => {
                try {
                  setSending(true);
                  await sendTenantMessage(
                    user.id,
                    property.manager_id,
                    messageText.trim(),
                    property.id,
                  );
                  setMessageText('');
                  Alert.alert(
                    'Message sent',
                    'The house manager will see your inquiry in their dashboard.',
                  );
                } catch (error) {
                  Alert.alert(
                    'Could not send message',
                    error instanceof Error ? error.message : 'Please try again.',
                  );
                } finally {
                  setSending(false);
                }
              }}
            >
              {sending ? 'Sending...' : 'Send Message'}
            </Button>
          </View>
        )}
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Your Access</Text>
        <Text style={styles.bodyText}>
          {role
            ? `You are currently signed in as ${role.replace('_', ' ')}.`
            : 'You are browsing as a guest.'}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionGroup: {
    gap: spacing.sm,
  },
  amenities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bodyText: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 24,
  },
  detailText: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 22,
  },
  detailLabel: {
    color: colors.textMuted,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  detailList: {
    gap: spacing.sm,
  },
  detailRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: 4,
    paddingBottom: spacing.sm,
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
  galleryImage: {
    height: 260,
    width: 360,
  },
  location: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
  },
  mutedText: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 15,
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  panelTitle: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 22,
  },
  periodText: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 15,
  },
  priceLabel: {
    color: colors.primary,
    fontFamily: typography.display,
    fontSize: 30,
  },
  section: {
    gap: 8,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 32,
  },
  unitCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.card,
    gap: 6,
    padding: spacing.md,
  },
  unitPrice: {
    color: colors.primary,
    fontFamily: typography.display,
    fontSize: 22,
  },
  unitTitle: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 15,
  },
});
