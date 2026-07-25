import type { StackScreenProps } from '@react-navigation/stack';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/button';
import { InputField } from '../components/input-field';
import { Screen } from '../components/screen';
import { useAuth } from '../context/auth-context';
import type { RootStackParamList } from '../navigation/types';
import { changePin, linkPhone, sendOtp, updateProfile, verifyOtp } from '../services/auth';
import { colors, radii, spacing, typography } from '../theme/tokens';

export function EditProfileScreen({
  navigation,
}: StackScreenProps<RootStackParamList, 'EditProfile'>) {
  const { profile, refresh, user } = useAuth();
  const [fullNameDraft, setFullNameDraft] = useState<string | null>(null);
  const [phoneDraft, setPhoneDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [linkPhoneNumber, setLinkPhoneNumber] = useState('');
  const [linkOtpSent, setLinkOtpSent] = useState(false);
  const [linkOtpCode, setLinkOtpCode] = useState('');
  const [linkVerifyToken, setLinkVerifyToken] = useState('');
  const [linkPinState, setLinkPinState] = useState('');
  const [linkCurrentPassword, setLinkCurrentPassword] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);

  const [changePinMode, setChangePinMode] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [changePinLoading, setChangePinLoading] = useState(false);

  const hasPin = !!(profile?.pin_hash);

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
          <Text style={styles.readonlyHint}>Email can't be changed in the mobile app.</Text>
        </View>

        <Button
          disabled={saving}
          onPress={async () => {
            try {
              setSaving(true);
              const { updateProfile } = await import('../services/auth');
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

      {!hasPin ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Enable Phone Sign-In</Text>
          <Text style={styles.description}>
            Set up a PIN to sign in with your phone number instead of email and password.
          </Text>

          <InputField
            keyboardType="phone-pad"
            label="Phone number"
            onChangeText={setLinkPhoneNumber}
            placeholder="+256 700 000000"
            value={linkPhoneNumber}
          />
          {!linkOtpSent ? (
            <Button
              disabled={linkLoading || linkPhoneNumber.length < 6}
              onPress={async () => {
                try {
                  setLinkLoading(true);
                  await sendOtp(linkPhoneNumber);
                  setLinkOtpSent(true);
                } catch (error) {
                  Alert.alert('Error', error instanceof Error ? error.message : 'Failed to send code.');
                } finally {
                  setLinkLoading(false);
                }
              }}
            >
              {linkLoading ? 'Sending...' : 'Send verification code'}
            </Button>
          ) : (
            <>
              <InputField
                keyboardType="number-pad"
                label="Verification code"
                maxLength={6}
                onChangeText={setLinkOtpCode}
                placeholder="000000"
                value={linkOtpCode}
              />
              <InputField
                keyboardType="number-pad"
                label="Create PIN (4-6 digits)"
                maxLength={6}
                onChangeText={setLinkPinState}
                placeholder="Enter PIN"
                secureTextEntry
                value={linkPinState}
              />
              <InputField
                autoCapitalize="none"
                label="Current password"
                onChangeText={setLinkCurrentPassword}
                placeholder="Your current password"
                secureTextEntry
                value={linkCurrentPassword}
              />
              <Button
                disabled={
                  linkLoading ||
                  linkOtpCode.length < 4 ||
                  linkPinState.length < 4 ||
                  !linkCurrentPassword
                }
                onPress={async () => {
                  try {
                    setLinkLoading(true);
                    if (!linkVerifyToken) {
                      const verify = await verifyOtp(linkPhoneNumber, linkOtpCode);
                      if (!verify.valid || !verify.verify_token) {
                        Alert.alert('Invalid code', verify.message);
                        return;
                      }
                      setLinkVerifyToken(verify.verify_token);
                    }
                    const token = linkVerifyToken || (await verifyOtp(linkPhoneNumber, linkOtpCode)).verify_token;
                    if (!token) return;
                    await linkPhone(linkPhoneNumber, token, linkPinState, linkCurrentPassword);
                    await refresh();
                    setLinkOtpSent(false);
                    setLinkOtpCode('');
                    setLinkPinState('');
                    setLinkCurrentPassword('');
                    Alert.alert('Success', 'Phone sign-in enabled. You can now sign in with your phone and PIN.');
                  } catch (error) {
                    Alert.alert('Error', error instanceof Error ? error.message : 'Failed to link phone.');
                  } finally {
                    setLinkLoading(false);
                  }
                }}
              >
                {linkLoading ? 'Setting up...' : 'Enable Phone Sign-In'}
              </Button>
            </>
          )}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Phone Sign-In</Text>
          <Text style={styles.description}>
            Your phone {profile?.phone || 'number'} is linked. You can sign in with your phone and PIN.
          </Text>

          {!changePinMode ? (
            <Button onPress={() => setChangePinMode(true)} variant="outline">
              Change PIN
            </Button>
          ) : (
            <>
              <InputField
                keyboardType="number-pad"
                label="Current PIN"
                maxLength={6}
                onChangeText={setCurrentPin}
                placeholder="Current PIN"
                secureTextEntry
                value={currentPin}
              />
              <InputField
                keyboardType="number-pad"
                label="New PIN (4-6 digits)"
                maxLength={6}
                onChangeText={setNewPin}
                placeholder="New PIN"
                secureTextEntry
                value={newPin}
              />
              <InputField
                keyboardType="number-pad"
                label="Confirm new PIN"
                maxLength={6}
                onChangeText={setConfirmNewPin}
                placeholder="Confirm new PIN"
                secureTextEntry
                value={confirmNewPin}
              />
              <Button
                disabled={
                  changePinLoading ||
                  !currentPin ||
                  !newPin ||
                  newPin !== confirmNewPin
                }
                onPress={async () => {
                  if (newPin !== confirmNewPin) {
                    Alert.alert('PIN mismatch', 'New PINs do not match.');
                    return;
                  }
                  try {
                    setChangePinLoading(true);
                    await changePin(currentPin, newPin);
                    setChangePinMode(false);
                    setCurrentPin('');
                    setNewPin('');
                    setConfirmNewPin('');
                    Alert.alert('Success', 'Your PIN has been changed.');
                  } catch (error) {
                    Alert.alert('Error', error instanceof Error ? error.message : 'Failed to change PIN.');
                  } finally {
                    setChangePinLoading(false);
                  }
                }}
              >
                {changePinLoading ? 'Changing...' : 'Change PIN'}
              </Button>
              <Button onPress={() => setChangePinMode(false)} variant="ghost">
                Cancel
              </Button>
            </>
          )}
        </View>
      )}
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
  sectionTitle: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 22,
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.display,
    fontSize: 28,
  },
});

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
