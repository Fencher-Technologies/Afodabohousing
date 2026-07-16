import type { StackScreenProps } from '@react-navigation/stack';
import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/button';
import { InputField } from '../components/input-field';
import { Screen } from '../components/screen';
import { signInWithPassword } from '../services/auth';
import logoImage from '../../assets/brand/logo.png';
import { colors, radii, spacing, typography } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

export function LoginScreen({ navigation }: StackScreenProps<RootStackParamList, 'Login'>) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const runLogin = async (nextEmail: string, nextPassword: string) => {
    try {
      setLoading(true);
      await signInWithPassword(nextEmail, nextPassword);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } catch (error) {
      Alert.alert('Login failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.brandCard}>
        <Image source={logoImage} style={styles.logo} />
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to continue with Afodabo Housing.</Text>
      </View>

      <View style={styles.formCard}>
        <InputField
          autoCapitalize="none"
          keyboardType="email-address"
          label="Email address"
          onChangeText={setEmail}
          placeholder="you@example.com"
          value={email}
        />
        <InputField
          autoCapitalize="none"
          label="Password"
          onChangeText={setPassword}
          placeholder="Your password"
          secureTextEntry
          value={password}
        />
        <Button disabled={loading || !email || !password} onPress={() => runLogin(email, password)}>
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>
        <Button onPress={() => navigation.navigate('Register')} variant="outline">
          Create an Account
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
  logo: {
    borderRadius: 24,
    height: 72,
    width: 72,
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
    fontSize: 32,
  },
});
