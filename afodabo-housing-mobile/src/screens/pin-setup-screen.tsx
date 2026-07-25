import type { StackScreenProps } from '@react-navigation/stack';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../components/button';
import { Screen } from '../components/screen';
import type { RootStackParamList } from '../navigation/types';
import { registerWithPhone } from '../services/auth';
import { colors, radii, spacing, typography } from '../theme/tokens';

export function PinSetupScreen({
  navigation,
  route,
}: StackScreenProps<RootStackParamList, 'PinSetup'>) {
  const { phone, verifyToken } = route.params;
  const [fullName, setFullName] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim()) {
      Alert.alert('Name required', 'Please enter your full name.');
      return;
    }
    if (pin.length < 4 || pin.length > 6) {
      Alert.alert('Invalid PIN', 'PIN must be 4-6 digits.');
      return;
    }
    if (pin !== confirmPin) {
      Alert.alert('PIN mismatch', 'PINs do not match.');
      return;
    }
    try {
      setLoading(true);
      await registerWithPhone(phone, verifyToken, fullName.trim(), pin);
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.brandCard}>
        <Text style={styles.title}>Set up your account</Text>
        <Text style={styles.subtitle}>Choose a 4-6 digit PIN to secure your account.</Text>
      </View>

      <View style={styles.formCard}>
        <TextInput
          autoCapitalize="words"
          onChangeText={setFullName}
          placeholder="Full name"
          style={styles.textInput}
          value={fullName}
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
        <TextInput
          keyboardType="number-pad"
          maxLength={6}
          onChangeText={setConfirmPin}
          placeholder="Confirm PIN"
          secureTextEntry
          style={styles.pinInput}
          value={confirmPin}
        />
        <Button disabled={loading || !fullName || !pin || !confirmPin} onPress={handleRegister}>
          {loading ? 'Creating account...' : 'Create Account'}
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
    fontSize: 24,
    textAlign: 'center',
  },
});
