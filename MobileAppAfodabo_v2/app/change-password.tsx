import { useState } from "react";
import { StyleSheet, Text, View, Alert } from "react-native";
import { router } from "expo-router";
import { Lock } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Button } from "@/src/components/Button";
import { InputField } from "@/src/components/InputField";
import { PageHeader } from "@/src/components/PageHeader";
import { useAuth } from "@/src/context/auth-context";

export default function ChangePasswordScreen() {
  const { signOut } = useAuth();
  const [current, setCurrent] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async () => {
    setError(null);
    if (!current || !newPwd || !confirm) {
      setError("Please fill in all fields");
      return;
    }
    if (newPwd.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }
    if (newPwd !== confirm) {
      setError("New passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { authService } = await import("@/src/services/auth");
      await authService.changePassword(current, newPwd);
      await signOut();
      Alert.alert(
        "Password Changed",
        "Please sign in with your new password.",
        [{ text: "OK", onPress: () => router.replace("/login") }]
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Could not change password. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <PageHeader title="Change Password" onBack={() => router.back()} />

      <View style={styles.content}>
        <InputField label="Current Password" value={current} onChangeText={setCurrent} secureTextEntry leftIcon={<Lock size={20} color={Colors.textMuted} />} />
        <View style={{ height: Spacing.md }} />
        <InputField label="New Password" value={newPwd} onChangeText={setNewPwd} secureTextEntry leftIcon={<Lock size={20} color={Colors.textMuted} />} error={error} />
        <View style={{ height: Spacing.md }} />
        <InputField label="Confirm New Password" value={confirm} onChangeText={setConfirm} secureTextEntry leftIcon={<Lock size={20} color={Colors.textMuted} />} />

        <View style={{ height: Spacing.xl }} />
        <Button label="Change Password" onPress={handleChange} fullWidth size="lg" loading={loading} />
      </View>
      <View style={{ height: 100 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
});
