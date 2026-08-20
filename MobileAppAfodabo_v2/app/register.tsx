/**
 * RegisterScreen — role selector + registration form.
 */

import { useState } from "react";
import { StyleSheet, Text, View, KeyboardAvoidingView, Platform, ScrollView, Pressable } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Mail, Lock, User, Phone, Square, CheckSquare } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { Button } from "@/src/components/Button";
import { InputField } from "@/src/components/InputField";
import { OrDivider } from "@/src/components/OrDivider";
import { SegmentedControl } from "@/src/components/SegmentedControl";
import { FloatingBackButton } from "@/src/components/FloatingBackButton";
import { useAuth } from "@/src/context/auth-context";
import type { UserRole } from "@/src/types";

export default function RegisterScreen() {
  const { register } = useAuth();
  const insets = useSafeAreaInsets();
  const [role, setRole] = useState<UserRole>("manager");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register(role, { full_name: fullName, email, phone, password, accepted_terms: true, terms_version: "1.0", privacy_version: "1.0" });
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#1A2332" />
      <FloatingBackButton onPress={() => router.back()} />
      <LinearGradient colors={["#1A2332", "#15202B"]} style={styles.header}>
        <View style={styles.logoWrap}>
          <Image source={require("../assets/images/icon.png")} style={styles.logoIcon} contentFit="contain" />
        </View>
        <Text style={styles.appName}>Create Account</Text>
        <Text style={styles.tagline}>Join Afodabo in under a minute</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.formWrap, { paddingBottom: Math.max(insets.bottom + 16, 40) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>I am a…</Text>
          <SegmentedControl
            segments={[
              { label: "House Manager", value: "manager" },
              { label: "Tenant", value: "tenant" },
            ]}
            value={role}
            onChange={(v) => setRole(v as UserRole)}
          />

          <View style={styles.form}>
            <InputField
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="John Mukasa"
              leftIcon={<User size={20} color={Colors.textMuted} />}
            />
            <View style={{ height: Spacing.md }} />
            <InputField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Mail size={20} color={Colors.textMuted} />}
            />
            <View style={{ height: Spacing.md }} />
            <InputField
              label="Phone"
              value={phone}
              onChangeText={setPhone}
              placeholder="2567XX XXX XXX"
              keyboardType="phone-pad"
              leftIcon={<Phone size={20} color={Colors.textMuted} />}
            />
            <View style={{ height: Spacing.md }} />
            <InputField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              secureTextEntry
              leftIcon={<Lock size={20} color={Colors.textMuted} />}
            />
            <View style={{ height: Spacing.md }} />
            <InputField
              label="Confirm Password"
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Re-enter password"
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
          <Button label="Create Account" onPress={handleRegister} loading={loading} fullWidth size="lg" disabled={!termsAccepted} />

          <OrDivider />
          <Button
            label="Register with Phone Number"
            onPress={() => router.push("/phone-auth")}
            variant="outline"
            fullWidth
            size="lg"
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Text
              style={styles.footerLink}
              onPress={() => router.replace("/login")}
            >
              Sign In
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: Spacing.xl,
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
  logoIcon: {
    width: 56,
    height: 56,
  },
  appName: { fontSize: FontSize.display, fontWeight: FontWeight.bold, color: "#FFFFFF" },
  tagline: { fontSize: FontSize.body, color: "rgba(255,255,255,0.7)" },
  formWrap: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: 40,
  },
  label: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  form: { marginTop: Spacing.lg },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.xl,
  },
  footerText: { fontSize: FontSize.body, color: Colors.textSecondary },
  footerLink: { fontSize: FontSize.body, color: Colors.accent, fontWeight: FontWeight.bold },
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
});
