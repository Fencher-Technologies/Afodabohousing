import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
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
import {
  BOOST_PLANS,
  formatBoostPrice,
  getBoostedUntil,
  isPropertyBoosted,
  purchasePropertyBoost,
} from '../services/property-boosts';
import { colors, radii, spacing, typography } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';
import type { PropertyRow } from '../types/supabase';

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
  const [boosting, setBoosting] = useState(false);
  const [boostProperty, setBoostProperty] = useState<PropertyRow | null>(null);
  const [selectedBoostDays, setSelectedBoostDays] = useState(BOOST_PLANS[0].days);

  const selectedBoostPlan =
    BOOST_PLANS.find((plan) => plan.days === selectedBoostDays) ?? BOOST_PLANS[0];

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
              {getBoostedUntil(property)
                ? ` • Boost ends ${new Date(getBoostedUntil(property) as string).toLocaleDateString()}`
                : ''}
            </Text>
            <Button
              onPress={() => {
                setSelectedBoostDays(BOOST_PLANS[0].days);
                setBoostProperty(property);
              }}
              variant="outline"
            >
              {isPropertyBoosted(property) ? 'Extend Boost' : 'Boost Property'}
            </Button>
          </View>
        ))
      )}

      <Modal
        animationType="fade"
        onRequestClose={() => setBoostProperty(null)}
        transparent
        visible={Boolean(boostProperty)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Boost Property</Text>
            <Text style={styles.modalSubtitle}>
              Promote {boostProperty?.title || 'this listing'} higher in search results.
            </Text>

            <View style={styles.planList}>
              {BOOST_PLANS.map((plan) => {
                const selected = plan.days === selectedBoostDays;

                return (
                  <Pressable
                    key={plan.days}
                    onPress={() => setSelectedBoostDays(plan.days)}
                    style={[styles.planButton, selected ? styles.planButtonSelected : null]}
                  >
                    <View>
                      <Text style={styles.planLabel}>{plan.label}</Text>
                      <Text style={styles.planMeta}>Featured placement on public listings</Text>
                    </View>
                    <Text style={styles.planPrice}>{formatBoostPrice(plan.price)}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.checkoutNote}>
              Checkout will charge {formatBoostPrice(selectedBoostPlan.price)} and activate the
              boosted badge once payment succeeds.
            </Text>

            <View style={styles.modalActions}>
              <Button disabled={boosting} onPress={() => setBoostProperty(null)} variant="outline">
                Cancel
              </Button>
              <Button
                disabled={boosting}
                onPress={async () => {
                  if (!boostProperty) {
                    return;
                  }

                  try {
                    setBoosting(true);
                    await purchasePropertyBoost(boostProperty.id, selectedBoostDays);
                    setBoostProperty(null);
                    await propertiesQuery.refetch();
                    Alert.alert('Property boost purchased', 'Your listing is now promoted.');
                  } catch (error) {
                    Alert.alert(
                      'Could not boost property',
                      error instanceof Error ? error.message : 'Please try again.',
                    );
                  } finally {
                    setBoosting(false);
                  }
                }}
              >
                {boosting ? 'Processing...' : 'Checkout'}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
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
  checkoutNote: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.modal,
    gap: spacing.md,
    margin: spacing.lg,
    padding: spacing.lg,
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: colors.overlay,
    flex: 1,
    justifyContent: 'center',
  },
  modalSubtitle: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 22,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 24,
  },
  planButton: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.input,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  planButtonSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  planLabel: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 14,
  },
  planList: {
    gap: spacing.sm,
  },
  planMeta: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
  },
  planPrice: {
    color: colors.primary,
    fontFamily: typography.display,
    fontSize: 18,
  },
});
