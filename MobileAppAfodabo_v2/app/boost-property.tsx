import { useState, useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View, Alert, Linking, BackHandler } from "react-native";
import { WebView } from "react-native-webview";
import { router, useLocalSearchParams } from "expo-router";
import { Sparkles, ArrowLeft, X, Loader2 } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Card } from "@/src/components/Card";
import { Button } from "@/src/components/Button";
import { Badge } from "@/src/components/Badge";
import { LoadingState } from "@/src/components/LoadingState";
import { ErrorState } from "@/src/components/ErrorState";
import { boostsService } from "@/src/services/boosts";
import { useAuth } from "@/src/context/auth-context";
import { SubscriptionGate } from "@/src/components/SubscriptionGate";
import type { BoostPackage } from "@/src/types";
import { api } from "@/src/lib/api-client";
import { API_BASE_URL } from "@/constants/config";

const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 120000;

type PaymentStatus = "idle" | "waiting_payment" | "success" | "failed" | "timeout";

export default function BoostPropertyScreen() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const { subscription } = useAuth();
  const isExpired = subscription?.status !== "active";
  const [showGate, setShowGate] = useState(false);
  const [packages, setPackages] = useState<BoostPackage[]>([]);
  const [selectedDays, setSelectedDays] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  const boostIdRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const webViewRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const pkgs = await boostsService.fetchPackages();
        setPackages(pkgs);
        if (pkgs.length > 0) setSelectedDays(pkgs[0].days);
      } catch {
        setError("Could not load boost packages.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stopPolling = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    pollTimerRef.current = null;
    timeoutTimerRef.current = null;
  };

  const startPolling = (boostId: string) => {
    stopPolling();
    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await api.get<{ status: string; payment_status?: string }>(
          `/payments/pesapal/status?reference=${encodeURIComponent(boostId)}`
        );
        if (res.status === "active" || res.status === "completed" || res.payment_status === "completed") {
          stopPolling();
          setPaymentStatus("success");
        } else if (res.status === "failed" || res.status === "cancelled" || res.status === "expired") {
          stopPolling();
          setPaymentStatus("failed");
        }
      } catch {
        // poll silently; timeout handles the dead end
      }
    }, POLL_INTERVAL_MS);

    timeoutTimerRef.current = setTimeout(() => {
      stopPolling();
      setPaymentStatus("timeout");
    }, POLL_TIMEOUT_MS);
  };

  const handlePurchase = async () => {
    if (isExpired) {
      setShowGate(true);
      return;
    }
    if (!selectedDays) {
      Alert.alert("Missing info", "Select a package to continue.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await boostsService.initiateBoost(propertyId, selectedDays, API_BASE_URL);
      boostIdRef.current = result.reference;
      if (result.redirect_url) {
        setPaymentUrl(result.redirect_url);
        setPaymentComplete(false);
      }
    } catch (e: any) {
      Alert.alert("Payment failed", e.message || "Could not initiate payment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClosePayment = () => {
    stopPolling();
    setPaymentUrl(null);
    setPaymentComplete(false);
    setPaymentStatus("idle");
  };

  const handleNavigationStateChange = (navState: any) => {
    const url = navState.url || "";
    // Detect when Pesapal redirects back to our callback URL
    if (url.startsWith(API_BASE_URL) && url.includes("/payment/status")) {
      webViewRef.current?.stopLoading();
      setPaymentUrl(null);
      setPaymentComplete(true);
      setPaymentStatus("waiting_payment");
      if (boostIdRef.current) startPolling(boostIdRef.current);
      else setPaymentStatus("timeout");
    }
  };

  if (loading) {
    return <LoadingState message="Loading boost packages…" />;
  }

  if (error) {
    return (
      <Screen scroll>
        <ErrorState title="Error" description={error} onRetry={() => router.back()} />
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

  // Show success state
  if (paymentStatus === "success") {
    return (
      <Screen scroll style={styles.successScreen}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Sparkles size={48} color={Colors.gold} />
          </View>
          <Text style={styles.successTitle}>Payment Successful</Text>
          <Text style={styles.successText}>
            Your payment was confirmed. Your property is now boosted.
          </Text>
          <View style={{ marginTop: Spacing.xl, width: "100%" }}>
            <Button
              label="Back to Property"
              onPress={() => router.back()}
              variant="outline"
              fullWidth
            />
          </View>
        </View>
      </Screen>
    );
  }

  // Show failed state
  if (paymentStatus === "failed") {
    return (
      <Screen scroll style={styles.successScreen}>
        <View style={styles.successContainer}>
          <View style={[styles.successIcon, styles.failedIcon]}>
            <X size={48} color={Colors.danger} />
          </View>
          <Text style={styles.successTitle}>Payment Failed</Text>
          <Text style={styles.successText}>
            Your payment could not be completed. Please try again.
          </Text>
          <View style={{ marginTop: Spacing.xl, width: "100%" }}>
            <Button
              label="Try Again"
              onPress={() => setPaymentStatus("idle")}
              fullWidth
              tone="primary"
            />
          </View>
        </View>
      </Screen>
    );
  }

  // Show timeout state
  if (paymentStatus === "timeout") {
    return (
      <Screen scroll style={styles.successScreen}>
        <View style={styles.successContainer}>
          <View style={[styles.successIcon, styles.failedIcon]}>
            <X size={48} color={Colors.danger} />
          </View>
          <Text style={styles.successTitle}>Payment Timed Out</Text>
          <Text style={styles.successText}>
            We did not receive a confirmation yet. If you completed the payment, it may take a moment to reflect.
          </Text>
          <View style={{ marginTop: Spacing.xl, width: "100%" }}>
            <Button
              label="Check Again"
              onPress={() => {
                setPaymentStatus("waiting_payment");
                if (boostIdRef.current) startPolling(boostIdRef.current);
              }}
              fullWidth
              tone="primary"
            />
          </View>
        </View>
      </Screen>
    );
  }

  // Show waiting/polling state
  if (paymentStatus === "waiting_payment") {
    return (
      <Screen scroll style={styles.successScreen}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Loader2 size={48} color={Colors.gold} />
          </View>
          <Text style={styles.successTitle}>Payment Initiated</Text>
          <Text style={styles.successText}>
            Your payment is being confirmed with Pesapal automatically.
          </Text>
          <Text style={styles.pollingText}>Waiting for payment confirmation…</Text>
        </View>
      </Screen>
    );
  }

  const selectedPkg = packages.find((p) => p.days === selectedDays);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Button
            label=""
            onPress={() => router.back()}
            variant="ghost"
            leftIcon={<ArrowLeft size={20} color={Colors.textPrimary} />}
          />
          <Text style={styles.title}>Boost Property</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <Text style={styles.subtitle}>
        Promote your property to appear first in search results.
      </Text>

      {/* Package Selection */}
      <View style={styles.packagesSection}>
        <Text style={styles.sectionTitle}>Select Package</Text>
        <View style={styles.packagesList}>
          {packages.map((pkg) => {
            const isSelected = selectedDays === pkg.days;
            return (
              <Pressable key={pkg.days} onPress={() => setSelectedDays(pkg.days)}>
              <Card
                padding="md"
                style={{
                  ...styles.packageCard,
                  ...(isSelected ? styles.packageCardSelected : {}),
                }}
              >
                <View style={styles.packageRow}>
                  <View style={styles.packageInfo}>
                    <Text style={{...styles.packageLabel, ...(isSelected ? styles.packageLabelSelected : {})}}>
                      {pkg.label}
                    </Text>
                    <Text style={styles.packagePrice}>
                      UGX {pkg.price.toLocaleString()}
                    </Text>
                  </View>
                  {isSelected && (
                    <Badge label="Selected" tone="gold" size="sm" />
                  )}
                </View>
              </Card>
            </Pressable>
            );
          })}
        </View>
      </View>

      {/* Total */}
      {selectedPkg && (
        <Card padding="md" style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total to Pay</Text>
            <Text style={styles.totalAmount}>
              UGX {selectedPkg.price.toLocaleString()}
            </Text>
          </View>
        </Card>
      )}

      {/* Submit */}
      <View style={styles.paySection}>
        <Button
          label="Proceed to Payment"
          onPress={handlePurchase}
          fullWidth
          size="lg"
          tone="primary"
          loading={submitting}
          leftIcon={<Sparkles size={20} color={Colors.textOnPrimary} />}
          disabled={!selectedDays}
        />
        <Text style={styles.payHelper}>
          You'll be redirected to our secure payment partner where you can choose your preferred payment method.
        </Text>
      </View>

      <View style={{ height: 100 }} />

      <SubscriptionGate
        visible={showGate}
        actionLabel="boosting properties"
        onClose={() => setShowGate(false)}
        onRenew={() => {
          setShowGate(false);
          router.push("/subscription");
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: FontSize.title,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: FontSize.body,
    color: Colors.textMuted,
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  packagesSection: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  packagesList: {
    gap: Spacing.sm,
  },
  packageCard: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  packageCardSelected: {
    borderColor: Colors.gold,
    backgroundColor: Colors.goldSoft,
  },
  packageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  packageInfo: {
    flex: 1,
  },
  packageLabel: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  packageLabelSelected: {
    color: "#8A6D2F",
  },
  packagePrice: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  paySection: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  payHelper: {
    marginTop: Spacing.md,
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
  },
  totalCard: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  totalAmount: {
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
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
  successScreen: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  successContainer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 80,
    alignItems: "center",
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.goldSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  failedIcon: {
    backgroundColor: Colors.dangerSoft,
  },
  pollingText: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    fontStyle: "italic",
  },
  successTitle: {
    fontSize: FontSize.title,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  successText: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: Spacing.sm,
  },
});