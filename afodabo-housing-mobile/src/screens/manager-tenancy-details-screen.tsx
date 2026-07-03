import type { StackScreenProps } from '@react-navigation/stack';
import React, { useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
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
} from '../services/agreements';
import { sendRentReminder } from '../services/manager';
import { colors, radii, spacing, typography } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';
import { formatDateLabel, formatUGXFull } from '../utils/format';
import { getTenancyHealth } from '../utils/tenancy-health';

export function ManagerTenancyDetailsScreen({
  route,
}: StackScreenProps<RootStackParamList, 'ManagerTenancyDetails'>) {
  const { profile, user } = useAuth();
  const tenancyQuery = useManagerTenancy(user?.id, route.params.tenancyId);
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
  const health = tenancy
    ? getTenancyHealth(tenancy.rent_start_date, tenancy.rent_end_date)
    : null;

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

  return (
    <ScrollableScreenContainer contentContainerStyle={styles.content}>
      <PageHeader
        subtitle={`${tenancy.tenant_name || 'Tenant'} • ${tenancy.status}`}
        title={tenancy.property_title || 'Tenancy'}
      />

      {health ? (
        <View style={styles.card}>
          <View style={styles.healthRow}>
            <View style={[styles.healthDot, { backgroundColor: health.color }]} />
            <Text
              style={[
                styles.healthLabel,
                { color: health.color },
                health.status === 'expired' && { textDecorationLine: 'line-through' },
              ]}
            >
              {health.label}
            </Text>
            <Text
              style={[
                styles.healthDays,
                health.status === 'expired' && { textDecorationLine: 'line-through' },
              ]}
            >
              {health.daysRemaining > 0
                ? `${health.daysRemaining} days remaining`
                : 'Period expired'}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${health.progressPercent}%`, backgroundColor: health.color },
              ]}
            />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressText}>{health.progressPercent}% elapsed</Text>
            <Text style={styles.progressText}>{health.totalDays} days total</Text>
          </View>
        </View>
      ) : null}

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
  healthRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  healthDot: {
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  healthLabel: {
    fontFamily: typography.bodyStrong,
    fontSize: 15,
  },
  healthDays: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 13,
    marginLeft: 'auto',
  },
  progressTrack: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 6,
    height: 8,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: 6,
    height: '100%',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
  },
});
