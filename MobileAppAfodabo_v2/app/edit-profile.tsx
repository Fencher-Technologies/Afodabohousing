import { useState } from "react";
import { StyleSheet, Text, View, Alert } from "react-native";
import { router } from "expo-router";
// Phone/Lock/Link icons were only used by the hidden "Phone Sign-In" section. Kept for restore.
// import { Phone, Lock, Link } from "lucide-react-native";

import { ApiError } from "@/src/lib/api-client";
import { Colors, FontSize, FontWeight, Spacing, Radii } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Button } from "@/src/components/Button";
import { InputField } from "@/src/components/InputField";
import { PageHeader } from "@/src/components/PageHeader";
import { useAuth } from "@/src/context/auth-context";
import { authService } from "@/src/services/auth";
import { PhoneField } from "@/src/components/PhoneField";
import { CurrencyField } from "@/src/components/CurrencyField";
import { DEFAULT_CURRENCY } from "@/src/utils/currencies";

export default function EditProfileScreen() {
  const { user, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [displayCurrency, setDisplayCurrency] = useState(user?.display_currency ?? DEFAULT_CURRENCY);
  const [linkPhone, setLinkPhone] = useState("");
  const [linkPin, setLinkPin] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [verifyToken, setVerifyToken] = useState<string | null>(null);
  const [linkStep, setLinkStep] = useState<"form" | "otp">("form");
  const [loading, setLoading] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert("Required", "Full name is required.");
      return;
    }
    setLoading(true);
    try {
      await updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim(),
        display_currency: displayCurrency,
      });
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

  const handleLinkSendOtp = async () => {
    if (!linkPhone.trim()) { setError("Enter a phone number"); return; }
    setLinkLoading(true);
    setError(null);
    try {
      await authService.sendOtp(linkPhone.trim());
      setLinkStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setLinkLoading(false);
    }
  };

  const handleLinkVerifyOtp = async () => {
    if (otp.length < 4) { setError("Enter the verification code"); return; }
    setLinkLoading(true);
    setError(null);
    try {
      const result = await authService.verifyOtp(linkPhone.trim(), otp);
      if (!result.valid || !result.verify_token) {
        setError(result.message || "Verification failed");
        return;
      }
      setVerifyToken(result.verify_token);
      await handleLinkPhone(result.verify_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLinkLoading(false);
    }
  };

  const handleLinkPhone = async (vt: string) => {
    if (linkPin.length < 4) { setError("PIN must be at least 4 digits"); return; }
    if (!currentPassword) { setError("Enter your current password"); return; }
    setLinkLoading(true);
    setError(null);
    try {
      await authService.linkPhone({ phone: linkPhone.trim(), pin: linkPin, current_password: currentPassword });
      Alert.alert("Phone Linked", "You can now sign in with your phone number and PIN.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link phone");
    } finally {
      setLinkLoading(false);
    }
  };

  const hasPin = user?.phone && false; // simplified check; backend will validate
  const isPhoneLinked = !!user?.phone;

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
        <PhoneField label="Phone" value={phone} onChangeText={setPhone} />

        {(user?.role === "manager" || user?.role === "admin") && (
          <>
            <View style={{ height: Spacing.md }} />
            <CurrencyField
              label="Currency for totals"
              value={displayCurrency}
              onChange={setDisplayCurrency}
              hint="Dashboard and report totals use this currency, converted at current exchange rates. Each property keeps its own currency for rent, payments and receipts."
            />
          </>
        )}

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
  sectionDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  sectionHint: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
});
