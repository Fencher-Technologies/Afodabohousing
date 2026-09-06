/**
 * ResetPasswordScreen — landing point for the emailed recovery link.
 *
 * Supabase appends the recovery tokens to the redirect URL as a URL *fragment*
 * (#access_token=...&type=recovery), not a query string, so expo-router's
 * useLocalSearchParams does not see them. We read the raw incoming URL and
 * parse the fragment ourselves.
 *
 * Requires "axis://reset-password" to be listed in the Supabase dashboard
 * under Authentication -> URL Configuration -> Redirect URLs.
 */

import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import { CheckCircle, Lock } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { Button } from "@/src/components/Button";
import { InputField } from "@/src/components/InputField";
import { PageHeader } from "@/src/components/PageHeader";
import { LoadingState } from "@/src/components/LoadingState";
import { authService } from "@/src/services/auth";

const MIN_PASSWORD_LENGTH = 8;

/** Pull a value out of either the fragment or the query string of a URL. */
function readTokenParam(url: string, key: string): string | null {
  const fragmentIndex = url.indexOf("#");
  if (fragmentIndex !== -1) {
    const params = new URLSearchParams(url.slice(fragmentIndex + 1));
    const value = params.get(key);
    if (value) return value;
  }
  const queryIndex = url.indexOf("?");
  if (queryIndex !== -1) {
    const end = fragmentIndex === -1 ? url.length : fragmentIndex;
    const params = new URLSearchParams(url.slice(queryIndex + 1, end));
    return params.get(key);
  }
  return null;
}

export default function ResetPasswordScreen() {
  const initialUrl = Linking.useURL();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resolveToken() {
      // useURL() gives the URL that opened the app while it was running;
      // getInitialURL covers a cold start from the emailed link.
      const url = initialUrl || (await Linking.getInitialURL());
      if (cancelled) return;

      if (!url) {
        setLinkError("Open this screen from the reset link in your email.");
        setResolving(false);
        return;
      }

      const errorDescription = readTokenParam(url, "error_description");
      if (errorDescription) {
        setLinkError(decodeURIComponent(errorDescription.replace(/\+/g, " ")));
        setResolving(false);
        return;
      }

      const token = readTokenParam(url, "access_token");
      if (!token) {
        setLinkError("This reset link is incomplete. Please request a new one.");
      } else {
        setAccessToken(token);
      }
      setResolving(false);
    }

    resolveToken();
    return () => {
      cancelled = true;
    };
  }, [initialUrl]);

  async function handleSubmit() {
    if (!accessToken) return;
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await authService.confirmPasswordReset(accessToken, password);
      setDone(true);
    } catch {
      setError(
        "Could not update your password. The link may have expired — request a new one.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (resolving) {
    return (
      <View style={styles.container}>
        <PageHeader title="Reset Password" onBack={() => router.replace("/login")} />
        <LoadingState message="Checking your reset link…" />
      </View>
    );
  }

  if (done) {
    return (
      <View style={styles.container}>
        <PageHeader title="" onBack={() => router.replace("/login")} />
        <View style={styles.centered}>
          <View style={styles.iconWrap}>
            <CheckCircle size={40} color={Colors.success} />
          </View>
          <Text style={styles.title}>Password updated</Text>
          <Text style={styles.description}>
            You can now sign in with your new password.
          </Text>
          <View style={{ height: Spacing.xl }} />
          <Button
            label="Go to Sign In"
            onPress={() => router.replace("/login")}
            fullWidth
            size="lg"
          />
        </View>
      </View>
    );
  }

  if (linkError) {
    return (
      <View style={styles.container}>
        <PageHeader title="Reset Password" onBack={() => router.replace("/login")} />
        <View style={styles.centered}>
          <Text style={styles.title}>Link not valid</Text>
          <Text style={styles.description}>{linkError}</Text>
          <View style={{ height: Spacing.xl }} />
          <Button
            label="Request a new link"
            onPress={() => router.replace("/forgot-password")}
            fullWidth
            size="lg"
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader title="Reset Password" onBack={() => router.replace("/login")} />
      <View style={styles.form}>
        <Text style={styles.description}>
          Choose a new password for your account.
        </Text>
        <View style={{ height: Spacing.xl }} />
        <InputField
          label="New password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          secureTextEntry
          autoCapitalize="none"
          leftIcon={<Lock size={20} color={Colors.textMuted} />}
        />
        <View style={{ height: Spacing.md }} />
        <InputField
          label="Confirm new password"
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Re-enter your new password"
          secureTextEntry
          autoCapitalize="none"
          leftIcon={<Lock size={20} color={Colors.textMuted} />}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={{ height: Spacing.xl }} />
        <Button
          label="Update Password"
          onPress={handleSubmit}
          loading={submitting}
          disabled={!password || !confirm}
          fullWidth
          size="lg"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  form: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: FontSize.title,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  description: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    lineHeight: 24,
    textAlign: "center",
  },
  error: { marginTop: Spacing.md, fontSize: FontSize.caption, color: Colors.danger },
});
