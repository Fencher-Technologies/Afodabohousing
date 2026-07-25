import React, { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/button';
import { InputField } from '../components/input-field';
import { SegmentedControl } from '../components/segmented-control';
import { acceptInvite, sendOtp, verifyOtp } from '../services/auth';
import { colors, radii, spacing, typography } from '../theme/tokens';

type AcceptMode = 'email' | 'phone';

export function AcceptInviteScreen() {
  const [mode, setMode] = useState<AcceptMode>('email');
  const [token, setToken] = useState('');
  const [fullName, setFullName] = useState('');

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  async function handleSendOtp() {
    const cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.length < 9) {
      Alert.alert('Invalid number', 'Please enter a valid phone number.');
      return;
    }
    try {
      setSending(true);
      await sendOtp(phone);
      setOtpSent(true);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to send code.');
    } finally {
      setSending(false);
    }
  }

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

    if (mode === 'email') {
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
    } else {
      if (!otpSent || !verifyToken) {
        Alert.alert('Verify phone', 'Please verify your phone number first.');
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
    }

    try {
      setSending(true);
      await acceptInvite({
        fullName: trimmedName,
        password: mode === 'email' ? password : undefined,
        phone: phone.trim() || undefined,
        token: trimmedToken,
        verifyToken: mode === 'phone' ? verifyToken : undefined,
        pin: mode === 'phone' ? pin : undefined,
      });
      Alert.alert('Welcome!', 'Your invitation has been accepted. You can now sign in.');
    } catch (error) {
      Alert.alert('Could not accept invitation', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSending(false);
    }
  }

  const isValidEmail =
    token.trim().length > 0 &&
    fullName.trim().length > 0 &&
    password.length >= 6 &&
    confirmPassword.length >= 6 &&
    password === confirmPassword;

  const isValidPhone =
    token.trim().length > 0 &&
    fullName.trim().length > 0 &&
    verifyToken.length > 0 &&
    pin.length >= 4 &&
    pin.length <= 6 &&
    pin === confirmPin;

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

          <SegmentedControl
            labels={['Email', 'Phone']}
            onSelect={(i) => setMode(i === 0 ? 'email' : 'phone')}
            selectedIndex={mode === 'email' ? 0 : 1}
          />

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

            {mode === 'email' ? (
              <>
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
              </>
            ) : (
              <>
                <TextInput
                  keyboardType="phone-pad"
                  onChangeText={setPhone}
                  placeholder="Phone number"
                  style={styles.textInput}
                  value={phone}
                />
                {!otpSent ? (
                  <Button disabled={sending || phone.length < 6} onPress={handleSendOtp}>
                    {sending ? 'Sending...' : 'Send verification code'}
                  </Button>
                ) : (
                  <>
                    <TextInput
                      keyboardType="number-pad"
                      maxLength={6}
                      onChangeText={async (code) => {
                        setOtpCode(code);
                        if (code.length >= 4) {
                          try {
                            const result = await verifyOtp(phone, code);
                            if (result.valid && result.verify_token) {
                              setVerifyToken(result.verify_token);
                            }
                          } catch {
                            // error handled below on submit
                          }
                        }
                      }}
                      placeholder="Verification code"
                      style={styles.textInput}
                      value={otpCode}
                    />
                    <TextInput
                      keyboardType="number-pad"
                      maxLength={6}
                      onChangeText={setPin}
                      placeholder="Create PIN (4-6 digits)"
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
                  </>
                )}
              </>
            )}
          </View>

          <Button
            disabled={sending || (mode === 'email' ? !isValidEmail : !isValidPhone)}
            onPress={handleAccept}
          >
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
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
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
    fontSize: 26,
  },
});

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
