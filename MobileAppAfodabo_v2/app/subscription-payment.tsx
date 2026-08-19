import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { router, useLocalSearchParams } from "expo-router";
import { Crown, ShieldCheck, CheckCircle, XCircle, Loader2, X } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { API_BASE_URL } from "@/constants/config";
import { Screen } from "@/src/components/Screen";
import { Card } from "@/src/components/Card";
import { Button } from "@/src/components/Button";
import { PageHeader } from "@/src/components/PageHeader";
import { useSubscriptionPlans, useCreateSubscription } from "@/src/hooks/useSubscriptions";
import { subscriptionsService } from "@/src/services/subscriptions";

const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 120000;

type PaymentStatus = "idle" | "processing" | "waiting_payment" | "success" | "failed" | "timeout";

export default function SubscriptionPaymentScreen() {
  const { plan } = useLocalSearchParams<{ plan: string }>();
  const { data: plans } = useSubscriptionPlans();
  const createSubscription = useCreateSubscription();
  const selectedPlan = plans?.find((p) => p.id === plan);
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [responseMessage, setResponseMessage] = useState("");
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const webViewRef = useRef<any>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    };
  }, []);

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
  };

  const startPolling = () => {
    // One active poll loop at a time — a second call (WebView callback,
    // retry, or close-then-reopen) must first kill the previous timer.
    stopPolling();
    pollTimerRef.current = setInterval(async () => {
      try {
        const current = await subscriptionsService.getCurrent();
        if (current?.status === "active") {
          stopPolling();
          setStatus("success");
          setTimeout(() => router.replace("/subscription"), 2000);
        }
      } catch {
        // poll silently
      }
    }, POLL_INTERVAL_MS);

    timeoutTimerRef.current = setTimeout(() => {
      stopPolling();
      setStatus("timeout");
    }, POLL_TIMEOUT_MS);
  };

  const handlePay = async () => {
    setStatus("processing");
    try {
      const result = await createSubscription.mutateAsync({ plan_id: plan, callback_url: API_BASE_URL });
      if (result.redirect_url) {
        setResponseMessage(result.message || "Complete your payment in the Pesapal window.");
        setPaymentUrl(result.redirect_url);
        setPaymentComplete(false);
      } else {
        setResponseMessage(result.message || "Check your phone for the payment prompt.");
        setStatus("waiting_payment");
        startPolling();
      }
    } catch (e) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : "Could not start payment.";
      if (msg.toLowerCase().includes("already have a pending payment")) {
        setResponseMessage(msg);
        setStatus("waiting_payment");
        startPolling();
      } else {
        setResponseMessage(msg);
        setStatus("failed");
      }
    }
  };

  const handleClosePayment = () => {
    stopPolling();
    setPaymentUrl(null);
    setPaymentComplete(false);
    setStatus("idle");
  };

  const handleNavigationStateChange = (navState: any) => {
    const url = navState.url || "";
    // Detect when Pesapal redirects back to our callback URL
    if (url.startsWith(API_BASE_URL) && url.includes("/payment/status")) {
      webViewRef.current?.stopLoading();
      setPaymentUrl(null);
      setPaymentComplete(true);
      setStatus("waiting_payment");
      startPolling();
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

  // Show payment WebView overlay
  if (paymentUrl && !paymentComplete) {
    return (
      <Screen style={styles.paymentOverlay}>
        <View style={styles.paymentHeader}>
          <Text style={styles.paymentTitle}>Complete Payment</Text>
          <Button
            variant="ghost"
            size="sm"
            label=""
            onPress={handleClosePayment}
            leftIcon={<X size={20} color={Colors.textPrimary} />}
          />
        </View>
        <View style={styles.webViewContainer}>
          <WebView
            ref={webViewRef}
            source={{ uri: paymentUrl }}
            style={styles.webView}
            onNavigationStateChange={handleNavigationStateChange}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loadingOverlay}>
                <Loader2 size={32} color={Colors.gold} />
                <Text style={styles.loadingText}>Loading Pesapal…</Text>
              </View>
            )}
            javaScriptEnabled={true}
            domStorageEnabled={true}
          />
        </View>
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
            {responseMessage || "Your payment could not be processed. Please try again."}
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
            We did not receive a payment confirmation.{"\n"}
            If you completed the payment, please check again — it may take a moment.
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
            <Loader2 size={48} color={Colors.primary} />
          </View>
          <Text style={styles.resultTitle}>Payment Initiated</Text>
          <Text style={styles.resultDescription}>
            {responseMessage}
          </Text>
          <View style={styles.phoneHint}>
            <ShieldCheck size={20} color={Colors.primary} />
            <Text style={styles.phoneHintText}>
              Once you complete payment, we will confirm it with PesaPal automatically.
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

        {/* Security Note */}
        <View style={styles.securityNote}>
          <ShieldCheck size={16} color={Colors.textMuted} />
          <Text style={styles.securityText}>
            Your payment is processed securely by PesaPal. We do not store your financial details.
          </Text>
        </View>

        <Button
          label={status === "processing" ? "Processing…" : "Proceed to Payment"}
          onPress={handlePay}
          loading={status === "processing"}
          fullWidth
          size="lg"
          tone="gold"
          leftIcon={status === "processing" ? undefined : <Crown size={20} color={Colors.textOnGold} />}
        />
        <Text style={styles.payHelper}>
          You'll be redirected to our secure payment partner where you can choose your preferred payment method.
        </Text>
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
  payHelper: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
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
  paymentOverlay: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  paymentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  paymentTitle: {
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  webViewContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.surface,
    zIndex: 100,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSize.body,
    color: Colors.textSecondary,
  },
});
