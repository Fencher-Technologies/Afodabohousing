import type { StackScreenProps } from '@react-navigation/stack';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../components/button';
import { ErrorState } from '../components/error-state';
import { LoadingState } from '../components/loading-state';
import { ScrollableScreenContainer } from '../components/scrollable-screen-container';
import { useAuth } from '../context/auth-context';
import { useManagerProperty } from '../hooks/manager/use-manager-properties';
import { getBoostPriceOptions, initiateBoost } from '../services/boosts';
import { colors, radii, spacing, typography } from '../theme/tokens';
import { formatUGX } from '../utils/format';
import type { RootStackParamList } from '../navigation/types';

export function BoostPropertyScreen({
  route,
}: StackScreenProps<RootStackParamList, 'BoostProperty'>) {
  const { user } = useAuth();
  const propertyQuery = useManagerProperty(user?.id, route.params.propertyId);
  const [selectedDuration, setSelectedDuration] = useState<number>(7);
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const priceOptions = getBoostPriceOptions();
  const selectedPrice = priceOptions.find((p) => p.duration_days === selectedDuration);

  if (!user) {
    return (
      <ScrollableScreenContainer>
        <Text style={styles.body}>Sign in as a house manager to boost a listing.</Text>
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
          onRetry={() => void propertyQuery.refetch()}
          title="Could not load property"
        />
      </ScrollableScreenContainer>
    );
  }

  const property = propertyQuery.property;

  if (!property) {
    return (
      <ScrollableScreenContainer>
        <Text style={styles.body}>This property could not be found.</Text>
      </ScrollableScreenContainer>
    );
  }

  const propertyId = property.id;
  const propertyTitle = property.title;

  async function handleBoost() {
    const phoneClean = phone.trim();
    if (!phoneClean) {
      Alert.alert('Phone number required', 'Enter your MTN or Airtel phone number to pay via mobile money.');
      return;
    }

    try {
      setSending(true);
      const response = await initiateBoost({
        duration_days: selectedDuration,
        phone_number: phoneClean,
        property_id: propertyId,
      });

      Alert.alert(
        'Payment prompt sent',
        response.message || 'Check your phone for the payment prompt. Enter your PIN to confirm.',
      );
    } catch (error) {
      Alert.alert('Boost failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <ScrollableScreenContainer contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Boost Listing</Text>
        <Text style={styles.subtitle}>
          Promote <Text style={styles.strong}>{propertyTitle}</Text> to the top of search results.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Duration</Text>
        <View style={styles.durationRow}>
          {priceOptions.map((opt) => (
            <Pressable
              key={opt.duration_days}
              onPress={() => setSelectedDuration(opt.duration_days)}
              style={[
                styles.durationCard,
                selectedDuration === opt.duration_days && styles.durationCardSelected,
              ]}
            >
              <Text
                style={[
                  styles.durationDays,
                  selectedDuration === opt.duration_days && styles.durationDaysSelected,
                ]}
              >
                {opt.label}
              </Text>
              <Text
                style={[
                  styles.durationPrice,
                  selectedDuration === opt.duration_days && styles.durationPriceSelected,
                ]}
              >
                {opt.priceLabel}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Mobile Money Number</Text>
        <Text style={styles.body}>
          You will pay {selectedPrice ? formatUGX(selectedPrice.amount) : ''} via MTN or Airtel
          mobile money.
        </Text>
        <TextInput
          keyboardType="phone-pad"
          onChangeText={setPhone}
          placeholder="e.g. 256701234567"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          value={phone}
        />
      </View>

      <Button
        disabled={sending || !phone.trim()}
        onPress={handleBoost}
      >
        {sending ? 'Sending...' : `Pay ${selectedPrice ? formatUGX(selectedPrice.amount) : ''}`}
      </Button>
    </ScrollableScreenContainer>
  );
}

const styles = StyleSheet.create({
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
    paddingBottom: spacing.xl,
  },
  durationCard: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: spacing.md,
  },
  durationCardSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  durationDays: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 16,
  },
  durationDaysSelected: {
    color: colors.primary,
  },
  durationPrice: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
  },
  durationPriceSelected: {
    color: colors.primary,
  },
  durationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.input,
    borderWidth: 1,
    color: colors.textPrimary,
    fontFamily: typography.body,
    fontSize: 16,
    padding: spacing.md,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 22,
  },
  strong: {
    fontFamily: typography.bodyStrong,
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 22,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 26,
  },
});
