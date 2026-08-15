import { useState } from "react";
import { StyleSheet, Text, View, KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Phone, Lock } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { Button } from "@/src/components/Button";
import { InputField } from "@/src/components/InputField";
import { authService } from "@/src/services/auth";
import { setStoredToken } from "@/src/lib/api-client";
import { useAuth } from "@/src/context/auth-context";

export default function PhoneSignInScreen() {
  const { refreshAuth } = useAuth();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!phone.trim()) {
      setError("Please enter your phone number");
      return;
    }
    if (pin.length < 4 || pin.length > 6) {
      setError("PIN must be 4 to 6 digits");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await authService.signInWithPhone(phone.trim(), pin);
      await setStoredToken(result.access_token);
      await refreshAuth();
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#1B4A38", "#236048"]} style={styles.header}>
        <Text style={styles.appName}>Sign in with Phone Number</Text>
        <Text style={styles.tagline}>Use your phone number and PIN</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.formWrap}
      >
        <View style={styles.form}>
          <InputField
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            placeholder="+2567XX XXX XXX"
            keyboardType="phone-pad"
            autoCapitalize="none"
            leftIcon={<Phone size={20} color={Colors.textMuted} />}
          />
          <View style={{ height: Spacing.md }} />
          <InputField
            label="PIN"
            value={pin}
            onChangeText={(t) => setPin(t.replace(/\D/g, "").slice(0, 6))}
            placeholder="Your 4-6 digit PIN"
            keyboardType="numeric"
            secureTextEntry
            leftIcon={<Lock size={20} color={Colors.textMuted} />}
            error={error}
          />
        </View>

        <View style={{ height: Spacing.lg }} />

        <Button
          label="Sign In"
          onPress={handleSignIn}
          loading={loading}
          fullWidth
          size="lg"
        />

        <View style={styles.forgotRow}>
          <Text style={styles.forgotLink} onPress={() => router.push("/forgot-pin")}>
            Forgot PIN?
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerLink} onPress={() => router.push("/phone-auth")}>
            Register with Phone Number instead
          </Text>
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerLink} onPress={() => router.back()}>
            Back to Sign In
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
  appName: { fontSize: 28, fontWeight: FontWeight.bold, color: "#FFFFFF" },
  tagline: { fontSize: FontSize.body, color: "rgba(255,255,255,0.7)" },
  formWrap: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  form: { gap: 0 },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingTop: Spacing.md,
  },
  footerLink: {
    fontSize: FontSize.body,
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
  forgotRow: {
    alignItems: "center",
    paddingTop: Spacing.md,
  },
  forgotLink: {
    fontSize: FontSize.caption,
    color: Colors.accent,
    fontWeight: FontWeight.semibold,
  },
});
