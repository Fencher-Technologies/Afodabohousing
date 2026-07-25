import { useState } from "react";
import { StyleSheet, Text, View, Alert } from "react-native";
import { router } from "expo-router";
import { Phone, Lock, Link } from "lucide-react-native";

import { ApiError } from "@/src/lib/api-client";
import { Colors, FontSize, FontWeight, Spacing, Radii } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Button } from "@/src/components/Button";
import { InputField } from "@/src/components/InputField";
import { PageHeader } from "@/src/components/PageHeader";
import { useAuth } from "@/src/context/auth-context";
import { authService } from "@/src/services/auth";

export default function EditProfileScreen() {
  const { user, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
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
        <InputField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

        <View style={{ height: Spacing.xl }} />
        <Button label="Save Changes" onPress={handleSave} fullWidth size="lg" loading={loading} />

        <View style={styles.sectionDivider} />

        <Text style={styles.sectionTitle}>Phone Sign-In</Text>
        <Text style={styles.sectionHint}>
          {isPhoneLinked ? "Your phone is linked. You can change your PIN below." : "Link a phone number to sign in with your phone and PIN."}
        </Text>

        {!isPhoneLinked && linkStep === "form" && (
          <>
            <InputField
              label="Phone Number"
              value={linkPhone}
              onChangeText={setLinkPhone}
              placeholder="+2567XX XXX XXX"
              keyboardType="phone-pad"
              autoCapitalize="none"
              leftIcon={<Phone size={20} color={Colors.textMuted} />}
            />
            <InputField
              label="Create PIN (4-6 digits)"
              value={linkPin}
              onChangeText={(t) => setLinkPin(t.replace(/\D/g, "").slice(0, 6))}
              placeholder="1234"
              keyboardType="numeric"
              secureTextEntry
              leftIcon={<Lock size={20} color={Colors.textMuted} />}
            />
            <InputField
              label="Current Password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Your current email password"
              secureTextEntry
              leftIcon={<Lock size={20} color={Colors.textMuted} />}
              error={error}
            />
            <View style={{ height: Spacing.lg }} />
            <Button label="Send Verification Code" onPress={handleLinkSendOtp} loading={linkLoading} fullWidth size="lg" />
          </>
        )}

        {!isPhoneLinked && linkStep === "otp" && (
          <>
            <InputField
              label="Verification Code"
              value={otp}
              onChangeText={(t) => setOtp(t.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              keyboardType="numeric"
              leftIcon={<Link size={20} color={Colors.textMuted} />}
              error={error}
            />
            <Button label="Verify & Link Phone" onPress={handleLinkVerifyOtp} loading={linkLoading} fullWidth size="lg" />
          </>
        )}

        {isPhoneLinked && (
          <Button
            label="Change PIN"
            onPress={() => router.push("/change-pin")}
            variant="outline"
            fullWidth
            size="lg"
          />
        )}
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
