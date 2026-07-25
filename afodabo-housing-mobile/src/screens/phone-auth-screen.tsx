import type { StackScreenProps } from '@react-navigation/stack';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/button';
import { InputField } from '../components/input-field';
import { Screen } from '../components/screen';
import type { RootStackParamList } from '../navigation/types';
import { sendOtp } from '../services/auth';
import { colors, radii, spacing, typography } from '../theme/tokens';

export function PhoneAuthScreen({ navigation }: StackScreenProps<RootStackParamList, 'PhoneAuth'>) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    const cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.length < 9) {
      Alert.alert('Invalid number', 'Please enter a valid phone number.');
      return;
    }
    try {
      setLoading(true);
      await sendOtp(phone);
      navigation.navigate('OtpVerification', { phone });
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to send code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.brandCard}>
        <Text style={styles.title}>Enter your phone number</Text>
        <Text style={styles.subtitle}>We'll send you a verification code.</Text>
      </View>

      <View style={styles.formCard}>
        <InputField
          keyboardType="phone-pad"
          label="Phone number"
          onChangeText={setPhone}
          placeholder="+256 700 123 456"
          value={phone}
        />
        <Button disabled={loading || phone.length < 6} onPress={handleSendOtp}>
          {loading ? 'Sending...' : 'Send Verification Code'}
        </Button>
        <Button onPress={() => navigation.navigate('Login')} variant="ghost">
          Sign in with email instead
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandCard: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 15,
    textAlign: 'center',
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 28,
    textAlign: 'center',
  },
});
