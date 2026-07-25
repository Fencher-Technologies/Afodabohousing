import type { StackScreenProps } from '@react-navigation/stack';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../components/button';
import { Screen } from '../components/screen';
import type { RootStackParamList } from '../navigation/types';
import { sendOtp, verifyOtp } from '../services/auth';
import { colors, radii, spacing, typography } from '../theme/tokens';

export function OtpVerificationScreen({
  navigation,
  route,
}: StackScreenProps<RootStackParamList, 'OtpVerification'>) {
  const { phone } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(30);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerify = async () => {
    if (code.length < 4) {
      Alert.alert('Incomplete', 'Please enter the verification code.');
      return;
    }
    try {
      setLoading(true);
      const result = await verifyOtp(phone, code);
      if (!result.valid || !result.verify_token) {
        Alert.alert('Invalid code', result.message);
        return;
      }
      navigation.replace('PinSetup', { phone, verifyToken: result.verify_token });
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      setCooldown(30);
      await sendOtp(phone);
      Alert.alert('Code sent', 'A new verification code has been sent.');
    } catch {
      setCooldown(0);
    }
  };

  return (
    <Screen>
      <View style={styles.brandCard}>
        <Text style={styles.title}>Enter verification code</Text>
        <Text style={styles.subtitle}>Sent to {phone}</Text>
      </View>

      <View style={styles.formCard}>
        <TextInput
          keyboardType="number-pad"
          maxLength={6}
          onChangeText={setCode}
          placeholder="000000"
          ref={inputRef}
          style={styles.codeInput}
          value={code}
        />
        <Button disabled={loading || code.length < 4} onPress={handleVerify}>
          {loading ? 'Verifying...' : 'Verify Code'}
        </Button>
        <Button disabled={cooldown > 0} onPress={handleResend} variant="ghost">
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
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
  codeInput: {
    borderColor: colors.border,
    borderRadius: radii.input,
    borderWidth: 1,
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 36,
    height: 64,
    letterSpacing: 12,
    paddingHorizontal: spacing.md,
    textAlign: 'center',
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
    fontSize: 24,
    textAlign: 'center',
  },
});
