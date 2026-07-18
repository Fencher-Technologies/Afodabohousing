import React, { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/button';
import { InputField } from '../components/input-field';
import { acceptInvite } from '../services/auth';
import { colors, radii, spacing, typography } from '../theme/tokens';

export function AcceptInviteScreen() {
  const [token, setToken] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  async function handleAccept() {
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      Alert.alert('Token required', 'Enter the invitation token you received.');
      return;
    }

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      Alert.alert('Name required', 'Enter your full name.');
      return;
    }

    if (!password) {
      Alert.alert('Password required', 'Choose a password for your account.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Password too short', 'Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Confirm password must match the password.');
      return;
    }

    try {
      setSending(true);
      await acceptInvite({
        fullName: trimmedName,
        password,
        phone: phone.trim(),
        token: trimmedToken,
      });
      Alert.alert('Welcome!', 'Your invitation has been accepted. You can now sign in.');
    } catch (error) {
      Alert.alert('Could not accept invitation', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSending(false);
    }
  }

  const isValid =
    token.trim().length > 0 &&
    fullName.trim().length > 0 &&
    password.length >= 6 &&
    confirmPassword.length >= 6 &&
    password === confirmPassword;

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={styles.flex}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: spacing.xl + insets.bottom },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.title}>Accept Invitation</Text>
            <Text style={styles.body}>
              Enter the invitation token you received along with your details to set up your account.
            </Text>
          </View>

          <View style={styles.card}>
            <InputField
              autoCapitalize="none"
              label="Invitation Token"
              onChangeText={setToken}
              placeholder="Paste your invitation token"
              value={token}
            />

            <InputField
              autoCapitalize="words"
              label="Full Name"
              onChangeText={setFullName}
              placeholder="Your full name"
              value={fullName}
            />

            <InputField
              keyboardType="phone-pad"
              label="Phone Number (optional)"
              onChangeText={setPhone}
              placeholder="e.g. 256701234567"
              value={phone}
            />

            <InputField
              autoCapitalize="none"
              label="Password"
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              secureTextEntry
              value={password}
            />

            <InputField
              autoCapitalize="none"
              label="Confirm Password"
              onChangeText={setConfirmPassword}
              placeholder="Repeat your password"
              secureTextEntry
              value={confirmPassword}
            />
          </View>

          <Button disabled={!isValid} onPress={handleAccept}>
            {sending ? 'Accepting...' : 'Accept Invitation'}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  flex: {
    flex: 1,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 26,
  },
});
