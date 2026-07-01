import type { StackScreenProps } from '@react-navigation/stack';
import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/button';
import { InputField } from '../components/input-field';
import { ScrollableScreenContainer } from '../components/scrollable-screen-container';
import { SegmentedControl } from '../components/segmented-control';
import { useAuth } from '../context/auth-context';
import { createProperty } from '../services/manager';
import { uploadPropertyImages } from '../services/uploads';
import { colors, radii, spacing, typography } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';
import type { Database } from '../types/supabase';
import {
  AMENITIES,
  PROPERTY_IMAGE_MAX,
  PROPERTY_IMAGE_MIN,
  PROPERTY_TYPE_OPTIONS,
  RENT_PERIOD_OPTIONS,
} from '../utils/constants';

const propertyTypeLabels: Record<Database['public']['Enums']['property_type'], string> = {
  apartment: 'Apartment',
  bungalow: 'Bungalow',
  house: 'House',
  room: 'Single Room',
  self_contained: 'Self-Contained Unit',
  studio: 'Studio Room',
};

const rentPeriodLabels: Record<Database['public']['Enums']['rent_period'], string> = {
  annually: 'Pay Yearly',
  monthly: 'Pay Monthly',
  quarterly: 'Pay Quarterly',
};

const initialPropertyForm = {
  address: '',
  area: '',
  bathrooms: '1',
  bedrooms: '1',
  city: '',
  description: '',
  district: '',
  kitchens: '1',
  manager_email: '',
  manager_phone: '',
  property_type: 'house' as Database['public']['Enums']['property_type'],
  rent_amount: '',
  rent_period: 'monthly' as Database['public']['Enums']['rent_period'],
  sitting_rooms: '1',
  title: '',
};

export function ManagerCreatePropertyScreen({
  navigation,
}: StackScreenProps<RootStackParamList, 'ManagerCreateProperty'>) {
  const { user } = useAuth();
  const [propertyForm, setPropertyForm] = useState(initialPropertyForm);
  const [saving, setSaving] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedImages, setSelectedImages] = useState<
    { mimeType?: string; name: string; uri: string }[]
  >([]);

  if (!user) {
    return (
      <ScrollableScreenContainer>
        <View style={styles.card}>
          <Text style={styles.cardText}>Sign in as a house manager to list a property.</Text>
        </View>
      </ScrollableScreenContainer>
    );
  }

  return (
    <ScrollableScreenContainer contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Property Photos</Text>
        <Text style={styles.helperText}>
          Add between {PROPERTY_IMAGE_MIN} and {PROPERTY_IMAGE_MAX} photos so the listing is
          published with a complete gallery.
        </Text>
        <Button
          onPress={async () => {
            const pickerResult = await DocumentPicker.getDocumentAsync({
              copyToCacheDirectory: true,
              multiple: true,
              type: 'image/*',
            });

            if (pickerResult.canceled) {
              return;
            }

            const nextImages = pickerResult.assets.map((asset) => ({
              mimeType: asset.mimeType ?? undefined,
              name: asset.name,
              uri: asset.uri,
            }));

            setSelectedImages((current) => {
              const imageMap = new Map(current.map((image) => [image.uri, image] as const));

              nextImages.forEach((image) => {
                imageMap.set(image.uri, image);
              });

              const combined = Array.from(imageMap.values());

              if (combined.length > PROPERTY_IMAGE_MAX) {
                Alert.alert(
                  'Too many photos',
                  `You can attach up to ${PROPERTY_IMAGE_MAX} listing photos.`,
                );
                return combined.slice(0, PROPERTY_IMAGE_MAX);
              }

              return combined;
            });
          }}
          variant="outline"
        >
          {selectedImages.length > 0
            ? `Add More Photos (${selectedImages.length})`
            : 'Choose Photos'}
        </Button>
        {selectedImages.length > 0 ? (
          <View style={styles.imagePreviewSection}>
            <Text style={styles.cardText}>
              {selectedImages.length} photo{selectedImages.length === 1 ? '' : 's'} selected
            </Text>
            <View style={styles.imagePreviewRow}>
              {selectedImages.map((image) => (
                <View key={image.uri} style={styles.imagePreviewCard}>
                  <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                  <Pressable
                    onPress={() =>
                      setSelectedImages((current) =>
                        current.filter((item) => item.uri !== image.uri),
                      )
                    }
                    style={styles.removeImageButton}
                  >
                    <Text style={styles.removeImageButtonText}>Remove</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <InputField
          label="Title"
          onChangeText={(value) => setPropertyForm((current) => ({ ...current, title: value }))}
          value={propertyForm.title}
        />
        <InputField
          label="District"
          onChangeText={(value) => setPropertyForm((current) => ({ ...current, district: value }))}
          value={propertyForm.district}
        />
        <InputField
          label="Area / neighbourhood"
          onChangeText={(value) => setPropertyForm((current) => ({ ...current, area: value }))}
          value={propertyForm.area}
        />
        <InputField
          label="City"
          onChangeText={(value) => setPropertyForm((current) => ({ ...current, city: value }))}
          value={propertyForm.city}
        />
        <InputField
          label="Address"
          onChangeText={(value) => setPropertyForm((current) => ({ ...current, address: value }))}
          value={propertyForm.address}
        />
        <Text style={styles.fieldLabel}>Property Type</Text>
        <Text style={styles.helperText}>
          Choose the kind of home or rental space you are listing.
        </Text>
        <SegmentedControl
          onChange={(value) => setPropertyForm((current) => ({ ...current, property_type: value }))}
          options={PROPERTY_TYPE_OPTIONS.map((option) => ({
            label: propertyTypeLabels[option.value] ?? option.label,
            value: option.value,
          }))}
          value={propertyForm.property_type}
        />
        <Text style={styles.fieldLabel}>Rent Collection Duration</Text>
        <Text style={styles.helperText}>Choose how often rent is expected for this property.</Text>
        <SegmentedControl
          onChange={(value) => setPropertyForm((current) => ({ ...current, rent_period: value }))}
          options={RENT_PERIOD_OPTIONS.map((option) => ({
            label: rentPeriodLabels[option.value] ?? option.label,
            value: option.value,
          }))}
          value={propertyForm.rent_period}
        />
        <InputField
          keyboardType="numeric"
          label="Rent amount"
          onChangeText={(value) =>
            setPropertyForm((current) => ({ ...current, rent_amount: value }))
          }
          value={propertyForm.rent_amount}
        />
        <InputField
          keyboardType="numeric"
          label="Bedrooms"
          onChangeText={(value) => setPropertyForm((current) => ({ ...current, bedrooms: value }))}
          value={propertyForm.bedrooms}
        />
        <InputField
          keyboardType="numeric"
          label="Bathrooms"
          onChangeText={(value) => setPropertyForm((current) => ({ ...current, bathrooms: value }))}
          value={propertyForm.bathrooms}
        />
        <InputField
          keyboardType="numeric"
          label="Sitting rooms"
          onChangeText={(value) =>
            setPropertyForm((current) => ({ ...current, sitting_rooms: value }))
          }
          value={propertyForm.sitting_rooms}
        />
        <InputField
          keyboardType="numeric"
          label="Kitchens"
          onChangeText={(value) => setPropertyForm((current) => ({ ...current, kitchens: value }))}
          value={propertyForm.kitchens}
        />
        <InputField
          label="Contact phone"
          onChangeText={(value) =>
            setPropertyForm((current) => ({ ...current, manager_phone: value }))
          }
          value={propertyForm.manager_phone}
        />
        <InputField
          autoCapitalize="none"
          label="Contact email"
          onChangeText={(value) =>
            setPropertyForm((current) => ({ ...current, manager_email: value }))
          }
          value={propertyForm.manager_email}
        />
        <InputField
          label="Description"
          multiline
          onChangeText={(value) =>
            setPropertyForm((current) => ({ ...current, description: value }))
          }
          value={propertyForm.description}
        />

        <Text style={styles.fieldLabel}>Amenities</Text>
        <View style={styles.amenities}>
          {AMENITIES.map((amenity) => (
            <Button
              key={amenity}
              onPress={() =>
                setSelectedAmenities((current) =>
                  current.includes(amenity)
                    ? current.filter((item) => item !== amenity)
                    : [...current, amenity],
                )
              }
              variant={selectedAmenities.includes(amenity) ? 'primary' : 'secondary'}
            >
              {amenity}
            </Button>
          ))}
        </View>

        <Button
          disabled={saving}
          onPress={async () => {
            try {
              if (selectedImages.length < PROPERTY_IMAGE_MIN) {
                Alert.alert(
                  'More photos needed',
                  `Please attach at least ${PROPERTY_IMAGE_MIN} property photos before saving.`,
                );
                return;
              }

              setSaving(true);
              const imageUrls =
                selectedImages.length > 0
                  ? await uploadPropertyImages(user.id, selectedImages)
                  : [];

              await createProperty({
                address: propertyForm.address || null,
                amenities: selectedAmenities,
                area: propertyForm.area || null,
                bathrooms: Number(propertyForm.bathrooms),
                bedrooms: Number(propertyForm.bedrooms),
                city: propertyForm.city || null,
                description: propertyForm.description || null,
                district: propertyForm.district,
                images: imageUrls,
                kitchens: Number(propertyForm.kitchens),
                manager_email: propertyForm.manager_email || null,
                manager_id: user.id,
                manager_phone: propertyForm.manager_phone || null,
                property_type: propertyForm.property_type,
                rent_amount: Number(propertyForm.rent_amount),
                rent_period: propertyForm.rent_period,
                sitting_rooms: Number(propertyForm.sitting_rooms),
                title: propertyForm.title,
              });

              Alert.alert('Property created', 'Your listing has been saved.', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (error) {
              Alert.alert(
                'Could not save property',
                error instanceof Error ? error.message : 'Please try again.',
              );
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? 'Saving...' : 'Save Property'}
        </Button>
        <Button onPress={() => navigation.goBack()} variant="outline">
          Cancel
        </Button>
      </View>
    </ScrollableScreenContainer>
  );
}

const styles = StyleSheet.create({
  amenities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  cardText: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
  },
  content: {
    gap: spacing.lg,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontFamily: typography.bodyStrong,
    fontSize: 13,
  },
  helperText: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
    marginTop: -4,
  },
  imagePreview: {
    borderColor: colors.border,
    borderRadius: radii.input,
    borderWidth: 1,
    height: 72,
    width: 72,
  },
  imagePreviewCard: {
    gap: spacing.xs,
  },
  imagePreviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  imagePreviewSection: {
    gap: spacing.sm,
  },
  removeImageButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  removeImageButtonText: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
  },
});
