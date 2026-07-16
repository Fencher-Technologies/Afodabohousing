import type { StackScreenProps } from '@react-navigation/stack';
import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../components/badge';
import { Button } from '../components/button';
import { EmptyState } from '../components/empty-state';
import { ErrorState } from '../components/error-state';
import { LoadingState } from '../components/loading-state';
import { PageHeader } from '../components/page-header';
import { ScrollableScreenContainer } from '../components/scrollable-screen-container';
import { useAuth } from '../context/auth-context';
import { useManagerTenancy } from '../hooks/manager/use-manager-tenancies';
import {
  downloadTenancyAgreementEditable,
  downloadTenancyAgreementPdf,
  consentToAgreement,
  uploadTenancyAgreement,
} from '../services/agreements';
import { sendRentReminder } from '../services/manager';
import { colors, radii, spacing, typography } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';
import { formatDateLabel, formatUGXFull } from '../utils/format';

export function ManagerTenancyDetailsScreen({
  route,
}: StackScreenProps<RootStackParamList, 'ManagerTenancyDetails'>) {
  const { profile, user } = useAuth();
  const tenancyQuery = useManagerTenancy(user?.id, route.params.tenancyId);
  const [agreementBusy, setAgreementBusy] = useState<null | 'consent' | 'upload'>(null);
  const [sending, setSending] = useState(false);

  if (!user) {
    return (
      <ScrollableScreenContainer>
        <EmptyState
          description="Sign in as a house manager to review this tenancy."
          title="Tenancy unavailable"
        />
      </ScrollableScreenContainer>
    );
  }

  if (tenancyQuery.isLoading) {
    return <LoadingState message="Loading tenancy" />;
  }

  if (tenancyQuery.isError) {
    return (
      <ScrollableScreenContainer>
        <ErrorState
          description={
            tenancyQuery.error instanceof Error ? tenancyQuery.error.message : 'Please try again.'
          }
          onRetry={() => {
            void tenancyQuery.refetch();
          }}
          title="Could not load tenancy"
        />
      </ScrollableScreenContainer>
    );
  }

  const tenancy = tenancyQuery.tenancy;

  if (!tenancy) {
    return (
      <ScrollableScreenContainer>
        <EmptyState
          description="This tenancy was not found for your account."
          title="Tenancy not found"
        />
      </ScrollableScreenContainer>
    );
  }

  const agreementState = tenancy.agreement_state;
  const managerConsented = agreementState?.manager.consented ?? false;
  const tenantConsented = agreementState?.tenant.consented ?? false;
  const agreementUrl = agreementState?.current_document?.agreement_url ?? null;

  return (
    <ScrollableScreenContainer contentContainerStyle={styles.content}>
      <PageHeader
        subtitle={`${tenancy.tenant_name || 'Tenant'} • ${tenancy.status}`}
        title={tenancy.property_title || 'Tenancy'}
      />

      <View style={styles.card}>
        <Text style={styles.value}>{formatUGXFull(tenancy.rent_amount)}</Text>
        <Text style={styles.body}>Tenant: {tenancy.tenant_name || tenancy.tenant_id}</Text>
        <Text style={styles.body}>Phone: {tenancy.tenant_phone || 'Not available'}</Text>
        <Text style={styles.body}>
          {formatDateLabel(tenancy.rent_start_date)} to {formatDateLabel(tenancy.rent_end_date)}
        </Text>
        <View style={styles.actionRow}>
          <Button
            onPress={async () => {
              try {
                await downloadTenancyAgreementPdf({
                  endDate: tenancy.rent_end_date,
                  generatedByEmail: user.email,
                  generatedByName: profile?.full_name || null,
                  managerContact: profile?.phone || user.email || null,
                  propertyLocation: tenancy.property_title || null,
                  propertyTitle: tenancy.property_title || 'Tenancy',
                  rentAmount: tenancy.rent_amount,
                  rentPeriod: tenancy.rent_period,
                  startDate: tenancy.rent_start_date,
                  tenantEmail: tenancy.tenant_name || tenancy.tenant_id,
                });
              } catch (error) {
                Alert.alert(
                  'Could not prepare agreement',
                  error instanceof Error ? error.message : 'Please try again.',
                );
              }
            }}
            variant="secondary"
          >
            Download Agreement PDF
          </Button>
          <Button
            onPress={async () => {
              try {
                await downloadTenancyAgreementEditable({
                  endDate: tenancy.rent_end_date,
                  generatedByEmail: user.email,
                  generatedByName: profile?.full_name || null,
                  managerContact: profile?.phone || user.email || null,
                  propertyLocation: tenancy.property_title || null,
                  propertyTitle: tenancy.property_title || 'Tenancy',
                  rentAmount: tenancy.rent_amount,
                  rentPeriod: tenancy.rent_period,
                  startDate: tenancy.rent_start_date,
                  tenantEmail: tenancy.tenant_name || tenancy.tenant_id,
                });
              } catch (error) {
                Alert.alert(
                  'Could not prepare editable agreement',
                  error instanceof Error ? error.message : 'Please try again.',
                );
              }
            }}
            variant="outline"
          >
            Editable Agreement
          </Button>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Agreement Consent</Text>
        <View style={styles.consentGrid}>
          <View style={styles.consentRow}>
            <Text style={styles.body}>Your consent</Text>
            <Badge tone={managerConsented ? 'success' : 'warning'}>
              {managerConsented ? 'Consented' : 'Pending'}
            </Badge>
          </View>
          <View style={styles.consentRow}>
            <Text style={styles.body}>Tenant consent</Text>
            <Badge tone={tenantConsented ? 'success' : 'warning'}>
              {tenantConsented ? 'Consented' : 'Pending'}
            </Badge>
          </View>
          {agreementState?.current_document ? (
            <Text style={styles.body}>
              Current file: {agreementState.current_document.file_name}
            </Text>
          ) : (
            <Text style={styles.body}>No agreement uploaded yet.</Text>
          )}
        </View>
        <View style={styles.actionRow}>
          <Button
            disabled={agreementBusy !== null}
            onPress={async () => {
              try {
                setAgreementBusy('upload');
                const pickerResult = await DocumentPicker.getDocumentAsync({
                  copyToCacheDirectory: true,
                  multiple: false,
                  type: ['application/pdf', 'image/*'],
                });

                if (pickerResult.canceled) {
                  return;
                }

                const asset = pickerResult.assets[0];
                await uploadTenancyAgreement(tenancy.id, {
                  mimeType: asset.mimeType,
                  name: asset.name,
                  uri: asset.uri,
                });
                await tenancyQuery.refetch();
                Alert.alert('Agreement uploaded', 'Both parties can now review and consent.');
              } catch (error) {
                Alert.alert(
                  'Upload failed',
                  error instanceof Error ? error.message : 'Please try again.',
                );
              } finally {
                setAgreementBusy(null);
              }
            }}
            variant="secondary"
          >
            {agreementBusy === 'upload' ? 'Uploading...' : 'Upload Agreement'}
          </Button>
          <Button
            disabled={!agreementUrl}
            onPress={() => {
              if (agreementUrl) {
                void Linking.openURL(agreementUrl);
              }
            }}
            variant="outline"
          >
            View Agreement
          </Button>
          <Button
            disabled={agreementBusy !== null || !agreementState?.current_document || managerConsented}
            onPress={async () => {
              try {
                setAgreementBusy('consent');
                await consentToAgreement(tenancy.id);
                await tenancyQuery.refetch();
                Alert.alert('Consent recorded', 'Your agreement consent has been timestamped.');
              } catch (error) {
                Alert.alert(
                  'Consent failed',
                  error instanceof Error ? error.message : 'Please try again.',
                );
              } finally {
                setAgreementBusy(null);
              }
            }}
          >
            {agreementBusy === 'consent' ? 'Recording...' : 'I Consent'}
          </Button>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Follow-up</Text>
        <View style={styles.actionRow}>
          <Button
            disabled={sending || !tenancy.tenant_phone}
            onPress={async () => {
              try {
                setSending(true);
                await sendRentReminder(tenancy, profile?.phone || user.email || null);
                Alert.alert('Reminder sent', 'The tenant has been notified by SMS.');
              } catch (error) {
                Alert.alert(
                  'Reminder failed',
                  error instanceof Error ? error.message : 'Please try again.',
                );
              } finally {
                setSending(false);
              }
            }}
          >
            {sending ? 'Sending...' : 'Send Reminder'}
          </Button>
          {tenancy.tenant_phone ? (
            <Button
              onPress={() => void Linking.openURL(`tel:${tenancy.tenant_phone}`)}
              variant="outline"
            >
              Call Tenant
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
  consentGrid: {
    gap: spacing.sm,
  },
  consentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  content: {
    gap: spacing.lg,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 22,
  },
  value: {
    color: colors.primary,
    fontFamily: typography.display,
    fontSize: 28,
  },
});
