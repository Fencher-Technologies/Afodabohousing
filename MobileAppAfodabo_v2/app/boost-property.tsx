import { useState, useEffect } from "react";
import { Pressable, StyleSheet, Text, View, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Sparkles, Phone, ArrowLeft } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { Card } from "@/src/components/Card";
import { Button } from "@/src/components/Button";
import { Badge } from "@/src/components/Badge";
import { InputField } from "@/src/components/InputField";
import { LoadingState } from "@/src/components/LoadingState";
import { ErrorState } from "@/src/components/ErrorState";
import { boostsService } from "@/src/services/boosts";
import type { BoostPackage } from "@/src/types";

export default function BoostPropertyScreen() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const [packages, setPackages] = useState<BoostPackage[]>([]);
  const [selectedDays, setSelectedDays] = useState<number | null>(null);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initiated, setInitiated] = useState(false);

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

  const handlePurchase = async () => {
    if (!selectedDays || !phone.trim()) {
      Alert.alert("Missing info", "Select a package and enter your phone number.");
      return;
    }
    setSubmitting(true);
    try {
      await boostsService.initiateBoost(propertyId, selectedDays, phone.trim());
      setInitiated(true);
    } catch (e: any) {
      Alert.alert("Payment failed", e.message || "Could not initiate payment. Please try again.");
    } finally {
      setSubmitting(false);
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

  if (initiated) {
    return (
      <Screen scroll>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Sparkles size={48} color={Colors.gold} />
          </View>
          <Text style={styles.successTitle}>Payment Initiated</Text>
          <Text style={styles.successText}>
            Check your phone for the payment prompt from NylonPay. Enter your
            Mobile Money PIN to complete the payment.
          </Text>
          <Text style={styles.successText}>
            Once the payment is confirmed, your property will automatically be
            boosted. This usually takes a few minutes.
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

      {/* Phone Input */}
      <View style={styles.phoneSection}>
        <Text style={styles.sectionTitle}>Mobile Money Number</Text>
        <InputField
          value={phone}
          onChangeText={setPhone}
          placeholder="e.g. 256788100145"
          keyboardType="phone-pad"
          leftIcon={<Phone size={18} color={Colors.textMuted} />}
        />
        <Text style={styles.phoneHint}>
          Enter the phone number where you will receive the payment prompt.
        </Text>
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
      <Button
        label="Pay with Mobile Money"
        onPress={handlePurchase}
        fullWidth
        size="lg"
        tone="primary"
        loading={submitting}
        leftIcon={<Sparkles size={20} color={Colors.textOnPrimary} />}
        disabled={!selectedDays || !phone.trim()}
      />

      <View style={{ height: 100 }} />
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
  phoneSection: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  phoneHint: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
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