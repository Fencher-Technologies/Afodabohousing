import { addMonths, addYears, format, isBefore, parseISO } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from './button';
import { DatePickerField } from './date-picker-field';
import { InputField } from './input-field';
import { useAuth } from '../context/auth-context';
import { useManagerDashboard } from '../hooks/manager/use-manager-dashboard';
import {
  buildTenancyAgreementText,
  downloadTenancyAgreementEditable,
  downloadTenancyAgreementPdf,
  summarizeTenancyAgreement,
} from '../services/agreements';
import { resolveTenantByEmail } from '../services/manager';
import type { RootStackParamList } from '../navigation/types';
import type { Database } from '../types/supabase';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { formatUGXFull } from '../utils/format';

type RentPeriod = Database['public']['Enums']['rent_period'];

export interface TenancyFormValues {
  propertyId: string;
  rentAmount: number;
  rentEndDate: string;
  rentPeriod: RentPeriod;
  rentStartDate: string;
  status?: string;
  tenantEmail: string;
}

interface TenancyFormProps {
  initialValues?: Partial<TenancyFormValues>;
  mode: 'create' | 'edit';
  onSubmit: (values: TenancyFormValues) => Promise<void>;
  saving?: boolean;
  showAgreementDownloads?: boolean;
  submitLabel?: string;
  tenantReadOnly?: boolean;
  onCancel: () => void;
}

function addPeriod(startDate: string, rentPeriod: RentPeriod) {
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

export function TenancyForm({
  initialValues,
  mode,
  onSubmit,
  saving = false,
  showAgreementDownloads = false,
  submitLabel,
  tenantReadOnly = false,
  onCancel,
}: TenancyFormProps) {
  const { profile, user } = useAuth();
  const dashboardQuery = useManagerDashboard(user?.id);
  const [downloadingAgreement, setDownloadingAgreement] = useState(false);
  const [downloadingEditableAgreement, setDownloadingEditableAgreement] = useState(false);
  const [form, setForm] = useState<TenancyFormValues>({
    propertyId: initialValues?.propertyId ?? '',
    rentAmount: initialValues?.rentAmount ?? 0,
    rentEndDate: initialValues?.rentEndDate ?? '',
    rentPeriod: initialValues?.rentPeriod ?? 'monthly',
    rentStartDate: initialValues?.rentStartDate ?? '',
    status: initialValues?.status,
    tenantEmail: initialValues?.tenantEmail ?? '',
  });
  const initialRef = useRef(JSON.stringify(initialValues ?? {}));
  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify({
      propertyId: initialValues?.propertyId ?? '',
      rentAmount: initialValues?.rentAmount ?? 0,
      rentEndDate: initialValues?.rentEndDate ?? '',
      rentPeriod: initialValues?.rentPeriod ?? 'monthly',
      rentStartDate: initialValues?.rentStartDate ?? '',
      status: initialValues?.status,
      tenantEmail: initialValues?.tenantEmail ?? '',
    }),
    [form, initialValues],
  );

  const propertyOptions = useMemo(
    () => dashboardQuery.data?.properties ?? [],
    [dashboardQuery.data],
  );
  const selectedProperty = propertyOptions.find(
    (property) => property.id === form.propertyId,
  );
  const locationLabel = selectedProperty
    ? [selectedProperty.address, selectedProperty.area, selectedProperty.city, selectedProperty.district]
        .filter(Boolean)
        .join(', ')
    : null;

  const normalizedTenantEmail = form.tenantEmail.trim().toLowerCase();
  const tenantPreviewQuery = useQuery({
    enabled: mode === 'create' && normalizedTenantEmail.includes('@') && !tenantReadOnly,
    queryFn: () => resolveTenantByEmail(normalizedTenantEmail),
    queryKey: ['tenant-preview', normalizedTenantEmail],
    retry: false,
  });
  const tenantPreviewName = tenantPreviewQuery.data?.full_name ?? null;
  const resolvedRentAmount = selectedProperty?.rent_amount ?? form.rentAmount ?? 0;
  const resolvedRentPeriod = selectedProperty?.rent_period ?? form.rentPeriod;
  const tenancyReady =
    Boolean(form.propertyId) &&
    Boolean(normalizedTenantEmail || tenantReadOnly) &&
    Boolean(form.rentStartDate) &&
    Boolean(form.rentEndDate) &&
    resolvedRentAmount > 0;

  const agreementDraft = selectedProperty
    ? {
        endDate: form.rentEndDate,
        generatedByEmail: user?.email ?? null,
        generatedByName: profile?.full_name ?? null,
        generatedDate: new Date().toISOString(),
        managerContact: profile?.phone || user?.email || null,
        managerName: profile?.full_name ?? null,
        propertyLocation: locationLabel,
        propertyTitle: selectedProperty.title,
        rentAmount: resolvedRentAmount,
        rentPeriod: resolvedRentPeriod,
        startDate: form.rentStartDate,
        tenantEmail: normalizedTenantEmail,
        tenantName: tenantPreviewName,
      }
    : null;
  const agreementSummary = agreementDraft ? summarizeTenancyAgreement(agreementDraft) : null;

  const handleCancel = () => {
    if (isDirty) {
      Alert.alert(
        'Discard changes?',
        'You have unsaved changes. If you leave now, they will be lost.',
        [
          { text: 'Keep editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onCancel },
        ],
      );
      return;
    }
    onCancel();
  };

  return (
    <View style={styles.card}>
      {propertyOptions.length > 0 ? (
        <>
          <Text style={styles.fieldLabel}>Choose property</Text>
          <View style={styles.propertyChoices}>
            {propertyOptions.map((property) => (
              <Button
                key={property.id}
                onPress={() =>
                  setForm((current) => ({
                    ...current,
                    rentEndDate:
                      current.rentStartDate && !current.rentEndDate
                        ? addPeriod(current.rentStartDate, property.rent_period)
                        : current.rentEndDate,
                    propertyId: property.id,
                    rentPeriod: property.rent_period,
                  }))
                }
                variant={form.propertyId === property.id ? 'primary' : 'secondary'}
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
        onChangeText={(value) => setForm((current) => ({ ...current, propertyId: value }))}
        value={form.propertyId}
      />
      <InputField
        autoCapitalize="none"
        editable={!tenantReadOnly}
        label={tenantReadOnly ? 'Tenant (linked)' : 'Tenant email'}
        onChangeText={(value) => setForm((current) => ({ ...current, tenantEmail: value }))}
        value={form.tenantEmail}
      />
      <DatePickerField
        label="Start date"
        onChange={(value) =>
          setForm((current) => {
            const nextEndDate =
              value &&
              (!current.rentEndDate || isBefore(parseISO(current.rentEndDate), parseISO(value)))
                ? addPeriod(value, current.rentPeriod)
                : current.rentEndDate;

            return {
              ...current,
              rentEndDate: nextEndDate,
              rentStartDate: value,
            };
          })
        }
        value={form.rentStartDate}
      />
      <DatePickerField
        label="End date"
        minDate={form.rentStartDate || undefined}
        onChange={(value) => setForm((current) => ({ ...current, rentEndDate: value }))}
        value={form.rentEndDate}
      />
      <View style={styles.previewCard}>
        <Text style={styles.previewTitle}>Rent From Property</Text>
        <Text style={styles.previewLine}>
          Amount: {selectedProperty ? formatUGXFull(selectedProperty.rent_amount) : formatUGXFull(form.rentAmount)}
        </Text>
        <Text style={styles.previewLine}>
          Frequency: {selectedProperty ? selectedProperty.rent_period : form.rentPeriod}
        </Text>
      </View>

      {agreementDraft ? (
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Agreement Preview</Text>
          <Text style={styles.previewLine}>{agreementDraft.propertyTitle}</Text>
          <Text style={styles.previewLine}>
            Tenant: {agreementDraft.tenantName || agreementDraft.tenantEmail || 'Add tenant email'}
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
          {showAgreementDownloads ? (
            <>
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
            </>
          ) : null}
        </View>
      ) : null}

      <Button
        disabled={saving || !tenancyReady || !agreementDraft}
        onPress={async () => {
          try {
            await onSubmit({ ...form, rentAmount: resolvedRentAmount, rentPeriod: resolvedRentPeriod });
          } catch {
            // Errors are surfaced by the parent via Alert.
          }
        }}
      >
        {saving ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          (submitLabel ?? 'Save Tenancy')
        )}
      </Button>
      <Button onPress={handleCancel} variant="outline">
        Cancel
      </Button>
    </View>
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
