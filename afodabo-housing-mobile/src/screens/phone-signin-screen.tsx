import type { StackScreenProps } from '@react-navigation/stack';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../components/button';
import { Screen } from '../components/screen';
import type { RootStackParamList } from '../navigation/types';
import { signInWithPhone } from '../services/auth';
import { colors, radii, spacing, typography } from '../theme/tokens';

export function PhoneSignInScreen({
  navigation,
}: StackScreenProps<RootStackParamList, 'PhoneSignIn'>) {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (phone.length < 6) {
      Alert.alert('Invalid number', 'Please enter your phone number.');
      return;
    }
    if (pin.length < 4) {
      Alert.alert('Invalid PIN', 'Please enter your 4-6 digit PIN.');
      return;
    }
    try {
      setLoading(true);
      await signInWithPhone(phone, pin);
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (error) {
      Alert.alert('Sign in failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.brandCard}>
        <Text style={styles.title}>Sign in with phone</Text>
        <Text style={styles.subtitle}>Enter your phone number and PIN.</Text>
      </View>

      <View style={styles.formCard}>
        <TextInput
          keyboardType="phone-pad"
          onChangeText={setPhone}
          placeholder="+256 700 123 456"
          style={styles.textInput}
          value={phone}
        />
        <TextInput
          keyboardType="number-pad"
          maxLength={6}
          onChangeText={setPin}
          placeholder="Enter PIN"
          secureTextEntry
          style={styles.pinInput}
          value={pin}
        />
        <Button disabled={loading || !phone || !pin} onPress={handleSignIn}>
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>
        <Button onPress={() => navigation.navigate('PhoneAuth')} variant="ghost">
          Register with a new phone number
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
  pinInput: {
    borderColor: colors.border,
    borderRadius: radii.input,
    borderWidth: 1,
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 28,
    height: 56,
    letterSpacing: 8,
    paddingHorizontal: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 15,
    textAlign: 'center',
  },
  textInput: {
    borderColor: colors.border,
    borderRadius: radii.input,
    borderWidth: 1,
    color: colors.textPrimary,
    fontFamily: typography.body,
    fontSize: 16,
    height: 48,
    paddingHorizontal: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 28,
    textAlign: 'center',
  },
});
