import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/button';
import { InputField } from '../components/input-field';
import { Screen } from '../components/screen';
import { useAuth } from '../context/auth-context';
import { updateProfile } from '../services/auth';
import { colors, radii, spacing, typography } from '../theme/tokens';

export function EditProfileScreen() {
  const { profile, refresh, user } = useAuth();
  const [fullNameDraft, setFullNameDraft] = useState<string | null>(null);
  const [phoneDraft, setPhoneDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!user) {
    return (
      <Screen>
        <View style={styles.card}>
          <Text style={styles.title}>Profile unavailable</Text>
          <Text style={styles.description}>Sign in to update your account information.</Text>
        </View>
      </Screen>
    );
  }

  const fullName =
    fullNameDraft ??
    profile?.full_name ??
    (typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '') ??
    '';
  const phone = phoneDraft ?? profile?.phone ?? '';

  return (
    <Screen>
      <View style={styles.card}>
        <Text style={styles.title}>Edit Profile</Text>
        <Text style={styles.description}>
          Update your name and phone number for account notices and rent communication.
        </Text>

        <InputField
          label="Full Name"
          onChangeText={setFullNameDraft}
          placeholder="Enter your full name"
          value={fullName}
        />
        <InputField
          keyboardType="phone-pad"
          label="Phone Number"
          onChangeText={setPhoneDraft}
          placeholder="+256 700 000000"
          value={phone}
        />

        <View style={styles.readonlyCard}>
          <Text style={styles.readonlyLabel}>Email Address</Text>
          <Text style={styles.readonlyValue}>{user.email}</Text>
          <Text style={styles.readonlyHint}>Email can’t be changed in the mobile app.</Text>
        </View>

        <Button
          disabled={saving}
          onPress={async () => {
            try {
              setSaving(true);
              await updateProfile({
                fullName,
                phone,
                userId: user.id,
              });
              await refresh();
              setFullNameDraft(null);
              setPhoneDraft(null);
              Alert.alert('Profile updated', 'Your name and phone number were saved.');
            } catch (error) {
              Alert.alert(
                'Could not update profile',
                error instanceof Error ? error.message : 'Please try again.',
              );
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
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
    gap: spacing.sm,
    padding: spacing.md,
  },
  description: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 14,
    lineHeight: 22,
  },
  readonlyCard: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.input,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  readonlyHint: {
    color: colors.textMuted,
    fontFamily: typography.body,
    fontSize: 13,
    lineHeight: 20,
  },
  readonlyLabel: {
    color: colors.textSecondary,
    fontFamily: typography.bodyStrong,
    fontSize: 13,
  },
  readonlyValue: {
    color: colors.textPrimary,
    fontFamily: typography.body,
    fontSize: 15,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 28,
  },
});
