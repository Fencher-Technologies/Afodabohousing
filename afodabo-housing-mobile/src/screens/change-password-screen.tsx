import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/button';
import { InputField } from '../components/input-field';
import { ScrollableScreenContainer } from '../components/scrollable-screen-container';
import { changePassword } from '../services/auth';
import { colors, radii, spacing, typography } from '../theme/tokens';

export function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sending, setSending] = useState(false);

  async function handleChange() {
    if (!currentPassword) {
      Alert.alert('Current password required', 'Enter your current password.');
      return;
    }

    if (!newPassword) {
      Alert.alert('New password required', 'Choose a new password.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Password too short', 'New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Confirm password must match the new password.');
      return;
    }

    try {
      setSending(true);
      await changePassword(currentPassword, newPassword);
      Alert.alert('Password changed', 'Your password has been updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      Alert.alert('Could not change password', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSending(false);
    }
  }

  const isValid =
    currentPassword.length > 0 &&
    newPassword.length >= 6 &&
    confirmPassword.length >= 6 &&
    newPassword === confirmPassword;

  return (
    <ScrollableScreenContainer contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Change Password</Text>
        <Text style={styles.body}>
          Enter your current password and choose a new one.
        </Text>
      </View>

      <View style={styles.card}>
        <InputField
          autoCapitalize="none"
          label="Current Password"
          onChangeText={setCurrentPassword}
          placeholder="Your current password"
          secureTextEntry
          value={currentPassword}
        />

        <InputField
          autoCapitalize="none"
          label="New Password"
          onChangeText={setNewPassword}
          placeholder="At least 6 characters"
          secureTextEntry
          value={newPassword}
        />

        <InputField
          autoCapitalize="none"
          label="Confirm New Password"
          onChangeText={setConfirmPassword}
          placeholder="Repeat your new password"
          secureTextEntry
          value={confirmPassword}
        />
      </View>

      <Button disabled={!isValid} onPress={handleChange}>
        {sending ? 'Changing...' : 'Change Password'}
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
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 26,
  },
});
