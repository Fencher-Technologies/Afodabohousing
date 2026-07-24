import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { CheckCircle, ChevronRight } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { PageHeader } from "@/src/components/PageHeader";
import { Card } from "@/src/components/Card";
import { Button } from "@/src/components/Button";
import { LoadingState } from "@/src/components/LoadingState";
import { ErrorState } from "@/src/components/ErrorState";
import {
  useAgreementTemplate,
  useBuildAgreement,
} from "@/src/hooks/useAgreements";
import { useTenancy } from "@/src/hooks/useTenancies";

export default function AgreementSummaryScreen() {
  const { leaseId } = useLocalSearchParams<{ leaseId: string }>();
  const { data: template, isLoading: templateLoading, isError: templateError } = useAgreementTemplate();
  const { data: lease, isLoading: leaseLoading, isError: leaseError } = useTenancy(leaseId || "");
  const buildAgreement = useBuildAgreement();

  const [successState, setSuccessState] = useState<{ agreementNumber: string } | null>(null);

  const isLoading = templateLoading || leaseLoading;
  const isError = templateError || leaseError;

  const standardClauses = template?.standard_clauses.filter((c) => c.enabled_by_default) ?? [];
  const customClausesCount = 0;

  const handleGenerate = async () => {
    if (!leaseId) return;
    try {
      const result = await buildAgreement.mutateAsync({
        leaseId,
        data: {
          standard_clauses: standardClauses.map((c) => ({
            key: c.key,
            title: c.title,
            content: c.content,
            enabled: true,
          })),
          custom_clauses: [],
        },
      });
      setSuccessState({ agreementNumber: result.agreement_number });
    } catch {
      // error handled by mutation
    }
  };

  if (successState) {
    return (
      <Screen scroll={false}>
        <View style={styles.successContainer}>
          <View style={styles.successIconWrap}>
            <CheckCircle size={48} color={Colors.success} />
          </View>
          <Text style={styles.successTitle}>Agreement Generated</Text>
          <Text style={styles.successSubtitle}>Agreement No.</Text>
          <Text style={styles.successNumber}>{successState.agreementNumber}</Text>
          <Text style={styles.successDesc}>
            The agreement has been saved and is ready for signatures.
          </Text>
          <View style={styles.successActions}>
            <Button
              label="Back to Tenancy"
              onPress={() => router.replace(`/tenancy-detail?id=${leaseId}`)}
              fullWidth
              size="lg"
            />
          </View>
        </View>
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen>
        <PageHeader title="Agreement Summary" onBack={() => router.back()} />
        <LoadingState message="Loading agreement data…" />
      </Screen>
    );
  }

  if (isError || !lease) {
    return (
      <Screen>
        <PageHeader title="Agreement Summary" onBack={() => router.back()} />
        <ErrorState title="Could not load data" onRetry={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <PageHeader title="Agreement Summary" onBack={() => router.back()} />

      <View style={styles.content}>
        <Card padding="md" style={styles.agreementCard}>
          <Text style={styles.agreementLabel}>Agreement Number</Text>
          <Text style={styles.agreementValue}>— (will be generated)</Text>
        </Card>

        <Card padding="md" style={styles.card}>
          <Text style={styles.sectionTitle}>Party</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tenant</Text>
            <Text style={styles.infoValue}>{lease.tenant_name || "—"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Manager</Text>
            <Text style={styles.infoValue}>{lease.manager_name || "—"}</Text>
          </View>
        </Card>

        <Card padding="md" style={styles.card}>
          <Text style={styles.sectionTitle}>Property</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Title</Text>
            <Text style={styles.infoValue}>{lease.property_title}</Text>
          </View>
          {lease.unit_label && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Unit</Text>
              <Text style={styles.infoValue}>{lease.unit_label}</Text>
            </View>
          )}
        </Card>

        <Card padding="md" style={styles.card}>
          <Text style={styles.sectionTitle}>Rent & Dates</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Monthly Rent</Text>
            <Text style={styles.infoValue}>UGX {lease.monthly_rent.toLocaleString()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Deposit</Text>
            <Text style={styles.infoValue}>
              {lease.security_deposit ? `UGX ${lease.security_deposit.toLocaleString()}` : "—"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Start Date</Text>
            <Text style={styles.infoValue}>{lease.start_date}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>End Date</Text>
            <Text style={styles.infoValue}>{lease.end_date}</Text>
          </View>
        </Card>

        <Card padding="md" style={styles.card}>
          <Text style={styles.sectionTitle}>Clauses</Text>
          <Text style={styles.clauseCount}>
            {standardClauses.length} Standard + {customClausesCount} Custom clauses
          </Text>
          {template && (
            <Text style={styles.templateName}>Template: {template.name}</Text>
          )}
        </Card>

        <View style={styles.actions}>
          <Button
            label="View Full Agreement"
            onPress={() => router.push(`/agreement-preview?leaseId=${leaseId}`)}
            variant="outline"
            fullWidth
            size="lg"
            rightIcon={<ChevronRight size={20} color={Colors.primary} />}
          />
          <View style={{ height: Spacing.md }} />
          <Button
            label="Generate & Save Agreement"
            onPress={handleGenerate}
            fullWidth
            size="lg"
            loading={buildAgreement.isPending}
            disabled={buildAgreement.isPending}
          />
        </View>
      </View>

      <View style={{ height: Spacing.xxl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  agreementCard: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  agreementLabel: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
    marginBottom: Spacing.xs,
  },
  agreementValue: {
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  card: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.bold,
    color: Colors.accent,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  infoLabel: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    flex: 1,
  },
  infoValue: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    flex: 2,
    textAlign: "right",
  },
  propertyTitle: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  clauseCount: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  templateName: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  actions: {
    marginTop: Spacing.lg,
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  successIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.successSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  successTitle: {
    fontSize: FontSize.title,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  successSubtitle: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
    marginBottom: Spacing.xs,
  },
  successNumber: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  successDesc: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  successActions: {
    width: "100%",
    paddingHorizontal: Spacing.md,
  },
});
