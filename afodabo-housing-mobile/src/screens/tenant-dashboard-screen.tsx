import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Badge } from '../components/badge';
import { Button } from '../components/button';
import { EmptyState } from '../components/empty-state';
import { SegmentedControl } from '../components/segmented-control';
import { ErrorState } from '../components/error-state';
import { LoadingState } from '../components/loading-state';
import { ScrollableScreenContainer } from '../components/scrollable-screen-container';
import { useAuth } from '../context/auth-context';
import { useTenantDashboard } from '../hooks/tenant/use-tenant-dashboard';
import { consentToAgreement, uploadTenancyAgreement } from '../services/agreements';
import {
  buildTenantPaymentProofNote,
  createTenantPayment,
  initiateNylonPay,
  initiatePesapalPayment,
  requestRenewal,
} from '../services/tenant';
import { uploadPaymentProof } from '../services/uploads';
import { colors, radii, shadows, spacing, typography } from '../theme/tokens';
import { formatDateLabel, formatUGXFull } from '../utils/format';
import { getTenancyHealth } from '../utils/tenancy-health';

type TenantView = 'overview' | 'payments';
type BlockedAction = 'pay' | 'upload' | null;

const dashboardPalette = {
  alertDangerBackground: '#FFF3F0',
  alertDangerBorder: '#F4C8BE',
  alertWarningBackground: '#F4EBD9',
  alertWarningBorder: '#E2C88F',
  paymentsIconBackground: '#FBEADF',
  sectionIconBackground: '#E9F0EC',
  unreadBannerBackground: '#EEF6F1',
  unreadBannerBorder: '#C8DED1',
} as const;

export function TenantDashboardScreen() {
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const { profile, user } = useAuth();
  const [blockedAction, setBlockedAction] = useState<BlockedAction>(null);
  const [agreementBusy, setAgreementBusy] = useState<null | 'consent' | 'upload'>(null);
  const [note, setNote] = useState('');
  const [selectedView, setSelectedView] = useState<TenantView>('overview');
  const [submitting, setSubmitting] = useState(false);
  const [npayPhone, setNpayPhone] = useState('');
  const [npaySending, setNpaySending] = useState(false);
  const [npayMessage, setNpayMessage] = useState<string | null>(null);
  const dashboardQuery = useTenantDashboard(user?.id);

  const activeTenancy = useMemo(
    () => dashboardQuery.data?.tenancies.find((tenancy) => tenancy.status === 'active') ?? null,
    [dashboardQuery.data?.tenancies],
  );
  const payments = dashboardQuery.data?.payments ?? [];
  const messages = dashboardQuery.data?.messages ?? [];
  const confirmedPayments = payments.filter((payment) => payment.status === 'confirmed');
  const totalPaid = confirmedPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const unreadMessages = messages.filter(
    (message) => !message.is_read && message.receiver_id === user?.id,
  ).length;
  const health = activeTenancy
    ? getTenancyHealth(activeTenancy.rent_start_date, activeTenancy.rent_end_date)
    : null;
  const isRentOverdue = health !== null && health.daysRemaining < 0;
  const isRentDueSoon = health !== null && health.daysRemaining >= 0 && health.daysRemaining <= 14;
  const agreementState = activeTenancy?.agreement_state ?? null;
  const tenantConsented = agreementState?.tenant.consented ?? false;
  const managerConsented = agreementState?.manager.consented ?? false;
  const agreementUrl = agreementState?.current_document?.agreement_url ?? null;

  const stats = [
    {
      helper: activeTenancy?.property_title || 'No property linked',
      icon: 'home' as const,
      iconBackground: '#FBEADF',
      label: 'Tenancy Status',
      tone: activeTenancy ? colors.accent : colors.error,
      value: activeTenancy ? 'Active' : 'No Active',
      strikethrough: false,
    },
    {
      helper: activeTenancy ? formatDateLabel(activeTenancy.rent_end_date) : 'No active tenancy',
      icon: 'calendar' as const,
      iconBackground: '#E9F0EC',
      label: 'Days Remaining',
      tone: health?.color ?? colors.textMuted,
      value: health === null ? '—' : health.daysRemaining > 0 ? `${health.daysRemaining}d` : health.label,
      strikethrough: health?.status === 'expired',
    },
    {
      helper: `${confirmedPayments.length} confirmed payments`,
      icon: 'dollar-sign' as const,
      iconBackground: '#E9F0EC',
      label: 'Total Paid',
      tone: colors.primary,
      value: `UGX ${totalPaid.toLocaleString()}`,
    },
    {
      helper: `${messages.length} total`,
      icon: 'message-square' as const,
      iconBackground: '#EFE8E0',
      label: 'Messages',
      tone: unreadMessages > 0 ? colors.accent : colors.textPrimary,
      value: String(unreadMessages),
    },
  ];

  const jumpToTab = (tabName: string) => {
    navigation.navigate(tabName as never);
  };

  if (!user) {
    return (
      <ScrollableScreenContainer>
        <EmptyState
          description="Sign in as a tenant to view your tenancy and rent activity."
          title="Tenant dashboard unavailable"
        />
      </ScrollableScreenContainer>
    );
  }

  if (dashboardQuery.isLoading) {
    return <LoadingState message="Loading your tenant dashboard" />;
  }

  if (dashboardQuery.isError) {
    return (
      <ScrollableScreenContainer>
        <ErrorState
          description={
            dashboardQuery.error instanceof Error
              ? dashboardQuery.error.message
              : 'Please try again.'
          }
          onRetry={() => {
            void dashboardQuery.refetch();
          }}
          title="Could not load tenant dashboard"
        />
      </ScrollableScreenContainer>
    );
  }

  const handleUpload = async () => {
    if (!activeTenancy) {
      setBlockedAction('upload');
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
        notes: buildTenantPaymentProofNote(note || null, proofUrl),
        period_end: activeTenancy.rent_end_date,
        period_start: activeTenancy.rent_start_date,
        proof_url: proofUrl,
        status: 'uploaded',
        tenancy_id: activeTenancy.id,
        tenant_id: user.id,
      });

      setNote('');
      await dashboardQuery.refetch();
      Alert.alert('Payment submitted', 'Your proof has been sent to the house manager for review.');
    } catch (error) {
      Alert.alert('Upload failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayOnline = async () => {
    if (!activeTenancy) {
      setBlockedAction('pay');
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

      if (response?.success && response?.redirect_url) {
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
        await dashboardQuery.refetch();
      } else {
        Alert.alert(
          'Payment unavailable',
          response?.error || 'The payment gateway could not start this transaction.',
        );
      }
    } catch (error) {
      Alert.alert('Payment error', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNylonPayPayment = async () => {
    if (!activeTenancy) {
      setBlockedAction('pay');
      return;
    }

    const phone = npayPhone.trim();
    if (!phone) {
      Alert.alert('Phone number required', 'Enter your MTN or Airtel phone number to pay via mobile money.');
      return;
    }

    try {
      setNpaySending(true);
      setNpayMessage(null);
      const nameParts = (profile?.full_name || 'Tenant').trim().split(' ');
      const response = await initiateNylonPay({
        amount: activeTenancy.rent_amount,
        description: `Rent payment for ${activeTenancy.property_title || 'Property'}`,
        email: user.email,
        firstName: nameParts[0] || 'Tenant',
        lastName: nameParts.slice(1).join(' '),
        paymentId: `pay-${activeTenancy.id}-${Date.now()}`,
        phoneNumber: phone,
      });

      if (response.success) {
        setNpayMessage(
          response.message || 'Check your phone for the payment prompt. Enter your PIN to confirm.',
        );
      } else {
        Alert.alert(
          'Payment initiation failed',
          response.message || 'Please try again.',
        );
      }
    } catch (error) {
      Alert.alert('Payment error', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setNpaySending(false);
    }
  };

  const handleAgreementUpload = async () => {
    if (!activeTenancy) {
      Alert.alert('No active tenancy', 'You need an active tenancy before uploading an agreement.');
      return;
    }

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
      await uploadTenancyAgreement(activeTenancy.id, {
        mimeType: asset.mimeType,
        name: asset.name,
        uri: asset.uri,
      });
      await dashboardQuery.refetch();
      Alert.alert('Agreement uploaded', 'Your house manager can now review and consent.');
    } catch (error) {
      Alert.alert('Upload failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setAgreementBusy(null);
    }
  };

  const handleAgreementConsent = async () => {
    if (!activeTenancy) {
      Alert.alert('No active tenancy', 'You need an active tenancy before consenting.');
      return;
    }

    try {
      setAgreementBusy('consent');
      await consentToAgreement(activeTenancy.id);
      await dashboardQuery.refetch();
      Alert.alert('Consent recorded', 'Your agreement consent has been timestamped.');
    } catch (error) {
      Alert.alert('Consent failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setAgreementBusy(null);
    }
  };

  const blockedActionCopy =
    blockedAction === 'upload'
      ? {
          description:
            'Link an active tenancy first so you can upload payment proof for the correct property and manager.',
          title: 'No active tenancy yet',
        }
      : {
          description:
            'Online rent payments are available once you have an active tenancy linked to your account.',
          title: 'No active tenancy yet',
        };

  return (
    <ScrollableScreenContainer
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          onRefresh={() => {
            void dashboardQuery.refetch();
          }}
          refreshing={dashboardQuery.isRefetching}
          tintColor={colors.primary}
        />
      }
    >
      <SegmentedControl
        onChange={setSelectedView}
        options={[
          { label: 'Overview', value: 'overview' },
          { label: 'Payments', value: 'payments' },
        ]}
        value={selectedView}
        variant="pills"
      />

      {selectedView === 'overview' ? (
        <>
          {isRentOverdue ? (
            <View style={[styles.alertCard, styles.alertDanger]}>
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>Your Rent Is Overdue</Text>
                <Text style={styles.alertText}>
                  Your current rent period ended on{' '}
                  {activeTenancy ? formatDateLabel(activeTenancy.rent_end_date) : 'the due date'}.
                </Text>
              </View>
              <Button onPress={handleUpload} variant="destructive">
                Upload Proof
              </Button>
            </View>
          ) : null}

          {isRentDueSoon ? (
            <View style={[styles.alertCard, styles.alertWarning]}>
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>
                  Rent Due in {health?.daysRemaining} Day{health?.daysRemaining === 1 ? '' : 's'}
                </Text>
                <Text style={styles.alertText}>
                  UGX {activeTenancy?.rent_amount.toLocaleString()} due on{' '}
                  {activeTenancy ? formatDateLabel(activeTenancy.rent_end_date) : 'your due date'}.
                </Text>
              </View>
              <View style={styles.alertActions}>
                <Button onPress={handlePayOnline} variant="outline">
                  Pay Online
                </Button>
                <Button onPress={handleUpload}>Upload Proof</Button>
              </View>
            </View>
          ) : null}

          {unreadMessages > 0 ? (
            <Pressable onPress={() => jumpToTab('Messages')} style={styles.unreadBanner}>
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>
                  {unreadMessages} unread message{unreadMessages === 1 ? '' : 's'}
                </Text>
                <Text style={styles.alertText}>Open Messages to view the latest updates.</Text>
              </View>
              <Text style={styles.bannerLink}>Open</Text>
            </Pressable>
          ) : null}

          <View style={styles.statsGrid}>
            {stats.map((stat) => (
              <View key={stat.label} style={styles.statCard}>
                <View style={[styles.iconBadge, { backgroundColor: stat.iconBackground }]}>
                  <Feather color={stat.tone} name={stat.icon} size={22} />
                </View>
                <Text
                  style={[
                    styles.statValue,
                    { color: stat.tone },
                    stat.strikethrough && { textDecorationLine: 'line-through' },
                  ]}
                >
                  {stat.value}
                </Text>
                <Text style={styles.statHeading}>{stat.label}</Text>
                <Text style={styles.statLabel}>{stat.helper}</Text>
              </View>
            ))}
          </View>

          {health ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Tenancy Progress</Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${health.progressPercent}%`, backgroundColor: health.color },
                  ]}
                />
              </View>
              <View style={styles.progressLabels}>
                <Text style={styles.progressText}>{health.progressPercent}% of tenancy period elapsed</Text>
                <Text
                  style={[
                    styles.progressDays,
                    { color: health.color },
                    health.status === 'expired' && { textDecorationLine: 'line-through' },
                  ]}
                >
                  {health.daysRemaining > 0 ? `${health.daysRemaining} days left` : health.label}
                </Text>
              </View>
            </View>
          ) : null}

          {activeTenancy ? (
            <View style={styles.card}>
              <View style={styles.sectionHeading}>
                <View style={[styles.iconBadge, styles.sectionIconBadge]}>
                  <Feather color={colors.primary} name="home" size={22} />
                </View>
                <Text style={styles.cardTitle}>Current Tenancy</Text>
              </View>
              <Text style={styles.propertyName}>
                {activeTenancy.property_title || 'Your Property'}
              </Text>
              <Text style={styles.cardText}>
                Manager: {activeTenancy.manager_name || 'House Manager'}
              </Text>
              {activeTenancy.manager_phone ? (
                <Text style={styles.cardText}>Phone: {activeTenancy.manager_phone}</Text>
              ) : null}
              <Text style={styles.cardText}>Rent: {formatUGXFull(activeTenancy.rent_amount)}</Text>
              <Text style={styles.cardText}>
                Ends: {formatDateLabel(activeTenancy.rent_end_date)}
              </Text>
              <View style={styles.badgeRow}>
                <Badge
                  textDecorationLine={
                    health?.status === 'expired' ? 'line-through' : undefined
                  }
                  tone={
                    health?.status === 'expired'
                      ? 'default'
                      : health?.status === 'overdue' || health?.status === 'attention'
                        ? 'warning'
                        : 'success'
                  }
                >
                  {health?.daysRemaining !== undefined && health.daysRemaining > 0
                    ? `${health.daysRemaining} days remaining`
                    : health?.label ?? 'Active'}
                </Badge>
                <Badge tone="primary">{activeTenancy.rent_period}</Badge>
              </View>
              <View style={styles.agreementPanel}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.propertyName}>Agreement Consent</Text>
                  <Badge tone={tenantConsented ? 'success' : 'warning'}>
                    {tenantConsented ? 'Consented' : 'Pending'}
                  </Badge>
                </View>
                <View style={styles.consentRow}>
                  <Text style={styles.cardText}>House manager</Text>
                  <Badge tone={managerConsented ? 'success' : 'warning'}>
                    {managerConsented ? 'Consented' : 'Pending'}
                  </Badge>
                </View>
                <Text style={styles.cardText}>
                  {agreementState?.current_document
                    ? `Current file: ${agreementState.current_document.file_name}`
                    : 'No agreement uploaded yet.'}
                </Text>
                <View style={styles.historyActions}>
                  <Button
                    disabled={agreementBusy !== null}
                    onPress={handleAgreementUpload}
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
                    disabled={agreementBusy !== null || !agreementState?.current_document || tenantConsented}
                    onPress={handleAgreementConsent}
                  >
                    {agreementBusy === 'consent' ? 'Recording...' : 'I Consent'}
                  </Button>
                </View>
              </View>
              {activeTenancy.manager_phone ? (
                <Button
                  onPress={async () => {
                    await Linking.openURL(`tel:${activeTenancy.manager_phone}`);
                  }}
                  variant="outline"
                >
                  Call Manager
                </Button>
              ) : null}
              <Button
                onPress={async () => {
                  try {
                    await requestRenewal(activeTenancy.id);
                    Alert.alert('Request sent', 'Your house manager will review the renewal request.');
                  } catch (error) {
                    Alert.alert('Could not send request', error instanceof Error ? error.message : 'Please try again.');
                  }
                }}
                variant="secondary"
              >
                Request Renewal
              </Button>
            </View>
          ) : (
            <View style={styles.card}>
              <View style={styles.sectionHeading}>
                <View style={[styles.iconBadge, styles.sectionIconBadge]}>
                  <Feather color={colors.primary} name="home" size={22} />
                </View>
                <Text style={styles.cardTitle}>Current Tenancy</Text>
              </View>
              <EmptyState
                description="You are not currently linked to any property."
                title="No active tenancy"
              />
              <Button onPress={() => jumpToTab('Explore')}>Find a Home</Button>
            </View>
          )}

          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.sectionHeading}>
                <View style={[styles.iconBadge, styles.paymentsIconBadge]}>
                  <Feather color={colors.error} name="dollar-sign" size={22} />
                </View>
                <Text style={styles.cardTitle}>Recent Payments</Text>
              </View>
              <Pressable onPress={() => jumpToTab('Payments')}>
                <Text style={styles.linkText}>All</Text>
              </Pressable>
            </View>
            {payments.length === 0 ? (
              <EmptyState
                description="Payment records will appear here after your first payment."
                title="No payments yet"
              />
            ) : (
              payments.slice(0, 4).map((payment) => (
                <View key={payment.id} style={styles.paymentRow}>
                  <View style={styles.paymentText}>
                    <Text style={styles.propertyName}>{formatUGXFull(payment.amount)}</Text>
                    <Text style={styles.cardText}>{formatDateLabel(payment.created_at)}</Text>
                    <Text style={styles.cardText}>{payment.notes || 'No notes provided'}</Text>
                  </View>
                  <Badge
                    tone={
                      payment.status === 'confirmed'
                        ? 'success'
                        : payment.status === 'rejected'
                          ? 'warning'
                          : 'default'
                    }
                  >
                    {payment.status}
                  </Badge>
                </View>
              ))
            )}
          </View>
        </>
      ) : (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Payment History</Text>
            <Text style={styles.cardText}>
              {confirmedPayments.length} confirmed • UGX {totalPaid.toLocaleString()} paid
            </Text>
          </View>
          <View style={styles.historyActions}>
            <Button onPress={() => jumpToTab('Payments')} variant="secondary">
              Payment Centre
            </Button>
            <Button disabled={submitting} onPress={handlePayOnline} variant="outline">
              Pay Online
            </Button>
            <Button disabled={submitting} onPress={handleUpload}>
              Upload Proof
            </Button>
          </View>
          {payments.length === 0 ? (
            <Text style={styles.cardText}>No payment records yet.</Text>
          ) : (
            payments.map((payment) => (
              <View key={payment.id} style={styles.paymentRow}>
                <View style={styles.paymentText}>
                  <Text style={styles.propertyName}>{formatUGXFull(payment.amount)}</Text>
                  <Text style={styles.cardText}>{formatDateLabel(payment.created_at)}</Text>
                  <Text style={styles.cardText}>{payment.notes || 'No notes provided'}</Text>
                </View>
                <Badge
                  tone={
                    payment.status === 'confirmed'
                      ? 'success'
                      : payment.status === 'rejected'
                        ? 'warning'
                        : 'default'
                  }
                >
                  {payment.status}
                </Badge>
              </View>
            ))
          )}
        </View>
      )}

      <Modal
        animationType="fade"
        onRequestClose={() => setBlockedAction(null)}
        transparent
        visible={blockedAction !== null}
      >
        <Pressable onPress={() => setBlockedAction(null)} style={styles.modalBackdrop}>
          <Pressable onPress={() => {}} style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <View style={styles.modalIconBadge}>
                <Feather color={colors.primary} name="home" size={24} />
              </View>
              <Text style={styles.modalEyebrow}>Tenant Access</Text>
            </View>

            <Text style={styles.modalTitle}>{blockedActionCopy.title}</Text>
            <Text style={styles.modalDescription}>{blockedActionCopy.description}</Text>

            <View style={styles.modalActions}>
              <Button
                onPress={() => {
                  setBlockedAction(null);
                  jumpToTab('Explore');
                }}
              >
                Browse Homes
              </Button>
              <Button onPress={() => setBlockedAction(null)} variant="outline">
                Not Now
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.sectionHeading}>
            <View style={[styles.iconBadge, styles.npayIconBadge]}>
              <Feather color={colors.accent} name="smartphone" size={22} />
            </View>
            <Text style={styles.cardTitle}>Pay via Mobile Money</Text>
          </View>
        </View>
        {activeTenancy ? (
          <>
            <View style={styles.npayAmountRow}>
              <Text style={styles.npayAmountLabel}>Amount Due</Text>
              <Text style={styles.npayAmountValue}>
                UGX {activeTenancy.rent_amount.toLocaleString()}
              </Text>
            </View>
            <Text style={styles.npayInputLabel}>Phone Number (MTN / Airtel)</Text>
            <TextInput
              keyboardType="phone-pad"
              onChangeText={(value) => {
                setNpayPhone(value);
                setNpayMessage(null);
              }}
              placeholder="e.g. 2567XXXXXXXX"
              placeholderTextColor={colors.textMuted}
              style={styles.npayInput}
              value={npayPhone}
            />
            <Button
              disabled={npaySending || !npayPhone.trim()}
              onPress={handleNylonPayPayment}
            >
              {npaySending ? 'Sending...' : 'Pay Now'}
            </Button>
            {npayMessage ? (
              <View style={styles.npaySuccessBox}>
                <Feather color={colors.success} name="check-circle" size={18} />
                <Text style={styles.npaySuccessText}>{npayMessage}</Text>
              </View>
            ) : null}
          </>
        ) : (
          <Text style={styles.cardText}>
            Link an active tenancy to pay via mobile money.
          </Text>
        )}
      </View>
    </ScrollableScreenContainer>
  );
}

const styles = StyleSheet.create({
  alertActions: {
    gap: spacing.sm,
  },
  alertCard: {
    borderRadius: radii.card,
    gap: spacing.md,
    padding: spacing.md,
  },
  alertContent: {
    flex: 1,
    gap: 4,
  },
  alertDanger: {
    backgroundColor: dashboardPalette.alertDangerBackground,
    borderColor: dashboardPalette.alertDangerBorder,
    borderWidth: 1,
  },
  alertText: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 22,
  },
  alertTitle: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 15,
  },
  alertWarning: {
    backgroundColor: dashboardPalette.alertWarningBackground,
    borderColor: dashboardPalette.alertWarningBorder,
    borderWidth: 1,
  },
  agreementPanel: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bannerLink: {
    color: colors.primary,
    fontFamily: typography.bodyStrong,
    fontSize: 14,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  cardHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  cardText: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 22,
  },
  content: {
    gap: spacing.lg,
  },
  consentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  historyActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  iconBadge: {
    alignItems: 'center',
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  linkText: {
    color: colors.primary,
    fontFamily: typography.bodyStrong,
    fontSize: 14,
  },
  modalActions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: colors.overlay,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    ...shadows.floating,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.modal,
    borderWidth: 1,
    gap: spacing.sm,
    maxWidth: 420,
    padding: spacing.xl,
    width: '100%',
  },
  modalDescription: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 24,
  },
  modalEyebrow: {
    color: colors.primary,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  modalIconBadge: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  modalIconWrap: {
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 26,
  },
  paymentRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    paddingTop: spacing.sm,
  },
  paymentText: {
    flex: 1,
    gap: 3,
  },
  paymentsIconBadge: {
    backgroundColor: dashboardPalette.paymentsIconBackground,
  },
  propertyName: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 15,
  },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sectionIconBadge: {
    backgroundColor: dashboardPalette.sectionIconBackground,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    flexBasis: '48%',
    gap: 6,
    padding: spacing.md,
  },
  statHeading: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 14,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  unreadBanner: {
    alignItems: 'center',
    backgroundColor: dashboardPalette.unreadBannerBackground,
    borderColor: dashboardPalette.unreadBannerBorder,
    borderRadius: radii.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  progressTrack: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 6,
    height: 10,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  progressFill: {
    borderRadius: 6,
    height: '100%',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  progressText: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 12,
  },
  progressDays: {
    fontFamily: typography.bodyStrong,
    fontSize: 12,
  },
  npayAmountRow: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.input,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  npayAmountLabel: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
  },
  npayAmountValue: {
    color: colors.primary,
    fontFamily: typography.display,
    fontSize: 22,
  },
  npayIconBadge: {
    backgroundColor: '#F4EBD9',
  },
  npayInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.input,
    borderWidth: 1,
    color: colors.textPrimary,
    fontFamily: typography.body,
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  npayInputLabel: {
    color: colors.textSecondary,
    fontFamily: typography.bodyStrong,
    fontSize: 13,
  },
  npaySuccessBox: {
    alignItems: 'center',
    backgroundColor: '#EEF6F1',
    borderColor: '#C8DED1',
    borderRadius: radii.input,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  npaySuccessText: {
    color: colors.textPrimary,
    flex: 1,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 22,
  },
});
