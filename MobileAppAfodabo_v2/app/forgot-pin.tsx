import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Phone, Key, Lock } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Button } from "@/src/components/Button";
import { InputField } from "@/src/components/InputField";
import { PageHeader } from "@/src/components/PageHeader";
import { authService } from "@/src/services/auth";

type Step = "phone" | "otp" | "new-pin";

export default function ForgotPinScreen() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [verifyToken, setVerifyToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async () => {
    if (!phone.trim()) { setError("Enter your phone number"); return; }
    setLoading(true);
    setError(null);
    try {
      await authService.sendOtp(phone.trim());
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 4) { setError("Enter the verification code"); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await authService.verifyOtp(phone.trim(), otp);
      if (!result.valid || !result.verify_token) {
        setError(result.message || "Verification failed");
        return;
      }
      setVerifyToken(result.verify_token);
      setStep("new-pin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPin = async () => {
    if (newPin.length < 4 || newPin.length > 6) { setError("PIN must be 4-6 digits"); return; }
    if (newPin !== confirmPin) { setError("PINs do not match"); return; }
    setLoading(true);
    setError(null);
    try {
      await authService.forgotPin({ phone: phone.trim(), verify_token: verifyToken!, new_pin: newPin });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset PIN");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <PageHeader title="Reset PIN" onBack={() => router.back()} />
      <View style={styles.content}>
        {step === "phone" && (
          <>
            <Text style={styles.description}>Enter your phone number to receive a verification code.</Text>
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
        )}

        {step === "otp" && (
          <>
            <Text style={styles.description}>Enter the code sent to {phone}.</Text>
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
        )}

        {step === "new-pin" && (
          <>
            <Text style={styles.description}>Create a new PIN for your account.</Text>
            <InputField
              label="New PIN (4-6 digits)"
              value={newPin}
              onChangeText={(t) => setNewPin(t.replace(/\D/g, "").slice(0, 6))}
              placeholder="1234"
              keyboardType="numeric"
              secureTextEntry
              leftIcon={<Lock size={20} color={Colors.textMuted} />}
            />
            <InputField
              label="Confirm New PIN"
              value={confirmPin}
              onChangeText={(t) => setConfirmPin(t.replace(/\D/g, "").slice(0, 6))}
              placeholder="Re-enter PIN"
              keyboardType="numeric"
              secureTextEntry
              leftIcon={<Lock size={20} color={Colors.textMuted} />}
              error={error}
            />
            <Button label="Reset PIN" onPress={handleResetPin} loading={loading} fullWidth size="lg" />
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
  description: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
});
