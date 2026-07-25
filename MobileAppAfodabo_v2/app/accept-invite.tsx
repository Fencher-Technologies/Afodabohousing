import { useState } from "react";
import { StyleSheet, Text, View, Alert } from "react-native";
import { router } from "expo-router";
import { Mail, Phone, Lock, User, Key } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Button } from "@/src/components/Button";
import { InputField } from "@/src/components/InputField";
import { SegmentedControl } from "@/src/components/SegmentedControl";
import { PageHeader } from "@/src/components/PageHeader";
import { authService } from "@/src/services/auth";
import { setStoredToken } from "@/src/lib/api-client";
import { useAuth } from "@/src/context/auth-context";

export default function AcceptInviteScreen() {
  const { refreshAuth } = useAuth();
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [token, setToken] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [verifyToken, setVerifyToken] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "otp" | "pin">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async () => {
    if (!phone.trim()) {
      setError("Enter your phone number");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authService.sendOtp(phone.trim());
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 4) {
      setError("Enter the verification code");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await authService.verifyOtp(phone.trim(), otp);
      if (!result.valid || !result.verify_token) {
        setError(result.message || "Verification failed");
        return;
      }
      setVerifyToken(result.verify_token);
      setStep("pin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptEmail = async () => {
    if (!token.trim()) { setError("Enter the invitation token"); return; }
    if (!fullName.trim()) { setError("Enter your full name"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await authService.acceptInvite({ token: token.trim(), full_name: fullName.trim(), password });
      await setStoredToken(result.access_token);
      await refreshAuth();
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invite");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptPhone = async () => {
    if (!fullName.trim()) { setError("Enter your full name"); return; }
    if (pin.length < 4 || pin.length > 6) { setError("PIN must be 4-6 digits"); return; }
    if (pin !== confirmPin) { setError("PINs do not match"); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await authService.acceptInvite({
        token: token.trim(),
        full_name: fullName.trim(),
        verify_token: verifyToken!,
        pin,
        phone: phone.trim(),
      });
      await setStoredToken(result.access_token);
      await refreshAuth();
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invite");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <PageHeader title="Accept Invitation" onBack={() => router.back()} />
      <View style={styles.content}>
        <Text style={styles.label}>Invitation type</Text>
        <SegmentedControl
          segments={[
            { label: "Email", value: "email" },
            { label: "Phone", value: "phone" },
          ]}
          value={method}
          onChange={(v) => { setMethod(v as "email" | "phone"); setStep("form"); setError(null); }}
        />

        <InputField
          label="Invitation Token"
          value={token}
          onChangeText={setToken}
          placeholder="Paste your invitation token"
          autoCapitalize="none"
          leftIcon={<Key size={20} color={Colors.textMuted} />}
        />

        <InputField
          label="Full Name"
          value={fullName}
          onChangeText={setFullName}
          placeholder="John Mukasa"
          autoCapitalize="words"
          leftIcon={<User size={20} color={Colors.textMuted} />}
        />

        {method === "email" ? (
          <>
            <InputField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              secureTextEntry
              leftIcon={<Lock size={20} color={Colors.textMuted} />}
            />
            <InputField
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter password"
              secureTextEntry
              leftIcon={<Lock size={20} color={Colors.textMuted} />}
              error={error}
            />
            <Button label="Accept Invite" onPress={handleAcceptEmail} loading={loading} fullWidth size="lg" />
          </>
        ) : step === "form" ? (
          <>
            <InputField
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              placeholder="+2567XX XXX XXX"
              keyboardType="phone-pad"
              autoCapitalize="none"
              leftIcon={<Phone size={20} color={Colors.textMuted} />}
              error={error}
            />
            <Button label="Send Verification Code" onPress={handleSendOtp} loading={loading} fullWidth size="lg" />
          </>
        ) : step === "otp" ? (
          <>
            <InputField
              label="Verification Code"
              value={otp}
              onChangeText={(t) => setOtp(t.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              keyboardType="numeric"
              leftIcon={<Key size={20} color={Colors.textMuted} />}
              error={error}
            />
            <Button label="Verify Code" onPress={handleVerifyOtp} loading={loading} fullWidth size="lg" />
          </>
        ) : (
          <>
            <InputField
              label="Create PIN (4-6 digits)"
              value={pin}
              onChangeText={(t) => setPin(t.replace(/\D/g, "").slice(0, 6))}
              placeholder="1234"
              keyboardType="numeric"
              secureTextEntry
              leftIcon={<Lock size={20} color={Colors.textMuted} />}
            />
            <InputField
              label="Confirm PIN"
              value={confirmPin}
              onChangeText={(t) => setConfirmPin(t.replace(/\D/g, "").slice(0, 6))}
              placeholder="Re-enter PIN"
              keyboardType="numeric"
              secureTextEntry
              leftIcon={<Lock size={20} color={Colors.textMuted} />}
              error={error}
            />
            <Button label="Accept Invite" onPress={handleAcceptPhone} loading={loading} fullWidth size="lg" />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  label: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
});
