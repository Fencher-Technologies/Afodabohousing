import type { StackScreenProps } from '@react-navigation/stack';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BrandMark } from '../../components/common/BrandMark';
import { Button } from '../../components/common/Button';
import { KeyboardAwareScreen } from '../../components/common/KeyboardAwareScreen';
import { FormError } from '../../components/forms/FormError';
import { PasswordInput } from '../../components/forms/PasswordInput';
import { RoleSelector } from '../../components/forms/RoleSelector';
import { TextInputField } from '../../components/forms/TextInputField';
import { useAuth } from '../../context/AuthContext';
import { registerUser, type RegisterableRole } from '../../services/auth.service';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import type { AuthStackParamList } from '../../types/navigation.types';

export function RegisterScreen({ navigation }: StackScreenProps<AuthStackParamList, 'Register'>) {
  const { refresh } = useAuth();
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<RegisterableRole>('tenant');

  const passwordError =
    password && password.length < 6 ? 'Use at least 6 characters for your password.' : '';
  const confirmPasswordError =
    confirmPassword && password !== confirmPassword ? 'Passwords do not match.' : '';

  const handleRegister = async () => {
    setFormError('');

    const normalizedEmail = email.trim();
    const normalizedFullName = fullName.trim();
    const normalizedPhone = phone.trim();

    console.info('[auth-debug] RegisterScreen selected role', {
      email: normalizedEmail,
      fullNameProvided: Boolean(normalizedFullName),
      phoneProvided: Boolean(normalizedPhone),
      role,
    });

    if (!normalizedFullName || !normalizedEmail || !password) {
      setFormError('Enter your name, email address, and password to create an account.');
      return;
    }

    if (password.length < 6) {
      setFormError('Use at least 6 characters for your password.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Please make sure both password fields match.');
      return;
    }

    try {
      setLoading(true);
      await registerUser({
        email: normalizedEmail,
        fullName: normalizedFullName,
        password,
        phone: normalizedPhone,
        role,
      });
      await refresh();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Could not create your account. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAwareScreen>
      <View style={styles.hero}>
        <View style={styles.brandPanel}>
          <BrandMark />
        </View>
        <Text style={styles.eyebrow}>Afodabo Housing</Text>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Set up mobile access.</Text>
        <View style={styles.accentRow}>
          <View style={styles.greenLine} />
          <View style={styles.goldDot} />
          <View style={styles.terracottaDot} />
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.roleBlock}>
          <Text style={styles.label}>Account type</Text>
          <RoleSelector onChange={setRole} value={role} />
        </View>

        <TextInputField
          autoComplete="name"
          label="Full name"
          onChangeText={setFullName}
          placeholder="John Mukasa"
          returnKeyType="next"
          textContentType="name"
          value={fullName}
        />
        <TextInputField
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          label="Email address"
          onChangeText={setEmail}
          placeholder="you@example.com"
          returnKeyType="next"
          textContentType="emailAddress"
          value={email}
        />
        <TextInputField
          autoComplete="tel"
          keyboardType="phone-pad"
          label="Phone number"
          onChangeText={setPhone}
          placeholder="+256 700 000000"
          returnKeyType="next"
          textContentType="telephoneNumber"
          value={phone}
        />
        <PasswordInput
          autoComplete="new-password"
          error={passwordError}
          helperText="Minimum 6 characters."
          label="Password"
          onChangeText={setPassword}
          placeholder="Create a password"
          returnKeyType="next"
          textContentType="newPassword"
          value={password}
        />
        <PasswordInput
          autoComplete="new-password"
          error={confirmPasswordError}
          label="Confirm password"
          onChangeText={setConfirmPassword}
          placeholder="Repeat your password"
          returnKeyType="done"
          textContentType="newPassword"
          value={confirmPassword}
        />
        <FormError message={formError} />
        <Button
          disabled={Boolean(passwordError || confirmPasswordError)}
          loading={loading}
          onPress={handleRegister}
        >
          Create Account
        </Button>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already registered?</Text>
        <Button disabled={loading} onPress={() => navigation.navigate('Login')} variant="ghost">
          Sign In
        </Button>
      </View>
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  eyebrow: {
    color: colors.accent,
    fontFamily: typography.bodyStrong,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  footer: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerText: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
  },
  hero: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.modal,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  brandPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.card,
    borderWidth: 1,
    padding: spacing.md,
  },
  accentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  goldDot: {
    backgroundColor: colors.gold,
    borderRadius: radii.pill,
    height: 8,
    width: 8,
  },
  greenLine: {
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    height: 4,
    width: 48,
  },
  terracottaDot: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    height: 8,
    width: 8,
  },
  label: {
    color: colors.textPrimary,
    fontFamily: typography.bodyStrong,
    fontSize: 13,
  },
  roleBlock: {
    gap: spacing.xs,
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 21,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.displayStrong,
    fontSize: 32,
    lineHeight: 38,
  },
});
