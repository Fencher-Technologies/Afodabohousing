import { useState } from "react";
import { StyleSheet, Text, View, Alert } from "react-native";
import { router } from "expo-router";
import { Lock } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Button } from "@/src/components/Button";
import { InputField } from "@/src/components/InputField";
import { PageHeader } from "@/src/components/PageHeader";
import { authService } from "@/src/services/auth";

export default function ChangePinScreen() {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async () => {
    if (currentPin.length < 4) { setError("Enter your current PIN"); return; }
    if (newPin.length < 4 || newPin.length > 6) { setError("New PIN must be 4-6 digits"); return; }
    if (newPin !== confirmPin) { setError("PINs do not match"); return; }
    setLoading(true);
    setError(null);
    try {
      await authService.changePin({ current_pin: currentPin, new_pin: newPin });
      Alert.alert("PIN Changed", "Your PIN has been updated successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change PIN");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <PageHeader title="Change PIN" onBack={() => router.back()} />
      <View style={styles.content}>
        <Text style={styles.description}>Update your phone sign-in PIN.</Text>

        <InputField
          label="Current PIN"
          value={currentPin}
          onChangeText={(t) => setCurrentPin(t.replace(/\D/g, "").slice(0, 6))}
          placeholder="Your current PIN"
          keyboardType="numeric"
          secureTextEntry
          leftIcon={<Lock size={20} color={Colors.textMuted} />}
        />
        <InputField
          label="New PIN (4-6 digits)"
          value={newPin}
          onChangeText={(t) => setNewPin(t.replace(/\D/g, "").slice(0, 6))}
          placeholder="1234"
          keyboardType="numeric"
          secureTextEntry
          leftIcon={<Lock size={20} color={Colors.textMuted} />}
        />
        <InputField
          label="Confirm New PIN"
          value={confirmPin}
          onChangeText={(t) => setConfirmPin(t.replace(/\D/g, "").slice(0, 6))}
          placeholder="Re-enter PIN"
          keyboardType="numeric"
          secureTextEntry
          leftIcon={<Lock size={20} color={Colors.textMuted} />}
          error={error}
        />

        <Button label="Change PIN" onPress={handleChange} loading={loading} fullWidth size="lg" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  description: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
});
