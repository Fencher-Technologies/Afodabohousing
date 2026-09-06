/**
 * ForgotPasswordScreen — email reset link.
 */

import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import { Mail, CheckCircle } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { Button } from "@/src/components/Button";
import { InputField } from "@/src/components/InputField";
import { PageHeader } from "@/src/components/PageHeader";
import { authService } from "@/src/services/auth";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // This screen previously faked the request with a one-second timer and
  // showed "Check your email" without ever calling the API, so no recovery
  // mail was ever sent.
  const handleSend = async () => {
    const address = email.trim();
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      // Deep link back into the app so the reset completes here rather than
      // on the web. Requires "axis://reset-password" in the Supabase
      // dashboard under Authentication -> URL Configuration -> Redirect URLs.
      const redirectTo = Linking.createURL("/reset-password");
      await authService.resetPassword(address, redirectTo);
      setSent(true);
    } catch {
      setError("Could not send the reset link. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.container}>
        <PageHeader title="" onBack={() => router.back()} />
        <View style={styles.sentWrap}>
          <View style={styles.iconWrap}>
            <CheckCircle size={40} color={Colors.success} />
          </View>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.description}>
            We&apos;ve sent a password reset link to{"\n"}
            <Text style={styles.emailBold}>{email}</Text>
          </Text>
          <View style={{ height: Spacing.xl }} />
          <Button label="Back to Sign In" onPress={() => router.replace("/login")} fullWidth size="lg" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader title="Forgot Password" onBack={() => router.back()} />
      <View style={styles.form}>
        <Text style={styles.description}>
          Enter your email address and we&apos;ll send you a link to reset your password.
        </Text>
        <View style={{ height: Spacing.xl }} />
        <InputField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          leftIcon={<Mail size={20} color={Colors.textMuted} />}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={{ height: Spacing.xl }} />
        <Button label="Send Reset Link" onPress={handleSend} loading={loading} fullWidth size="lg" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  form: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg },
  description: { fontSize: FontSize.body, color: Colors.textSecondary, lineHeight: 24 },
  sentWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: Spacing.xl, gap: Spacing.md },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: FontSize.title, fontWeight: FontWeight.bold, color: Colors.textPrimary, textAlign: "center" },
  emailBold: { fontWeight: FontWeight.bold, color: Colors.textPrimary },
  error: { marginTop: Spacing.md, fontSize: FontSize.caption, color: Colors.danger },
});
