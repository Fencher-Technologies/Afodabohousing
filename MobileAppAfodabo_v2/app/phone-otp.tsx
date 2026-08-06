import { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, View, TextInput, Platform } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

import { Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { Button } from "@/src/components/Button";
import { authService } from "@/src/services/auth";

const RESEND_DELAY = 30;

export default function OtpVerificationScreen() {
  const { phone, role } = useLocalSearchParams<{ phone: string; role: string }>();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_DELAY);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleVerify = async () => {
    if (otp.length < 4) {
      setError("Please enter the full code");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await authService.verifyOtp(phone!, otp);
      if (!result.valid || !result.verify_token) {
        setError(result.message || "Verification failed");
        return;
      }
      router.push(`/phone-pin-setup?phone=${encodeURIComponent(phone!)}&verifyToken=${encodeURIComponent(result.verify_token)}&role=${role}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    try {
      await authService.sendOtp(phone!);
      setCountdown(RESEND_DELAY);
      setOtp("");
      setError(null);
    } catch {
      setError("Failed to resend code");
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#1B4A38", "#236048"]} style={styles.header}>
        <View style={styles.logoWrap}>
          <Image source={require("../assets/images/icon.png")} style={styles.logoIcon} contentFit="contain" />
        </View>
        <Text style={styles.appName}>Verify Code</Text>
        <Text style={styles.tagline}>Enter the code sent to {phone}</Text>
      </LinearGradient>

      <View style={styles.formWrap}>
        <TextInput
          ref={inputRef}
          value={otp}
          onChangeText={(t) => { setOtp(t.replace(/\D/g, "").slice(0, 6)); setError(null); }}
          keyboardType="number-pad"
          maxLength={6}
          style={styles.otpInput}
          placeholder="000000"
          placeholderTextColor={Colors.textMuted}
          accessibilityLabel="Verification code"
        />
        {error && <Text style={styles.errorText}>{error}</Text>}

        <Button
          label="Verify Code"
          onPress={handleVerify}
          loading={loading}
          fullWidth
          size="lg"
        />

        <View style={styles.resendRow}>
          <Text style={styles.resendText}>
            {countdown > 0
              ? `Resend code in ${countdown}s`
              : "Didn't receive the code?"}
          </Text>
          {countdown === 0 && (
            <Text style={styles.resendLink} onPress={handleResend}>
              {" "}Resend
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 70,
    paddingBottom: Spacing.xxl,
    gap: Spacing.xs,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  logoWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
  },
  logoIcon: { width: 56, height: 56 },
  appName: { fontSize: 28, fontWeight: FontWeight.bold, color: "#FFFFFF" },
  tagline: { fontSize: FontSize.body, color: "rgba(255,255,255,0.7)" },
  formWrap: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    alignItems: "center",
    gap: Spacing.lg,
  },
  otpInput: {
    width: "100%",
    height: 64,
    fontSize: 32,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    borderRadius: 12,
    textAlign: "center",
    letterSpacing: 12,
  },
  errorText: {
    fontSize: FontSize.caption,
    color: Colors.danger,
    textAlign: "center",
  },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: Spacing.md,
  },
  resendText: { fontSize: FontSize.body, color: Colors.textSecondary },
  resendLink: {
    fontSize: FontSize.body,
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
});
