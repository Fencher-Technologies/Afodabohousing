/**
 * LoginScreen — email/password sign in with forgot password link.
 */

import { useState } from "react";
import { StyleSheet, Text, View, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Mail, Lock } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Button } from "@/src/components/Button";
import { InputField } from "@/src/components/InputField";
import { useAuth } from "@/src/context/auth-context";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError("Please enter your email and password");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      // Router redirect handled by _layout effect
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1B4A38", "#236048"]}
        style={styles.header}
      >
        <View style={styles.logoWrap}>
          <Image source={require("../assets/images/icon.png")} style={styles.logoIcon} contentFit="contain" />
        </View>
        <Text style={styles.appName}>Afodabo</Text>
        <Text style={styles.tagline}>Housing</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.formWrap}
      >
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to manage your rentals</Text>

        <View style={styles.form}>
          <InputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<Mail size={20} color={Colors.textMuted} />}
            error={error}
            accessibilityLabel="Email address"
          />
          <View style={{ height: Spacing.md }} />
          <InputField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            leftIcon={<Lock size={20} color={Colors.textMuted} />}
            accessibilityLabel="Password"
          />

          <Pressable
            onPress={() => router.push("/forgot-password")}
            style={styles.forgotBtn}
            accessibilityRole="button"
            accessibilityLabel="Forgot password"
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>

          <Button
            label="Sign In"
            onPress={handleSignIn}
            loading={loading}
            fullWidth
            size="lg"
          />

          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Pressable onPress={() => router.push("/register")}>
            <Text style={styles.footerLink}>Create Account</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
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
  logoIcon: {
    width: 56,
    height: 56,
  },
  appName: {
    fontSize: 28,
    fontWeight: FontWeight.bold,
    color: "#FFFFFF",
  },
  tagline: {
    fontSize: FontSize.body,
    color: "rgba(255,255,255,0.7)",
  },
  formWrap: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  title: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  form: {
    gap: 0,
  },
  forgotBtn: {
    alignSelf: "flex-end",
    paddingVertical: Spacing.sm,
  },
  forgotText: {
    fontSize: FontSize.caption,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  errorText: {
    fontSize: FontSize.caption,
    color: Colors.danger,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: "auto",
    marginBottom: 40,
    paddingTop: Spacing.xl,
  },
  footerText: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
  },
  footerLink: {
    fontSize: FontSize.body,
    color: Colors.primary,
    fontWeight: FontWeight.bold,
  },
});
