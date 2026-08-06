import { useState } from "react";
import { StyleSheet, Text, View, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { User, Lock, Square, CheckSquare } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Button } from "@/src/components/Button";
import { InputField } from "@/src/components/InputField";
import { authService } from "@/src/services/auth";
import { setStoredToken } from "@/src/lib/api-client";
import { useAuth } from "@/src/context/auth-context";

export default function PinSetupScreen() {
  const { phone, verifyToken, role } = useLocalSearchParams<{ phone: string; verifyToken: string; role: string }>();
  const [fullName, setFullName] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const { refreshAuth } = useAuth();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isManager = role === "manager" || role === "house_manager";
  const roleLabel = isManager ? "Property Manager" : "Tenant";
  const normalizedRole = isManager ? "house_manager" : "tenant";

  const handleCreateAccount = async () => {
    if (!fullName.trim()) {
      setError("Please enter your full name");
      return;
    }
    if (pin.length < 4 || pin.length > 6) {
      setError("PIN must be 4 to 6 digits");
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs do not match");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await authService.registerWithPhone({
        phone: phone!,
        full_name: fullName.trim(),
        pin,
        verify_token: verifyToken,
        role: normalizedRole,
        accepted_terms: true,
        terms_version: "1.0",
        privacy_version: "1.0",
      });
      await setStoredToken(result.access_token);
      await refreshAuth();
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
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
        <Text style={styles.appName}>Create Your PIN</Text>
        <Text style={styles.tagline}>Secure your account with a PIN</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.formWrap}
      >
        <View style={styles.roleBanner}>
          <Text style={styles.roleBannerText}>
            Registering as: <Text style={styles.roleBannerHighlight}>{roleLabel}</Text>
          </Text>
          <Text style={styles.roleChangeLink} onPress={() => router.replace(`/phone-auth?phone=${encodeURIComponent(phone!)}`)}>
            Change
          </Text>
        </View>

        <View style={styles.form}>
          <InputField
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="John Mukasa"
            autoCapitalize="words"
            leftIcon={<User size={20} color={Colors.textMuted} />}
          />
          <View style={{ height: Spacing.md }} />
          <InputField
            label="Create PIN (4-6 digits)"
            value={pin}
            onChangeText={(t) => setPin(t.replace(/\D/g, "").slice(0, 6))}
            placeholder="1234"
            keyboardType="numeric"
            secureTextEntry
            leftIcon={<Lock size={20} color={Colors.textMuted} />}
          />
          <View style={{ height: Spacing.md }} />
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
        </View>

        <View style={{ height: Spacing.md }} />

        <Pressable
          onPress={() => setTermsAccepted((v) => !v)}
          style={styles.checkboxRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: termsAccepted }}
        >
          {termsAccepted ? (
            <CheckSquare size={20} color={Colors.primary} />
          ) : (
            <Square size={20} color={Colors.textMuted} />
          )}
          <Text style={styles.checkboxLabel}>
            I agree to the{" "}
            <Text style={styles.checkboxLink} onPress={() => router.push("/legal?type=terms")}>
              Terms of Service
            </Text>{" "}
            and{" "}
            <Text style={styles.checkboxLink} onPress={() => router.push("/legal?type=privacy")}>
              Privacy Policy
            </Text>
          </Text>
        </Pressable>

        <View style={{ height: Spacing.lg }} />

        <Button
          label="Create Account"
          onPress={handleCreateAccount}
          loading={loading}
          fullWidth
          size="lg"
          disabled={!termsAccepted}
        />
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
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  checkboxLabel: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  checkboxLink: {
    color: Colors.accent,
    fontWeight: FontWeight.semibold,
  },
  roleBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.button,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  roleBannerText: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
  },
  roleBannerHighlight: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  roleChangeLink: {
    fontSize: FontSize.caption,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
});
