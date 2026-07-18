import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Crown, Phone, ShieldCheck, CheckCircle, XCircle, Smartphone, Loader } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Card } from "@/src/components/Card";
import { Button } from "@/src/components/Button";
import { InputField } from "@/src/components/InputField";
import { PageHeader } from "@/src/components/PageHeader";
import { useAuth } from "@/src/context/auth-context";
import { useSubscriptionPlans, useCreateSubscription } from "@/src/hooks/useSubscriptions";
import { subscriptionsService } from "@/src/services/subscriptions";

const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 120000;

type PaymentStatus = "idle" | "processing" | "waiting_payment" | "success" | "failed" | "timeout";

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: string;
  recommended: boolean;
}

const SUPPORTED_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "mobile_money",
    name: "Mobile Money (Recommended)",
    description: "MTN or Airtel — instant payment",
    icon: "phone",
    recommended: true,
  },
];

export default function SubscriptionPaymentScreen() {
  const { user } = useAuth();
  const { plan } = useLocalSearchParams<{ plan: string }>();
  const { data: plans } = useSubscriptionPlans();
  const createSubscription = useCreateSubscription();
  const selectedPlan = plans?.find((p) => p.id === plan);
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [responseMessage, setResponseMessage] = useState("");
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    };
  }, []);

  const startPolling = () => {
    pollTimerRef.current = setInterval(async () => {
      try {
        const current = await subscriptionsService.getCurrent();
        if (current?.status === "active") {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
          setStatus("success");
          setTimeout(() => router.replace("/subscription"), 2000);
        }
      } catch {
        // poll silently
      }
    }, POLL_INTERVAL_MS);

    timeoutTimerRef.current = setTimeout(() => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      setStatus("timeout");
    }, POLL_TIMEOUT_MS);
  };

  const handlePay = async () => {
    if (!phone.trim()) {
      Alert.alert("Phone required", "Please enter your phone number to proceed.");
      return;
    }
    setStatus("processing");
    try {
      const result = await createSubscription.mutateAsync({ plan_id: plan, phone_number: phone.trim() || undefined });
      setResponseMessage(result.message || "Check your phone for the payment prompt.");
      setStatus("waiting_payment");
      startPolling();
    } catch {
      setStatus("failed");
    }
  };

  if (!selectedPlan) {
    return (
      <Screen scroll>
        <PageHeader title="Payment" onBack={() => router.back()} />
        <Text style={styles.errorText}>No plan selected. Please go back and select a plan.</Text>
      </Screen>
    );
  }

  if (status === "success") {
    return (
      <Screen scroll>
        <PageHeader title="" onBack={() => router.back()} />
        <View style={styles.resultWrap}>
          <View style={styles.resultIcon}>
            <CheckCircle size={48} color={Colors.success} />
          </View>
          <Text style={styles.resultTitle}>Payment Successful!</Text>
          <Text style={styles.resultDescription}>
            Your {selectedPlan.name} subscription is now active.{"\n"}
            You have full access to all features.
          </Text>
          <Text style={styles.redirectText}>Redirecting to dashboard…</Text>
        </View>
      </Screen>
    );
  }

  if (status === "failed") {
    return (
      <Screen scroll>
        <PageHeader title="" onBack={() => router.back()} />
        <View style={styles.resultWrap}>
          <View style={[styles.resultIcon, styles.resultIconFailed]}>
            <XCircle size={48} color={Colors.danger} />
          </View>
          <Text style={styles.resultTitle}>Payment Failed</Text>
          <Text style={styles.resultDescription}>
            Your payment could not be processed. Please try again.
          </Text>
          <View style={{ height: Spacing.lg }} />
          <Button label="Try Again" onPress={() => setStatus("idle")} fullWidth size="lg" />
        </View>
      </Screen>
    );
  }

  if (status === "timeout") {
    return (
      <Screen scroll>
        <PageHeader title="" onBack={() => router.back()} />
        <View style={styles.resultWrap}>
          <View style={[styles.resultIcon, styles.resultIconFailed]}>
            <XCircle size={48} color={Colors.danger} />
          </View>
          <Text style={styles.resultTitle}>Payment Timed Out</Text>
          <Text style={styles.resultDescription}>
            We didn't receive a payment confirmation.{"\n"}
            If you already entered your PIN, please wait — it may take a moment.
          </Text>
          <View style={{ height: Spacing.lg }} />
          <Button label="Check Status" onPress={() => { setStatus("waiting_payment"); startPolling(); }} fullWidth size="lg" tone="primary" />
          <View style={{ height: Spacing.sm }} />
          <Button label="Try Again" onPress={() => setStatus("idle")} fullWidth size="lg" />
        </View>
      </Screen>
    );
  }

  if (status === "waiting_payment") {
    return (
      <Screen scroll>
        <PageHeader title="" onBack={() => router.back()} />
        <View style={styles.resultWrap}>
          <View style={styles.spinnerIcon}>
            <Loader size={48} color={Colors.primary} />
          </View>
          <Text style={styles.resultTitle}>Payment Initiated</Text>
          <Text style={styles.resultDescription}>
            {responseMessage}
          </Text>
          <View style={styles.phoneHint}>
            <Smartphone size={20} color={Colors.primary} />
            <Text style={styles.phoneHintText}>
              1. Check your phone for a payment prompt{"\n"}
              2. Enter your Mobile Money PIN{"\n"}
              3. Wait for confirmation
            </Text>
          </View>
          <Text style={styles.pollingText}>Waiting for payment confirmation…</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <PageHeader title="Payment" onBack={() => router.back()} />

      <View style={styles.content}>
        {/* Plan Summary */}
        <Card padding="lg" style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryIconWrap}>
              <Crown size={22} color={Colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryPlanName}>{selectedPlan.name}</Text>
              <Text style={styles.summaryDuration}>{selectedPlan.duration_days} days</Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Price (USD)</Text>
            <Text style={styles.summaryValue}>${selectedPlan.price_usd}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Price (UGX)</Text>
            <Text style={styles.summaryValue}>UGX {selectedPlan.price_ugx.toLocaleString()}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotal}>Total</Text>
            <Text style={styles.summaryTotalValue}>UGX {selectedPlan.price_ugx.toLocaleString()}</Text>
          </View>
        </Card>

        {/* Benefits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What you get</Text>
          {selectedPlan.benefits.map((benefit) => (
            <View key={benefit} style={styles.benefitRow}>
              <CheckCircle size={16} color={Colors.success} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        {/* Payment Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          {SUPPORTED_PAYMENT_METHODS.map((method) => (
            <View
              key={method.id}
              style={[
                styles.methodField,
                method.recommended && styles.methodFieldRecommended,
              ]}
            >
              <Phone size={18} color={method.recommended ? Colors.accent : Colors.primary} />
              <Text style={styles.methodText}>{method.name}</Text>
              {method.recommended && (
                <View style={styles.methodRecommendedBadge}>
                  <Text style={styles.methodRecommendedText}>Recommended</Text>
                </View>
              )}
            </View>
          ))}

          <View style={{ height: Spacing.md }} />

          <InputField
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            placeholder="2567XX XXX XXX"
            keyboardType="phone-pad"
            leftIcon={<Phone size={20} color={Colors.textMuted} />}
          />
        </View>

        {/* Security Note */}
        <View style={styles.securityNote}>
          <ShieldCheck size={16} color={Colors.textMuted} />
          <Text style={styles.securityText}>
            Your payment is processed securely by NylonPay. We don't store your financial details.
          </Text>
        </View>

        <Button
          label={status === "processing" ? "Processing…" : "Pay Now"}
          onPress={handlePay}
          loading={status === "processing"}
          fullWidth
          size="lg"
          tone="gold"
          leftIcon={status === "processing" ? undefined : <Crown size={20} color={Colors.textOnGold} />}
        />
      </View>

      <View style={{ height: 100 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.lg,
  },
  errorText: {
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.body,
    color: Colors.danger,
  },
  summaryCard: {
    gap: Spacing.sm,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  summaryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryPlanName: {
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  summaryDuration: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryLabel: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  summaryTotal: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  summaryTotalValue: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  benefitText: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
  },
  methodField: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    borderRadius: Radii.input,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    minHeight: 52,
  },
  methodFieldRecommended: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSoft,
  },
  methodRecommendedBadge: {
    marginLeft: "auto",
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radii.pill,
  },
  methodRecommendedText: {
    fontSize: FontSize.micro,
    fontWeight: FontWeight.bold,
    color: "#FFFFFF",
  },
  methodText: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
  },
  securityNote: {
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.card,
  },
  securityText: {
    flex: 1,
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    lineHeight: 20,
  },
  resultWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  resultIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.successSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  resultIconFailed: {
    backgroundColor: Colors.dangerSoft,
  },
  spinnerIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  resultTitle: {
    fontSize: FontSize.title,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  resultDescription: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  phoneHint: {
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.card,
    alignItems: "flex-start",
    width: "100%",
  },
  phoneHintText: {
    flex: 1,
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  pollingText: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    fontStyle: "italic",
  },
  redirectText: {
    fontSize: FontSize.caption,
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
    marginTop: Spacing.sm,
  },
});
