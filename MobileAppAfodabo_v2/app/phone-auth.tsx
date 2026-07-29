import { useState } from "react";
import { StyleSheet, Text, View, KeyboardAvoidingView, Platform } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Phone } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Button } from "@/src/components/Button";
import { InputField } from "@/src/components/InputField";
import { SegmentedControl } from "@/src/components/SegmentedControl";
import { authService } from "@/src/services/auth";
import type { UserRole } from "@/src/types";

export default function PhoneAuthScreen() {
  const insets = useSafeAreaInsets();
  const { phone: prefillPhone } = useLocalSearchParams<{ phone?: string }>();
  const [role, setRole] = useState<UserRole>("tenant");
  const [phone, setPhone] = useState(prefillPhone || "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!phone.trim()) {
      setError("Please enter your phone number");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authService.sendOtp(phone.trim());
      router.push(`/phone-otp?phone=${encodeURIComponent(phone.trim())}&role=${role}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#1B4A38", "#236048"]} style={styles.header}>
        <View style={styles.logoWrap}>
          <Image source={require("../assets/images/icon.png")} style={styles.logoIcon} contentFit="contain" />
        </View>
        <Text style={styles.appName}>Register with Phone Number</Text>
        <Text style={styles.tagline}>Verify your phone to get started</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.formWrap}
      >
        <View style={styles.form}>
          <Text style={styles.label}>I am a…</Text>
          <SegmentedControl
            segments={[
              { label: "Property Manager", value: "manager" },
              { label: "Tenant", value: "tenant" },
            ]}
            value={role}
            onChange={(v) => setRole(v as UserRole)}
          />

          <View style={{ height: Spacing.lg }} />

          <InputField
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            placeholder="+2567XX XXX XXX"
            keyboardType="phone-pad"
            autoCapitalize="none"
            leftIcon={<Phone size={20} color={Colors.textMuted} />}
            error={error}
            accessibilityLabel="Phone number"
          />
        </View>

        <View style={{ height: Spacing.lg }} />

        <Button
          label="Send Verification Code"
          onPress={handleSendOtp}
          loading={loading}
          fullWidth
          size="lg"
        />

        <View style={[styles.footer, { marginBottom: Math.max(insets.bottom, 16) }]}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Text style={styles.footerLink} onPress={() => router.back()}>
            Sign In
          </Text>
        </View>
      </KeyboardAvoidingView>
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
    paddingTop: Spacing.xl,
  },
  form: { gap: 0 },
  label: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: "auto",
    marginBottom: 40,
    paddingTop: Spacing.xl,
  },
  footerText: { fontSize: FontSize.body, color: Colors.textSecondary },
  footerLink: {
    fontSize: FontSize.body,
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
});
