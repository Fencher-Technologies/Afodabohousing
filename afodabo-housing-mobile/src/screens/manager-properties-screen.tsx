import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import React, { useState } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/button';
import { EmptyState } from '../components/empty-state';
import { ErrorState } from '../components/error-state';
import { InputField } from '../components/input-field';
import { LoadingState } from '../components/loading-state';
import { PropertyCard } from '../components/property-card';
import { ScrollableScreenContainer } from '../components/scrollable-screen-container';
import { useAuth } from '../context/auth-context';
import { useManagerProperties } from '../hooks/manager/use-manager-properties';
import { addRentalUnit } from '../services/manager';
import { colors, radii, spacing, typography } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

const initialUnitForm = {
  bathrooms: '1',
  bedrooms: '1',
  floor_level: '',
  kitchens: '1',
  property_id: '',
  rent_amount: '',
  sitting_rooms: '0',
  unit_number: '',
};

export function ManagerPropertiesScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const propertiesQuery = useManagerProperties(user?.id);
  const [saving, setSaving] = useState(false);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [unitForm, setUnitForm] = useState(initialUnitForm);

  if (!user) {
    return (
      <ScrollableScreenContainer>
        <EmptyState
          description="Sign in as a house manager to review your properties."
          title="Properties unavailable"
        />
      </ScrollableScreenContainer>
    );
  }

  if (propertiesQuery.isLoading) {
    return <LoadingState message="Loading properties" />;
  }

  if (propertiesQuery.isError) {
    return (
      <ScrollableScreenContainer>
        <ErrorState
          description={
            propertiesQuery.error instanceof Error
              ? propertiesQuery.error.message
              : 'Please try again.'
          }
          onRetry={() => {
            void propertiesQuery.refetch();
          }}
          title="Could not load properties"
        />
      </ScrollableScreenContainer>
    );
  }

  return (
    <ScrollableScreenContainer
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          onRefresh={() => {
            void propertiesQuery.refetch();
          }}
          refreshing={propertiesQuery.isRefetching}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.actionCard}>
        <Text style={styles.actionText}>
          {propertiesQuery.properties.length} listing
          {propertiesQuery.properties.length === 1 ? '' : 's'} in your account.
        </Text>
        <Text style={styles.metaText}>
          {propertiesQuery.properties.filter((property) => property.status === 'available').length}{' '}
          available •{' '}
          {propertiesQuery.properties.filter((property) => property.status === 'occupied').length}{' '}
          occupied •{' '}
          {propertiesQuery.properties.filter((property) => property.status === 'inactive').length}{' '}
          inactive
        </Text>
        <View style={styles.buttonCluster}>
          <Button onPress={() => navigation.navigate('ManagerCreateProperty')}>
            List New Property
          </Button>
          <Button
            onPress={() => {
              setShowUnitForm((current) => !current);
              setUnitForm((current) => ({
                ...current,
                property_id: current.property_id || propertiesQuery.properties[0]?.id || '',
              }));
            }}
            variant="outline"
          >
            {showUnitForm ? 'Hide Unit Form' : 'Add Rental Unit'}
          </Button>
        </View>
      </View>

      {showUnitForm ? (
        <View style={styles.formCard}>
          <InputField
            label="Property ID"
            onChangeText={(value) => setUnitForm((current) => ({ ...current, property_id: value }))}
            placeholder="Paste property ID from your listing"
            value={unitForm.property_id}
          />
          <InputField
            label="Unit number"
            onChangeText={(value) => setUnitForm((current) => ({ ...current, unit_number: value }))}
            value={unitForm.unit_number}
          />
          <InputField
            label="Floor level"
            onChangeText={(value) => setUnitForm((current) => ({ ...current, floor_level: value }))}
            value={unitForm.floor_level}
          />
          <InputField
            keyboardType="numeric"
            label="Bedrooms"
            onChangeText={(value) => setUnitForm((current) => ({ ...current, bedrooms: value }))}
            value={unitForm.bedrooms}
          />
          <InputField
            keyboardType="numeric"
            label="Bathrooms"
            onChangeText={(value) => setUnitForm((current) => ({ ...current, bathrooms: value }))}
            value={unitForm.bathrooms}
          />
          <InputField
            keyboardType="numeric"
            label="Sitting rooms"
            onChangeText={(value) =>
              setUnitForm((current) => ({ ...current, sitting_rooms: value }))
            }
            value={unitForm.sitting_rooms}
          />
          <InputField
            keyboardType="numeric"
            label="Kitchens"
            onChangeText={(value) => setUnitForm((current) => ({ ...current, kitchens: value }))}
            value={unitForm.kitchens}
          />
          <InputField
            keyboardType="numeric"
            label="Rent amount"
            onChangeText={(value) => setUnitForm((current) => ({ ...current, rent_amount: value }))}
            value={unitForm.rent_amount}
          />
          <Button
            disabled={saving || !unitForm.property_id || !unitForm.unit_number}
            onPress={async () => {
              try {
                setSaving(true);
                await addRentalUnit({
                  bathrooms: Number(unitForm.bathrooms),
                  bedrooms: Number(unitForm.bedrooms),
                  floor_level: unitForm.floor_level || null,
                  kitchens: Number(unitForm.kitchens),
                  property_id: unitForm.property_id,
                  rent_amount: Number(unitForm.rent_amount),
                  sitting_rooms: Number(unitForm.sitting_rooms),
                  unit_number: unitForm.unit_number,
                });
                setUnitForm(initialUnitForm);
                await propertiesQuery.refetch();
                Alert.alert('Unit added', 'The rental unit has been created.');
              } catch (error) {
                Alert.alert(
                  'Could not add unit',
                  error instanceof Error ? error.message : 'Please try again.',
                );
              } finally {
                setSaving(false);
              }
            }}
          >
            Add Unit
          </Button>
        </View>
      ) : null}

      {propertiesQuery.properties.length === 0 ? (
        <EmptyState
          description="Your live property listings will appear here once they are created."
          title="No properties yet"
        />
      ) : (
        propertiesQuery.properties.map((property, index) => (
          <View key={property.id} style={styles.cardWrap}>
            <PropertyCard
              index={index}
              onPress={() =>
                navigation.navigate('ManagerPropertyDetails', {
                  propertyId: property.id,
                })
              }
              property={property}
            />
            <Text style={styles.metaText}>
              Property ID: {property.id} • Status: {property.status}
            </Text>
          </View>
        ))
      )}
    </ScrollableScreenContainer>
  );
}

const styles = StyleSheet.create({
  actionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  actionText: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 22,
  },
  buttonCluster: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cardWrap: {
    gap: spacing.sm,
  },
  content: {
    gap: spacing.lg,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  metaText: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
  },
});
