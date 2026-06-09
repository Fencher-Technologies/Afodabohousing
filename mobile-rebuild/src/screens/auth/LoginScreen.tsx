import type { StackScreenProps } from '@react-navigation/stack';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BrandMark } from '../../components/common/BrandMark';
import { Button } from '../../components/common/Button';
import { KeyboardAwareScreen } from '../../components/common/KeyboardAwareScreen';
import { FormError } from '../../components/forms/FormError';
import { PasswordInput } from '../../components/forms/PasswordInput';
import { TextInputField } from '../../components/forms/TextInputField';
import { useAuth } from '../../context/AuthContext';
import { signInWithPassword } from '../../services/auth.service';
import { colors, radii, shadows, spacing, typography } from '../../theme';
import type { AuthStackParamList } from '../../types/navigation.types';

export function LoginScreen({
  navigation,
  onPreviewManager,
}: StackScreenProps<AuthStackParamList, 'Login'> & { onPreviewManager?: () => void }) {
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    setFormError('');

    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      setFormError('Enter your email address and password to continue.');
      return;
    }

    try {
      setLoading(true);
      await signInWithPassword(normalizedEmail, password);
      await refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not sign in. Please try again.');
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
        <Text style={styles.eyebrow}>Welcome Back</Text>
        <Text style={styles.title}>Sign in to continue</Text>
        <View style={styles.accentRow}>
          <View style={styles.greenLine} />
          <View style={styles.goldDot} />
          <View style={styles.terracottaDot} />
        </View>
      </View>

      <View style={styles.card}>
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
        <PasswordInput
          autoComplete="current-password"
          label="Password"
          onChangeText={setPassword}
          placeholder="Enter your password"
          returnKeyType="done"
          textContentType="password"
          value={password}
        />
        <FormError message={formError} />
        <Button loading={loading} onPress={handleLogin}>
          Sign In
        </Button>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>New to Afodabo Housing?</Text>
        <Button disabled={loading} onPress={() => navigation.navigate('Register')} variant="ghost">
          Create Account
        </Button>
        {onPreviewManager ? (
          <View style={styles.previewBlock}>
            <Text style={styles.previewLabel}>Temporary preview</Text>
            {/* Temporary manager UI preview while backend manager signup trigger is being fixed. */}
            <Button disabled={loading} onPress={onPreviewManager} variant="outline">
              Preview Manager Dashboard
            </Button>
          </View>
        ) : null}
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
  previewBlock: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
    width: '100%',
  },
  previewLabel: {
    color: colors.accent,
    fontFamily: typography.bodyStrong,
    fontSize: 11,
    letterSpacing: 0.5,
    textAlign: 'center',
    textTransform: 'uppercase',
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
  title: {
    color: colors.textPrimary,
    fontFamily: typography.displayStrong,
    fontSize: 32,
    lineHeight: 38,
  },
});
