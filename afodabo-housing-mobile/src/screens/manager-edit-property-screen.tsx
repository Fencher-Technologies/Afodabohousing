import type { StackScreenProps } from '@react-navigation/stack';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/button';
import { EmptyState } from '../components/empty-state';
import { ErrorState } from '../components/error-state';
import { InputField } from '../components/input-field';
import { LoadingState } from '../components/loading-state';
import { ScrollableScreenContainer } from '../components/scrollable-screen-container';
import { SegmentedControl } from '../components/segmented-control';
import { useAuth } from '../context/auth-context';
import { useManagerProperty } from '../hooks/manager/use-manager-properties';
import { updateProperty } from '../services/manager';
import { colors, radii, spacing, typography } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';
import type { PropertyRow } from '../types/supabase';
import { AMENITIES, PROPERTY_TYPE_OPTIONS, RENT_PERIOD_OPTIONS } from '../utils/constants';

export function ManagerEditPropertyScreen({
  navigation,
  route,
}: StackScreenProps<RootStackParamList, 'ManagerEditProperty'>) {
  const { user } = useAuth();
  const propertyQuery = useManagerProperty(user?.id, route.params.propertyId);
  const [saving, setSaving] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[] | null>(null);
  const [draft, setDraft] = useState<null | {
    address: string;
    area: string;
    bathrooms: string;
    bedrooms: string;
    city: string;
    description: string;
    district: string;
    kitchens: string;
    manager_email: string;
    manager_phone: string;
    property_type: string;
    rent_amount: string;
    rent_period: string;
    sitting_rooms: string;
    status: PropertyRow['status'];
    title: string;
  }>(null);

  if (!user) {
    return (
      <ScrollableScreenContainer>
        <EmptyState
          description="Sign in as a house manager to edit this property."
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

  const property = propertyQuery.property;

  if (!property) {
    return (
      <ScrollableScreenContainer>
        <EmptyState
          description="This property could not be found for your account."
          title="Property not found"
        />
      </ScrollableScreenContainer>
    );
  }

  const form = draft ?? {
    address: property.address || '',
    area: property.area || '',
    bathrooms: String(property.bathrooms),
    bedrooms: String(property.bedrooms),
    city: property.city || '',
    description: property.description || '',
    district: property.district,
    kitchens: String(property.kitchens),
    manager_email: property.manager_email || '',
    manager_phone: property.manager_phone || '',
    property_type: property.property_type,
    rent_amount: String(property.rent_amount),
    rent_period: property.rent_period,
    sitting_rooms: String(property.sitting_rooms),
    status: property.status,
    title: property.title,
  };

  const amenities = selectedAmenities ?? property.amenities ?? [];

  const updateDraft = (key: keyof typeof form, value: string) => {
    setDraft((current) => ({
      ...(current ?? form),
      [key]: value,
    }));
  };

  return (
    <ScrollableScreenContainer contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <InputField
          label="Title"
          onChangeText={(value) => updateDraft('title', value)}
          value={form.title}
        />
        <InputField
          label="District"
          onChangeText={(value) => updateDraft('district', value)}
          value={form.district}
        />
        <InputField
          label="Area / neighbourhood"
          onChangeText={(value) => updateDraft('area', value)}
          value={form.area}
        />
        <InputField
          label="City"
          onChangeText={(value) => updateDraft('city', value)}
          value={form.city}
        />
        <InputField
          label="Address"
          onChangeText={(value) => updateDraft('address', value)}
          value={form.address}
        />
        <SegmentedControl
          onChange={(value) => updateDraft('property_type', value as PropertyRow['property_type'])}
          options={PROPERTY_TYPE_OPTIONS.map((option) => ({
            label: option.label,
            value: option.value,
          }))}
          value={form.property_type}
        />
        <SegmentedControl
          onChange={(value) => updateDraft('rent_period', value as PropertyRow['rent_period'])}
          options={RENT_PERIOD_OPTIONS.map((option) => ({
            label: option.label,
            value: option.value,
          }))}
          value={form.rent_period}
        />
        <Text style={styles.fieldLabel}>Listing Status</Text>
        <SegmentedControl
          onChange={(value) => updateDraft('status', value as PropertyRow['status'])}
          options={[
            { label: 'Available', value: 'available' },
            { label: 'Occupied', value: 'occupied' },
            { label: 'Inactive', value: 'inactive' },
          ]}
          value={form.status}
        />
        <InputField
          keyboardType="numeric"
          label="Rent amount"
          onChangeText={(value) => updateDraft('rent_amount', value)}
          value={form.rent_amount}
        />
        <InputField
          keyboardType="numeric"
          label="Bedrooms"
          onChangeText={(value) => updateDraft('bedrooms', value)}
          value={form.bedrooms}
        />
        <InputField
          keyboardType="numeric"
          label="Bathrooms"
          onChangeText={(value) => updateDraft('bathrooms', value)}
          value={form.bathrooms}
        />
        <InputField
          keyboardType="numeric"
          label="Sitting rooms"
          onChangeText={(value) => updateDraft('sitting_rooms', value)}
          value={form.sitting_rooms}
        />
        <InputField
          keyboardType="numeric"
          label="Kitchens"
          onChangeText={(value) => updateDraft('kitchens', value)}
          value={form.kitchens}
        />
        <InputField
          label="Contact phone"
          onChangeText={(value) => updateDraft('manager_phone', value)}
          value={form.manager_phone}
        />
        <InputField
          autoCapitalize="none"
          label="Contact email"
          onChangeText={(value) => updateDraft('manager_email', value)}
          value={form.manager_email}
        />
        <InputField
          label="Description"
          multiline
          onChangeText={(value) => updateDraft('description', value)}
          value={form.description}
        />

        <Text style={styles.fieldLabel}>Amenities</Text>
        <View style={styles.amenities}>
          {AMENITIES.map((amenity) => (
            <Button
              key={amenity}
              onPress={() =>
                setSelectedAmenities((current) => {
                  const next = current ?? amenities;
                  return next.includes(amenity)
                    ? next.filter((item) => item !== amenity)
                    : [...next, amenity];
                })
              }
              variant={amenities.includes(amenity) ? 'primary' : 'secondary'}
            >
              {amenity}
            </Button>
          ))}
        </View>

        <View style={styles.buttonCluster}>
          <Button
            disabled={saving}
            onPress={async () => {
              try {
                setSaving(true);
                await updateProperty(property.id, {
                  address: form.address || null,
                  amenities,
                  area: form.area || null,
                  bathrooms: Number(form.bathrooms),
                  bedrooms: Number(form.bedrooms),
                  city: form.city || null,
                  description: form.description || null,
                  district: form.district,
                  images: property.images || [],
                  kitchens: Number(form.kitchens),
                  manager_email: form.manager_email || null,
                  manager_id: user.id,
                  manager_phone: form.manager_phone || null,
                  property_type: form.property_type as PropertyRow['property_type'],
                  rent_amount: Number(form.rent_amount),
                  rent_period: form.rent_period as PropertyRow['rent_period'],
                  sitting_rooms: Number(form.sitting_rooms),
                  status: form.status,
                  title: form.title,
                });
                Alert.alert('Property updated', 'Your changes were saved.', [
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
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button onPress={() => navigation.goBack()} variant="outline">
            Cancel
          </Button>
        </View>
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
  buttonCluster: {
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
  content: {
    gap: spacing.lg,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontFamily: typography.bodyStrong,
    fontSize: 13,
  },
});
