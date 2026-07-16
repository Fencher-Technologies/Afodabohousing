import { addMonths, addYears, format, isBefore, parseISO } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import type { StackScreenProps } from '@react-navigation/stack';
import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/button';
import { DatePickerField } from '../components/date-picker-field';
import { InputField } from '../components/input-field';
import { ScrollableScreenContainer } from '../components/scrollable-screen-container';
import { useAuth } from '../context/auth-context';
import { useManagerDashboard } from '../hooks/manager/use-manager-dashboard';
import {
  buildTenancyAgreementText,
  downloadTenancyAgreementEditable,
  downloadTenancyAgreementPdf,
  summarizeTenancyAgreement,
} from '../services/agreements';
import { createTenancyWorkflow, resolveTenantByEmail } from '../services/manager';
import { colors, radii, spacing, typography } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';
import type { Database } from '../types/supabase';
import { formatUGXFull } from '../utils/format';

function addPeriod(startDate: string, rentPeriod: Database['public']['Enums']['rent_period']) {
  const parsedDate = parseISO(startDate);

  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  if (rentPeriod === 'annually') {
    return format(addYears(parsedDate, 1), 'yyyy-MM-dd');
  }

  if (rentPeriod === 'quarterly') {
    return format(addMonths(parsedDate, 3), 'yyyy-MM-dd');
  }

  return format(addMonths(parsedDate, 1), 'yyyy-MM-dd');
}

export function ManagerCreateTenancyScreen({
  navigation,
}: StackScreenProps<RootStackParamList, 'ManagerCreateTenancy'>) {
  const { profile, user } = useAuth();
  const dashboardQuery = useManagerDashboard(user?.id);
  const [downloadingAgreement, setDownloadingAgreement] = useState(false);
  const [downloadingEditableAgreement, setDownloadingEditableAgreement] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tenancyForm, setTenancyForm] = useState({
    property_id: '',
    rent_end_date: '',
    rent_period: 'monthly' as Database['public']['Enums']['rent_period'],
    rent_start_date: '',
    tenant_email: '',
  });

  const propertyOptions = useMemo(
    () => dashboardQuery.data?.properties ?? [],
    [dashboardQuery.data],
  );
  const selectedProperty = propertyOptions.find(
    (property) => property.id === tenancyForm.property_id,
  );
  const locationLabel = selectedProperty
    ? [
        selectedProperty.address,
        selectedProperty.area,
        selectedProperty.city,
        selectedProperty.district,
      ]
        .filter(Boolean)
        .join(', ')
    : null;
  const normalizedTenantEmail = tenancyForm.tenant_email.trim().toLowerCase();
  const tenantPreviewQuery = useQuery({
    enabled: normalizedTenantEmail.includes('@'),
    queryFn: () => resolveTenantByEmail(normalizedTenantEmail),
    queryKey: ['tenant-preview', normalizedTenantEmail],
    retry: false,
  });
  const tenantPreviewName = tenantPreviewQuery.data?.full_name ?? null;
  const resolvedRentAmount = selectedProperty?.rent_amount ?? 0;
  const resolvedRentPeriod = selectedProperty?.rent_period ?? tenancyForm.rent_period;
  const tenancyReady =
    Boolean(tenancyForm.property_id) &&
    Boolean(normalizedTenantEmail) &&
    Boolean(tenancyForm.rent_start_date) &&
    Boolean(tenancyForm.rent_end_date) &&
    resolvedRentAmount > 0;
  const agreementDraft = selectedProperty
    ? {
        endDate: tenancyForm.rent_end_date,
        generatedByEmail: user?.email ?? null,
        generatedByName: profile?.full_name ?? null,
        generatedDate: new Date().toISOString(),
        managerContact: profile?.phone || user?.email || null,
        managerName: profile?.full_name || null,
        propertyLocation: locationLabel,
        propertyTitle: selectedProperty.title,
        rentAmount: resolvedRentAmount,
        rentPeriod: resolvedRentPeriod,
        startDate: tenancyForm.rent_start_date,
        tenantEmail: normalizedTenantEmail,
        tenantName: tenantPreviewName,
      }
    : null;
  const agreementSummary = agreementDraft ? summarizeTenancyAgreement(agreementDraft) : null;

  if (!user) {
    return (
      <ScrollableScreenContainer>
        <View style={styles.card}>
          <Text style={styles.cardText}>Sign in as a house manager to create a tenancy.</Text>
        </View>
      </ScrollableScreenContainer>
    );
  }

  return (
    <ScrollableScreenContainer contentContainerStyle={styles.content}>
      <View style={styles.card}>
        {propertyOptions.length > 0 ? (
          <>
            <Text style={styles.fieldLabel}>Choose property</Text>
            <View style={styles.propertyChoices}>
              {propertyOptions.map((property) => (
                <Button
                  key={property.id}
                  onPress={() =>
                    setTenancyForm((current) => ({
                      ...current,
                      rent_end_date:
                        current.rent_start_date && !current.rent_end_date
                          ? addPeriod(current.rent_start_date, property.rent_period)
                          : current.rent_end_date,
                      property_id: property.id,
                      rent_period: property.rent_period,
                    }))
                  }
                  variant={tenancyForm.property_id === property.id ? 'primary' : 'secondary'}
                >
                  {property.title}
                </Button>
              ))}
            </View>
          </>
        ) : (
          <Text style={styles.cardText}>
            Your properties will appear here once the dashboard data loads.
          </Text>
        )}

        <InputField
          label="Property ID"
          onChangeText={(value) =>
            setTenancyForm((current) => ({ ...current, property_id: value }))
          }
          value={tenancyForm.property_id}
        />
        <InputField
          autoCapitalize="none"
          label="Tenant email"
          onChangeText={(value) =>
            setTenancyForm((current) => ({ ...current, tenant_email: value }))
          }
          value={tenancyForm.tenant_email}
        />
        <DatePickerField
          label="Start date"
          onChange={(value) =>
            setTenancyForm((current) => {
              const nextEndDate =
                value &&
                (!current.rent_end_date ||
                  isBefore(parseISO(current.rent_end_date), parseISO(value)))
                  ? addPeriod(value, current.rent_period)
                  : current.rent_end_date;

              return {
                ...current,
                rent_end_date: nextEndDate,
                rent_start_date: value,
              };
            })
          }
          value={tenancyForm.rent_start_date}
        />
        <DatePickerField
          label="End date"
          minDate={tenancyForm.rent_start_date || undefined}
          onChange={(value) => setTenancyForm((current) => ({ ...current, rent_end_date: value }))}
          value={tenancyForm.rent_end_date}
        />
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Rent From Property</Text>
          <Text style={styles.previewLine}>
            Amount:{' '}
            {selectedProperty ? formatUGXFull(selectedProperty.rent_amount) : 'Select a property'}
          </Text>
          <Text style={styles.previewLine}>
            Frequency: {selectedProperty ? selectedProperty.rent_period : 'Select a property'}
          </Text>
        </View>

        {agreementDraft ? (
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Agreement Preview</Text>
            <Text style={styles.previewLine}>{agreementDraft.propertyTitle}</Text>
            <Text style={styles.previewLine}>
              Tenant:{' '}
              {agreementDraft.tenantName || agreementDraft.tenantEmail || 'Add tenant email'}
            </Text>
            <Text style={styles.previewLine}>
              House manager: {agreementDraft.managerName || 'Add manager profile name'}
            </Text>
            <Text style={styles.previewLine}>
              Rent per cycle: {formatUGXFull(agreementDraft.rentAmount)} (
              {agreementSummary?.rentScheduleLabel ?? agreementDraft.rentPeriod})
            </Text>
            <Text style={styles.previewLine}>
              Tenancy period: {agreementSummary?.tenancyPeriodLabel ?? 'Select dates'}
            </Text>
            <Text style={styles.previewLine}>
              Total period rent:{' '}
              {agreementSummary
                ? formatUGXFull(agreementSummary.totalRentAmount)
                : formatUGXFull(agreementDraft.rentAmount)}
            </Text>
            <Text style={styles.previewLine}>
              Period: {agreementDraft.startDate || 'Choose start date'} to{' '}
              {agreementDraft.endDate || 'Choose end date'}
            </Text>
            <Text style={styles.previewText}>{buildTenancyAgreementText(agreementDraft)}</Text>
            <Button
              disabled={!tenancyReady || downloadingAgreement}
              onPress={async () => {
                if (!agreementDraft) {
                  return;
                }

                try {
                  setDownloadingAgreement(true);
                  const fileUri = await downloadTenancyAgreementPdf(agreementDraft);
                  Alert.alert('Agreement ready', `PDF prepared at ${fileUri}`);
                } catch (error) {
                  Alert.alert(
                    'Could not prepare agreement',
                    error instanceof Error ? error.message : 'Please try again.',
                  );
                } finally {
                  setDownloadingAgreement(false);
                }
              }}
              variant="secondary"
            >
              {downloadingAgreement ? 'Preparing PDF...' : 'Download Agreement PDF'}
            </Button>
            <Button
              disabled={!tenancyReady || downloadingEditableAgreement}
              onPress={async () => {
                if (!agreementDraft) {
                  return;
                }

                try {
                  setDownloadingEditableAgreement(true);
                  const fileUri = await downloadTenancyAgreementEditable(agreementDraft);
                  Alert.alert('Editable agreement ready', `Document prepared at ${fileUri}`);
                } catch (error) {
                  Alert.alert(
                    'Could not prepare editable agreement',
                    error instanceof Error ? error.message : 'Please try again.',
                  );
                } finally {
                  setDownloadingEditableAgreement(false);
                }
              }}
              variant="outline"
            >
              {downloadingEditableAgreement ? 'Preparing file...' : 'Download Editable Agreement'}
            </Button>
          </View>
        ) : null}

        <Button
          disabled={saving || !tenancyReady || !agreementDraft}
          onPress={async () => {
            try {
              setSaving(true);
              if (!agreementDraft) {
                throw new Error('Choose the tenancy details before saving.');
              }

              await createTenancyWorkflow({
                agreementText: buildTenancyAgreementText(agreementDraft),
                managerContact: profile?.phone || user.email || null,
                propertyTitle: selectedProperty?.title,
                tenantEmail: tenancyForm.tenant_email,
                tenantPhone: null,
                tenancy: {
                  manager_id: user.id,
                  property_id: tenancyForm.property_id,
                  rent_amount: resolvedRentAmount,
                  rent_end_date: tenancyForm.rent_end_date,
                  rent_period: resolvedRentPeriod,
                  rent_start_date: tenancyForm.rent_start_date,
                  tenant_id: '',
                },
              });

              Alert.alert(
                'Tenancy created',
                'The tenant has been linked and the agreement is ready.',
                [
                  {
                    text: 'Download PDF',
                    onPress: () => {
                      void downloadTenancyAgreementPdf(agreementDraft);
                      navigation.goBack();
                    },
                  },
                  {
                    text: 'Done',
                    onPress: () => navigation.goBack(),
                  },
                ],
              );
            } catch (error) {
              Alert.alert(
                'Could not create tenancy',
                error instanceof Error ? error.message : 'Please try again.',
              );
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? 'Saving...' : 'Save Tenancy'}
        </Button>
        <Button onPress={() => navigation.goBack()} variant="outline">
          Cancel
        </Button>
      </View>
    </ScrollableScreenContainer>
  );
}

const styles = StyleSheet.create({
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
  previewCard: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  previewLine: {
    color: colors.textSecondary,
    fontFamily: typography.bodyStrong,
    fontSize: 14,
  },
  previewText: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 20,
  },
  previewTitle: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 22,
  },
  propertyChoices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
