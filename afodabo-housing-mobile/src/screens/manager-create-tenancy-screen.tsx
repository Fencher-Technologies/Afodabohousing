import type { StackScreenProps } from '@react-navigation/stack';
import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { ScrollableScreenContainer } from '../components/scrollable-screen-container';
import { TenancyForm, type TenancyFormValues } from '../components/tenancy-form';
import { useAuth } from '../context/auth-context';
import {
  createTenancyWorkflow,
  resolveTenantByEmail,
} from '../services/manager';
import { colors, spacing } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

export function ManagerCreateTenancyScreen({
  navigation,
}: StackScreenProps<RootStackParamList, 'ManagerCreateTenancy'>) {
  const { profile, user } = useAuth();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (values: TenancyFormValues) => {
    try {
      setSaving(true);
      if (!user) {
        throw new Error('Sign in as a house manager to create a tenancy.');
      }

      const tenant = await resolveTenantByEmail(values.tenantEmail);

      await createTenancyWorkflow({
        managerContact: profile?.phone || user.email || null,
        propertyTitle: undefined,
        tenantEmail: values.tenantEmail,
        tenantPhone: tenant.phone || null,
        tenancy: {
          manager_id: user.id,
          property_id: values.propertyId,
          rent_amount: values.rentAmount,
          rent_end_date: values.rentEndDate,
          rent_period: values.rentPeriod,
          rent_start_date: values.rentStartDate,
          tenant_id: '',
        },
      });

      Alert.alert('Tenancy created', 'The tenant has been linked and the agreement is ready.', [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert(
        'Could not create tenancy',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollableScreenContainer contentContainerStyle={styles.content}>
      <TenancyForm
        mode="create"
        saving={saving}
        showAgreementDownloads
        submitLabel="Save Tenancy"
        onCancel={() => navigation.goBack()}
        onSubmit={handleSubmit}
      />
    </ScrollableScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
});
