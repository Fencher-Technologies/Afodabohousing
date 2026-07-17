import { useState } from "react";
import { StyleSheet, Text, View, Alert } from "react-native";
import { router } from "expo-router";

import { ApiError } from "@/src/lib/api-client";
import { Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Button } from "@/src/components/Button";
import { InputField } from "@/src/components/InputField";
import { PageHeader } from "@/src/components/PageHeader";
import { useAuth } from "@/src/context/auth-context";

export default function EditProfileScreen() {
  const { user, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert("Required", "Full name is required.");
      return;
    }
    setLoading(true);
    try {
      await updateProfile({ full_name: fullName.trim(), phone: phone.trim() });
      Alert.alert("Saved", "Profile updated successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.replace("/login");
        return;
      }
      Alert.alert("Error", "Could not update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <PageHeader title="Edit Profile" onBack={() => router.back()} />

      <View style={styles.content}>
        <InputField label="Full Name" value={fullName} onChangeText={setFullName} />
        <View style={{ height: Spacing.md }} />
        <View style={styles.emailField}>
          <Text style={styles.emailLabel}>Email</Text>
          <Text style={styles.emailValue}>{user?.email ?? "—"}</Text>
          <Text style={styles.emailHint}>Email cannot be changed.</Text>
        </View>
        <View style={{ height: Spacing.md }} />
        <InputField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

        <View style={{ height: Spacing.xl }} />
        <Button label="Save Changes" onPress={handleSave} fullWidth size="lg" loading={loading} />
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
  emailField: {
    gap: 4,
  },
  emailLabel: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.textSecondary,
  },
  emailValue: {
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    paddingVertical: 8,
  },
  emailHint: {
    fontSize: FontSize.micro,
    color: Colors.textMuted,
    fontStyle: "italic",
  },
});
