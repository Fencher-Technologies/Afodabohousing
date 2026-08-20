import { useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Alert,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  Wallet,
  CheckCircle,
  Upload,
  X,
  Camera,
  ShieldCheck,
} from "lucide-react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { PageHeader } from "@/src/components/PageHeader";
import { InputField } from "@/src/components/InputField";
import { SelectField } from "@/src/components/SelectField";
import { Button } from "@/src/components/Button";
import { Card } from "@/src/components/Card";
import { EmptyState } from "@/src/components/EmptyState";
import { useTenancyList } from "@/src/hooks/useTenancies";
import { useCreateVerification } from "@/src/hooks/usePaymentVerifications";
import { paymentVerificationsService } from "@/src/services/payment-verifications";
import { formatUGX } from "@/src/utils/format";

const PAYMENT_METHODS = [
  { label: "Cash", value: "cash" },
  { label: "Mobile Money (MTN/Airtel)", value: "mobile_money" },
  { label: "Bank Transfer", value: "bank_transfer" },
  { label: "Bank Deposit", value: "bank" },
  { label: "Cheque", value: "check" },
  { label: "Other", value: "other" },
];

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function SubmitPaymentScreen() {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [reference, setReference] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayString());
  const [notes, setNotes] = useState("");
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const createVerification = useCreateVerification();
  const { data: tenanciesData, isLoading: tenanciesLoading } = useTenancyList();

  const activeLease = useMemo(() => {
    const items = tenanciesData?.items ?? [];
    return items.find((l) => l.effective_status === "active" || l.status === "active");
  }, [tenanciesData]);

  const hasActiveTenancy = !!activeLease;

  const numAmount = parseFloat(amount);
  const monthlyRent = activeLease?.monthly_rent ?? 0;
  const approxDays =
    monthlyRent > 0 && !isNaN(numAmount) && numAmount > 0
      ? Math.floor((numAmount / monthlyRent) * 30)
      : 0;

  const handlePickScreenshot = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "We need access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setScreenshotUri(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "We need access to your camera.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setScreenshotUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount greater than 0.");
      return;
    }
    if (!paymentMethod) {
      Alert.alert("Payment Method", "Please select a payment method.");
      return;
    }
    if (!paymentDate) {
      Alert.alert("Payment Date", "Please enter the payment date.");
      return;
    }

    let screenshotUrl: string | undefined;
    if (screenshotUri) {
      setUploading(true);
      try {
        const uploadResult = await paymentVerificationsService.uploadScreenshot(screenshotUri);
        screenshotUrl = uploadResult.url;
      } catch {
        Alert.alert("Upload Failed", "Could not upload screenshot. You can submit without it.");
      } finally {
        setUploading(false);
      }
    }

    try {
      await createVerification.mutateAsync({
        amount: numAmount,
        payment_method: paymentMethod,
        transaction_reference: reference || undefined,
        payment_date: paymentDate,
        screenshot_url: screenshotUrl,
        notes: notes || undefined,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Could not submit payment. Please try again.";
      Alert.alert("Submission Failed", msg);
    }
  };

  if (submitted) {
    return (
      <Screen>
        <PageHeader title="Submit Payment" onBack={() => router.back()} />
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <CheckCircle size={64} color={Colors.success} />
          </View>
          <Text style={styles.successTitle}>Payment Submitted</Text>
          <Text style={styles.successText}>
            Your payment of {formatUGX(parseFloat(amount) || 0)} has been submitted for{" "}
            <Text style={{ fontWeight: FontWeight.bold }}>verification</Text>.
          </Text>
          <Card padding="md" style={styles.pendingCard}>
            <View style={styles.pendingRow}>
              <Wallet size={18} color={Colors.accent} />
              <Text style={styles.pendingLabel}>Pending Verification</Text>
            </View>
            <Text style={styles.pendingText}>
              The manager will review your submission and notify you once it is
              approved or rejected.
            </Text>
          </Card>
          <Button
            label="Back to Payments"
            tone="accent"
            onPress={() => router.back()}
          />
          <Button
            label="Submit Another"
            variant="outline"
            tone="muted"
            onPress={() => {
              setSubmitted(false);
              setAmount("");
              setPaymentMethod("");
              setReference("");
              setPaymentDate(todayString());
              setNotes("");
              setScreenshotUri(null);
            }}
          />
        </View>
      </Screen>
    );
  }

  if (!tenanciesLoading && !hasActiveTenancy) {
    return (
      <Screen>
        <PageHeader title="Submit Payment" onBack={() => router.back()} />
        <EmptyState
          icon={<Wallet size={32} color={Colors.primary} />}
          title="You currently do not have an active tenancy"
          description="Submit payment is only available when you have an active tenancy. Browse available homes to find your next place."
          actionLabel="Browse Properties"
          onAction={() => router.push("/guest/explore")}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll keyboardShouldAdjust="resize">
      <PageHeader title="Submit Payment" onBack={() => router.back()} />
      <Text style={styles.subtitle}>
        Notify your manager about a payment you made outside the app. It will be
        verified before being recorded as an official payment.
      </Text>

      <View style={styles.form}>
        <InputField
          label="Amount (UGX)"
          value={amount}
          onChangeText={setAmount}
          placeholder="e.g. 500000"
          keyboardType="numeric"
        />

        {approxDays > 0 && (
          <View style={styles.coveragePreview}>
            <Wallet size={16} color={Colors.accent} />
            <Text style={styles.coverageText}>
              This amount covers about {approxDays} day{approxDays === 1 ? "" : "s"} of rent (30-day months),
              pending manager approval.
            </Text>
          </View>
        )}

        <SelectField
          label="Payment Method"
          value={paymentMethod}
          options={PAYMENT_METHODS}
          onSelect={setPaymentMethod}
          placeholder="Select method"
        />

        <InputField
          label="Reference Number (optional)"
          value={reference}
          onChangeText={setReference}
          placeholder="Transaction ID or reference"
        />

        <InputField
          label="Payment Date"
          value={paymentDate}
          onChangeText={setPaymentDate}
          placeholder="YYYY-MM-DD"
        />

        <InputField
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Any additional information"
          multiline
          numberOfLines={3}
        />

        <Text style={styles.fieldLabel}>Upload Screenshot (optional)</Text>
        {screenshotUri ? (
          <View style={styles.screenshotPreview}>
            <Text style={styles.screenshotText} numberOfLines={1}>
              Screenshot selected
            </Text>
            <Pressable onPress={() => setScreenshotUri(null)} hitSlop={8}>
              <X size={18} color={Colors.danger} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.screenshotButtons}>
            <Pressable style={styles.screenshotBtn} onPress={handlePickScreenshot}>
              <Upload size={20} color={Colors.accent} />
              <Text style={styles.screenshotBtnText}>Choose from Gallery</Text>
            </Pressable>
            <Pressable style={styles.screenshotBtn} onPress={handleTakePhoto}>
              <Camera size={20} color={Colors.accent} />
              <Text style={styles.screenshotBtnText}>Take Photo</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.submitSection}>
          <Button
            label={
              createVerification.isPending || uploading
                ? "Submitting…"
                : "Submit Payment for Verification"
            }
            tone="accent"
            onPress={handleSubmit}
            disabled={createVerification.isPending || uploading}
            leftIcon={
              !createVerification.isPending && !uploading ? (
                <ShieldCheck size={20} color={Colors.textOnPrimary} />
              ) : undefined
            }
          />
          <Text style={styles.disclaimer}>
            This does NOT record an official payment. Your manager must verify it first.
          </Text>
        </View>
      </View>

      <View style={{ height: 100 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  form: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  fieldLabel: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  screenshotButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  screenshotBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: "dashed",
    backgroundColor: Colors.surfaceAlt,
  },
  screenshotBtnText: {
    fontSize: FontSize.body,
    color: Colors.accent,
    fontWeight: FontWeight.semibold,
  },
  screenshotPreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: Radii.card,
    backgroundColor: Colors.successSoft,
  },
  screenshotText: {
    fontSize: FontSize.caption,
    color: Colors.success,
    fontWeight: FontWeight.medium,
    flex: 1,
  },
  disclaimer: {
    fontSize: FontSize.micro,
    color: Colors.textMuted,
    textAlign: "center",
  },
  coveragePreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.accentSoft,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.accent,
    padding: Spacing.md,
  },
  coverageText: {
    flex: 1,
    fontSize: FontSize.caption,
    color: Colors.accent,
    fontWeight: FontWeight.medium,
    lineHeight: 18,
  },
  submitSection: {
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  successContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xxl,
    alignItems: "center",
    gap: Spacing.md,
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.successSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: FontSize.h1,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  successText: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  pendingCard: {
    width: "100%",
    gap: Spacing.sm,
    backgroundColor: Colors.accentSoft,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  pendingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  pendingLabel: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
    color: Colors.accent,
  },
  pendingText: {
    fontSize: FontSize.caption,
    color: Colors.accent,
    lineHeight: 18,
  },
});
