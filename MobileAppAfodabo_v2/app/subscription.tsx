/**
 * SubscriptionScreen — current status + plans inline (merged Dashboard + Plans).
 */

import { useState } from "react";
import { StyleSheet, Text, View, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import { Crown, Check, Zap, Clock, TrendingUp } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Card } from "@/src/components/Card";
import { Badge } from "@/src/components/Badge";
import { Button } from "@/src/components/Button";
import { PageHeader } from "@/src/components/PageHeader";
import { useAuth } from "@/src/context/auth-context";
import { useSubscriptionPlans } from "@/src/hooks/useSubscriptions";
import { useRefresh } from "@/src/hooks/useRefresh";
import { formatDate } from "@/src/utils/format";
import type { SubscriptionPlanId } from "@/src/types";

export default function SubscriptionScreen() {
  const { subscription } = useAuth();
  const { data: plansData, refetch: refetchPlans } = useSubscriptionPlans();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const { refreshing, onRefresh } = useRefresh({ refetches: [refetchPlans] });

  const plans = plansData || [];

  const isActive = subscription?.status === "active";

  const handleContinue = () => {
    if (!selectedPlan) {
      Alert.alert("Select a plan", "Please choose a subscription plan to continue.");
      return;
    }
    router.push(`/subscription-payment?plan=${selectedPlan}`);
  };

  return (
    <Screen scroll onRefresh={onRefresh} refreshing={refreshing}>
      <PageHeader title="Subscription" onBack={() => router.back()} />

      <View style={styles.content}>
        {/* Current Status */}
        <Card padding="lg" style={[styles.statusCard, isActive ? styles.statusActive : styles.statusExpired]}>
          <View style={styles.statusHeader}>
            <View style={styles.statusIconWrap}>
              <Crown size={24} color={isActive ? Colors.gold : Colors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusTitle}>Current Plan</Text>
              <Text style={styles.statusPlan}>{subscription?.plan_name ?? "No plan"}</Text>
            </View>
            <Badge
              label={isActive ? "Active" : "Expired"}
              tone={isActive ? "success" : "danger"}
              dot
            />
          </View>

          {isActive && subscription ? (
            <View>
              <View style={styles.statusDetails}>
                <View style={styles.statusDetailItem}>
                  <Text style={styles.statusDetailLabel}>Expires On</Text>
                  <Text style={styles.statusDetailValue}>{formatDate(subscription.expires_at)}</Text>
                </View>
                <View style={styles.statusDetailItem}>
                  <Text style={styles.statusDetailLabel}>Days Remaining</Text>
                  <Text style={[styles.statusDetailValue, { color: Colors.accent }]}>{subscription.days_remaining} days</Text>
                </View>
              </View>

              <View style={styles.progressWrap}>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${Math.min(100, Math.round((subscription.days_remaining / 365) * 100))}%`,
                        backgroundColor:
                          subscription.days_remaining > 60
                            ? Colors.success
                            : subscription.days_remaining > 14
                            ? Colors.warning
                            : Colors.danger,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          ) : (
            <Text style={styles.expiredText}>
              Your subscription has expired. Renew now to continue managing your properties and tenancies.
            </Text>
          )}
        </Card>

        {/* Plans */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isActive ? "Change Plan" : "Choose Your Plan"}
          </Text>
          <Text style={styles.sectionSubtitle}>
            Unlock unlimited properties, payment recording, reports, and WhatsApp reminders.
          </Text>

          <View style={styles.plans}>
            {plans.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              const isCurrent = subscription?.plan_id === plan.id;
              return (
                <Pressable
                  key={plan.id}
                  onPress={() => setSelectedPlan(plan.id)}
                  style={({ pressed }) => [
                    styles.planCard,
                    isSelected && styles.planCardSelected,
                    plan.popular && styles.planCardPopular,
                    pressed && { opacity: 0.9 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${plan.name} plan, ${plan.price_usd} USD`}
                >
                  {plan.popular && (
                    <View style={styles.popularBadge}>
                      <Zap size={10} color="#FFFFFF" />
                      <Text style={styles.popularText}>POPULAR</Text>
                    </View>
                  )}
                  <View style={styles.planHeader}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    {isCurrent && <Badge label="Current" tone="muted" size="sm" />}
                  </View>
                  <Text style={styles.planPrice}>${plan.price_usd}</Text>
                  <Text style={styles.planPriceUgx}>UGX {plan.price_ugx.toLocaleString()}</Text>
                  <View style={styles.planBenefits}>
                    {plan.benefits.map((benefit) => (
                      <View key={benefit} style={styles.benefitRow}>
                        <Check size={14} color={Colors.success} />
                        <Text style={styles.benefitText}>{benefit}</Text>
                      </View>
                    ))}
                  </View>
                  {isSelected && (
                    <View style={styles.selectedIndicator}>
                      <Check size={16} color={Colors.textOnPrimary} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        <Button
          label="Continue to Payment"
          onPress={handleContinue}
          fullWidth
          size="lg"
          tone="gold"
          disabled={!selectedPlan}
          leftIcon={<Crown size={20} color={Colors.textOnGold} />}
        />

        <Text style={styles.finePrint}>
          Cancel anytime. Payments are processed securely via NylonPay.
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
  statusCard: {
    gap: Spacing.md,
  },
  statusActive: {
    borderWidth: 1.5,
    borderColor: Colors.success,
  },
  statusExpired: {
    borderWidth: 1.5,
    borderColor: Colors.danger,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  statusIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  statusTitle: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  statusPlan: {
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  statusDetails: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  statusDetailItem: { flex: 1 },
  statusDetailLabel: {
    fontSize: FontSize.micro,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
  },
  statusDetailValue: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  expiredText: {
    fontSize: FontSize.body,
    color: Colors.danger,
    lineHeight: 22,
  },
  progressWrap: {
    marginTop: Spacing.xs,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 3,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  plans: {
    gap: Spacing.sm,
  },
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.xs,
    position: "relative",
  },
  planCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  planCardPopular: {
    borderColor: Colors.gold,
    backgroundColor: Colors.accentSoft,
  },
  popularBadge: {
    position: "absolute",
    top: -10,
    right: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radii.pill,
  },
  popularText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: "#FFFFFF",
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  planName: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  planPrice: {
    fontSize: FontSize.title,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  planPriceUgx: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
  },
  planBenefits: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  benefitText: {
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
  },
  selectedIndicator: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  finePrint: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    textAlign: "center",
  },
});
