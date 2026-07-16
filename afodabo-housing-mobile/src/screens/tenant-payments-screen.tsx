import * as DocumentPicker from 'expo-document-picker';
import React, { useMemo, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { AdvancedFilterModal } from '../components/advanced-filter-modal';
import { Button } from '../components/button';
import { EmptyState } from '../components/empty-state';
import { ErrorState } from '../components/error-state';
import { LoadingState } from '../components/loading-state';
import { ScrollableScreenContainer } from '../components/scrollable-screen-container';
import { useAuth } from '../context/auth-context';
import { useTenantPayments } from '../hooks/tenant/use-tenant-payments';
import {
  buildTenantPaymentProofNote,
  createTenantPayment,
  initiatePesapalPayment,
} from '../services/tenant';
import { downloadPaymentReceiptPdf } from '../services/receipts';
import { uploadPaymentProof } from '../services/uploads';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { formatDateLabel, formatUGXFull } from '../utils/format';
import { resolvePaymentProofUrl } from '../services/platform';

export function TenantPaymentsScreen() {
  const { profile, user } = useAuth();
  const paymentsQuery = useTenantPayments(user?.id);
  const [submitting, setSubmitting] = useState(false);

  const activeTenancy = useMemo(
    () => paymentsQuery.tenancies.find((tenancy) => tenancy.status === 'active') ?? null,
    [paymentsQuery.tenancies],
  );

  if (!user) {
    return (
      <ScrollableScreenContainer>
        <EmptyState
          description="Sign in as a tenant to review payment activity."
          title="Payments unavailable"
        />
      </ScrollableScreenContainer>
    );
  }

  if (paymentsQuery.isLoading) {
    return <LoadingState message="Loading payment history" />;
  }

  if (paymentsQuery.isError) {
    return (
      <ScrollableScreenContainer>
        <ErrorState
          description={
            paymentsQuery.error instanceof Error ? paymentsQuery.error.message : 'Please try again.'
          }
          onRetry={() => {
            void paymentsQuery.refetch();
          }}
          title="Could not load payments"
        />
      </ScrollableScreenContainer>
    );
  }

  const handleUploadProof = async () => {
    if (!activeTenancy) {
      Alert.alert(
        'No active tenancy',
        'You need an active tenancy before uploading payment proof.',
      );
      return;
    }

    try {
      setSubmitting(true);
      const pickerResult = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: ['image/*', 'application/pdf'],
      });

      if (pickerResult.canceled) {
        return;
      }

      const asset = pickerResult.assets[0];
      const proofUrl = await uploadPaymentProof(user.id, {
        mimeType: asset.mimeType,
        name: asset.name,
        uri: asset.uri,
      });

      await createTenantPayment({
        amount: activeTenancy.rent_amount,
        currency: 'UGX',
        manager_id: activeTenancy.manager_id,
        notes: buildTenantPaymentProofNote(null, proofUrl),
        period_end: activeTenancy.rent_end_date,
        period_start: activeTenancy.rent_start_date,
        proof_url: proofUrl,
        status: 'uploaded',
        tenancy_id: activeTenancy.id,
        tenant_id: user.id,
      });

      await paymentsQuery.refetch();
      Alert.alert('Proof uploaded', 'Your house manager can now review this payment proof.');
    } catch (error) {
      Alert.alert('Upload failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayOnline = async () => {
    if (!activeTenancy) {
      Alert.alert(
        'No active tenancy',
        'Online payment becomes available once your tenancy is active.',
      );
      return;
    }

    try {
      setSubmitting(true);
      const nameParts = (profile?.full_name || 'Tenant').trim().split(' ');
      const response = await initiatePesapalPayment({
        amount: activeTenancy.rent_amount,
        description: `Rent for ${activeTenancy.property_title || 'Property'} - ${formatDateLabel(activeTenancy.rent_end_date)}`,
        email: user.email,
        firstName: nameParts[0] || 'Tenant',
        lastName: nameParts.slice(1).join(' '),
        paymentId: `pay-${activeTenancy.id}-${Date.now()}`,
        phone: profile?.phone || '',
      });

      if (!response.success || !response.redirect_url) {
        throw new Error(response.error || 'The payment gateway could not start this transaction.');
      }

      await createTenantPayment({
        amount: activeTenancy.rent_amount,
        currency: 'UGX',
        manager_id: activeTenancy.manager_id,
        notes: 'Online payment initiated',
        period_end: activeTenancy.rent_end_date,
        period_start: activeTenancy.rent_start_date,
        status: 'pending',
        tenancy_id: activeTenancy.id,
        tenant_id: user.id,
      });

      await Linking.openURL(response.redirect_url);
      await paymentsQuery.refetch();
    } catch (error) {
      Alert.alert(
        'Payment unavailable',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollableScreenContainer bottomPadding={spacing.xxl} contentContainerStyle={styles.content}>
      <View style={styles.summaryRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{paymentsQuery.summary.confirmedCount}</Text>
          <Text style={styles.statLabel}>Confirmed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{paymentsQuery.summary.pendingCount}</Text>
          <Text style={styles.statLabel}>Awaiting review</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Total Confirmed</Text>
        <Text style={styles.heroValue}>{formatUGXFull(paymentsQuery.summary.totalPaid)}</Text>
        <Text style={styles.cardText}>
          {activeTenancy
            ? `Current tenancy: ${activeTenancy.property_title || 'Active property'}`
            : 'You do not have an active tenancy linked right now.'}
        </Text>
        <View style={styles.actionRow}>
          <Button disabled={submitting} onPress={() => void handleUploadProof()}>
            Upload Proof
          </Button>
          <Button disabled={submitting} onPress={() => void handlePayOnline()} variant="outline">
            Pay Online
          </Button>
        </View>
      </View>

      <AdvancedFilterModal
        filters={paymentsQuery.filters}
        onApply={paymentsQuery.setFilters}
        onClear={() => paymentsQuery.setFilters({})}
        showDateRange
        showPaymentStatus
        showProperty
        title="Filter Payments"
      />

      <View style={styles.list}>
        {paymentsQuery.filteredPayments.length === 0 ? (
          <EmptyState
            description="Try another filter or come back after your next payment update."
            title="No payments in this view"
          />
        ) : (
          paymentsQuery.filteredPayments.map((payment) => {
            const proofUrl = resolvePaymentProofUrl(payment.proof_url);

            return (
              <View key={payment.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={styles.cardCopy}>
                    <Text style={styles.rowTitle}>{formatUGXFull(payment.amount)}</Text>
                    <Text style={styles.cardText}>{formatDateLabel(payment.created_at)}</Text>
                    <Text style={styles.cardText}>
                      {payment.notes || 'No additional payment notes.'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      payment.status === 'confirmed'
                        ? styles.statusConfirmed
                        : payment.status === 'rejected'
                          ? styles.statusRejected
                          : styles.statusPending,
                    ]}
                  >
                    <Text style={styles.statusText}>{payment.status}</Text>
                  </View>
                </View>

                {proofUrl ? (
                  <Button onPress={() => void Linking.openURL(proofUrl)} variant="outline">
                    View Uploaded Proof
                  </Button>
                ) : null}
                {payment.status === 'confirmed' ? (
                  <Button
                    onPress={async () => {
                      try {
                        await downloadPaymentReceiptPdf({
                          amount: payment.amount,
                          createdAt: payment.created_at,
                          managerName: null,
                          notes: payment.notes,
                          paymentId: payment.id,
                          propertyTitle: activeTenancy?.property_title || 'Property payment',
                          status: payment.status,
                          tenantName: profile?.full_name || user.email,
                        });
                      } catch (error) {
                        Alert.alert(
                          'Could not prepare receipt',
                          error instanceof Error ? error.message : 'Please try again.',
                        );
                      }
                    }}
                    variant="secondary"
                  >
                    Download Receipt
                  </Button>
                ) : null}
              </View>
            );
          })
        )}
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
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  cardCopy: {
    flex: 1,
    gap: 4,
  },
  cardRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  cardText: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 22,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 22,
  },
  content: {
    gap: spacing.lg,
  },
  heroValue: {
    color: colors.primary,
    fontFamily: typography.display,
    fontSize: 30,
  },
  list: {
    gap: spacing.md,
  },
  rowTitle: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 16,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: spacing.md,
  },
  statLabel: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
  },
  statValue: {
    color: colors.primary,
    fontFamily: typography.display,
    fontSize: 24,
  },
  statusConfirmed: {
    backgroundColor: colors.primarySoft,
  },
  statusPending: {
    backgroundColor: colors.surfaceMuted,
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusRejected: {
    backgroundColor: colors.accentSoft,
  },
  statusText: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
