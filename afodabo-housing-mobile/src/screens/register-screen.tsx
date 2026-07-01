import type { StackScreenProps } from '@react-navigation/stack';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/button';
import { InputField } from '../components/input-field';
import { Screen } from '../components/screen';
import { SegmentedControl } from '../components/segmented-control';
import { registerUser } from '../services/auth';
import { colors, radii, spacing, typography } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

type RoleChoice = 'tenant' | 'house_manager';

export function RegisterScreen({ navigation }: StackScreenProps<RootStackParamList, 'Register'>) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<RoleChoice>('tenant');
  const [loading, setLoading] = useState(false);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>
          Join Afodabo Housing to start renting or managing homes with confidence.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Choose your role</Text>
        <SegmentedControl
          onChange={setRole}
          options={[
            { label: 'Tenant', value: 'tenant' },
            { label: 'House Manager', value: 'house_manager' },
          ]}
          value={role}
        />
        <Text style={styles.helperText}>
          {role === 'tenant'
            ? 'Browse homes, track rent, upload payment proof, and message your manager.'
            : 'List properties, manage tenancies, review payments, and reply to tenants.'}
        </Text>
      </View>

      <View style={styles.card}>
        <InputField
          label="Full name"
          onChangeText={setFullName}
          placeholder="John Mukasa"
          value={fullName}
        />
        <InputField
          autoCapitalize="none"
          keyboardType="email-address"
          label="Email address"
          onChangeText={setEmail}
          placeholder="you@example.com"
          value={email}
        />
        <InputField
          keyboardType="phone-pad"
          label="Phone number"
          onChangeText={setPhone}
          placeholder="+256 700 000000"
          value={phone}
        />
        <InputField
          autoCapitalize="none"
          label="Password"
          onChangeText={setPassword}
          placeholder="Minimum 6 characters"
          secureTextEntry
          value={password}
        />
        <InputField
          autoCapitalize="none"
          label="Confirm password"
          onChangeText={setConfirmPassword}
          placeholder="Repeat your password"
          secureTextEntry
          value={confirmPassword}
        />
        <Button
          disabled={loading}
          onPress={async () => {
            if (password.length < 6) {
              Alert.alert('Password too short', 'Please use at least 6 characters.');
              return;
            }

            if (password !== confirmPassword) {
              Alert.alert(
                'Passwords do not match',
                'Please make sure both password fields are identical.',
              );
              return;
            }

            try {
              setLoading(true);
              await registerUser({
                email,
                fullName,
                password,
                phone,
                role,
              });
              navigation.popToTop();
            } catch (error) {
              Alert.alert(
                'Could not create account',
                error instanceof Error ? error.message : 'Please try again.',
              );
            } finally {
              setLoading(false);
            }
          }}
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </Button>
        <Button onPress={() => navigation.navigate('Login')} variant="outline">
          Already have an account
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  header: {
    gap: spacing.sm,
  },
  helperText: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 22,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 22,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 15,
    lineHeight: 24,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 32,
  },
});
