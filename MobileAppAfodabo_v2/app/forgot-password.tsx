/**
 * ForgotPasswordScreen — email reset link.
 */

import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { Button } from "@/src/components/Button";
import { InputField } from "@/src/components/InputField";
import { PageHeader } from "@/src/components/PageHeader";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSend = () => {
    if (!email.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 1000);
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
            We've sent a password reset link to{"\n"}
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
          Enter your email address and we'll send you a link to reset your password.
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
    backgroundColor: Colors.successSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: FontSize.title, fontWeight: FontWeight.bold, color: Colors.textPrimary, textAlign: "center" },
  emailBold: { fontWeight: FontWeight.bold, color: Colors.textPrimary },
});
