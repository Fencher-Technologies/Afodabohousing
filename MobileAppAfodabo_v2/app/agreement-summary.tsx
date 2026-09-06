import { useState, useMemo } from "react";
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
  useEditAgreement,
} from "@/src/hooks/useAgreements";
import { useTenancy } from "@/src/hooks/useTenancies";
import { useAuth } from "@/src/context/auth-context";
import { SubscriptionGate } from "@/src/components/SubscriptionGate";
import { getAgreementDraft, setAgreementDraft } from "@/src/state/agreement-draft";
import type { AgreementStandardClause, AgreementCustomClause } from "@/src/types";

export default function AgreementSummaryScreen() {
  const { leaseId, mode, standardClauses: rawClauses, customClauses: rawCustom } = useLocalSearchParams<{
    leaseId: string;
    mode?: string;
    standardClauses?: string;
    customClauses?: string;
  }>();
  const { data: template, isLoading: templateLoading, isError: templateError } = useAgreementTemplate();
  const { data: lease, isLoading: leaseLoading, isError: leaseError } = useTenancy(leaseId || "");
  const { subscription } = useAuth();
  const buildAgreement = useBuildAgreement();
  const editAgreement = useEditAgreement();

  const isEdit = mode === "edit";
  const isExpired = subscription?.status !== "active";

  const [successState, setSuccessState] = useState<{ agreementNumber: string } | null>(null);
  const [showGate, setShowGate] = useState(false);

  const isLoading = templateLoading || leaseLoading;
  const isError = templateError || leaseError;

  // Clauses come from the in-memory draft set by create-agreement. The URL
  // params are kept only as a fallback for an already-open screen from a
  // previous build; the template fallback is last resort, and it must map
  // enabled_by_default -> enabled rather than casting, because the template
  // shape has no `enabled` field and both PDF renderers filter on it.
  const draft = getAgreementDraft(leaseId);

  const standardClauses = useMemo<AgreementStandardClause[]>(() => {
    if (draft) return draft.standardClauses;
    if (rawClauses) {
      try { return JSON.parse(rawClauses) as AgreementStandardClause[]; } catch { /* fall through */ }
    }
    return (template?.standard_clauses ?? [])
      .filter((c) => (c.optional ? c.enabled_by_default : true))
      .map((c) => ({
        key: c.key,
        title: c.title,
        content: c.content,
        enabled: true,
      }));
  }, [draft, rawClauses, template]);

  const customClauses = useMemo<AgreementCustomClause[]>(() => {
    if (draft) return draft.customClauses;
    if (rawCustom) {
      try { return JSON.parse(rawCustom) as AgreementCustomClause[]; } catch { /* fall through */ }
    }
    return [];
  }, [draft, rawCustom]);

  const mutation = isEdit ? editAgreement : buildAgreement;

  const handleGenerate = async () => {
    if (isExpired) {
      setShowGate(true);
      return;
    }
    if (!leaseId) return;
    try {
      const result = await mutation.mutateAsync({
        leaseId,
        data: {
          standard_clauses: standardClauses.map((c) => ({
            key: c.key,
            title: c.title,
            content: c.content,
            enabled: c.enabled,
          })),
          custom_clauses: customClauses.map((c) => ({
            title: c.title,
            content: c.content,
          })),
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
          <Text style={styles.successTitle}>{isEdit ? "Agreement Updated" : "Agreement Generated"}</Text>
          <Text style={styles.successSubtitle}>Agreement No.</Text>
          <Text style={styles.successNumber}>{successState.agreementNumber}</Text>
          <Text style={styles.successDesc}>
            {isEdit
              ? "The agreement has been updated. All signatures have been reset — both parties must consent again."
              : "The agreement has been saved and is ready for signatures."}
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
        <PageHeader title={isEdit ? "Edit Agreement" : "Agreement Summary"} onBack={() => router.back()} />
        <LoadingState message="Loading agreement data…" />
      </Screen>
    );
  }

  if (isError || !lease) {
    return (
      <Screen>
        <PageHeader title={isEdit ? "Edit Agreement" : "Agreement Summary"} onBack={() => router.back()} />
        <ErrorState title="Could not load data" onRetry={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <PageHeader title={isEdit ? "Edit Agreement" : "Agreement Summary"} onBack={() => router.back()} />

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
            {standardClauses.length} Standard + {customClauses.length} Custom clauses
          </Text>
          {template && (
            <Text style={styles.templateName}>Template: {template.name}</Text>
          )}
        </Card>

        <View style={styles.actions}>
          <Button
            label="View Full Agreement"
            onPress={() => {
              if (leaseId) {
                setAgreementDraft({ leaseId, standardClauses, customClauses });
              }
              router.push({
                pathname: "/agreement-preview",
                params: { leaseId, mode: isEdit ? "edit" : undefined },
              });
            }}
            variant="outline"
            fullWidth
            size="lg"
            rightIcon={<ChevronRight size={20} color={Colors.primary} />}
          />
          <View style={{ height: Spacing.md }} />
          <Button
            label={isEdit ? "Save Changes" : "Generate & Save Agreement"}
            onPress={handleGenerate}
            fullWidth
            size="lg"
            loading={mutation.isPending}
            disabled={mutation.isPending}
          />
        </View>
      </View>

      <View style={{ height: Spacing.xxl }} />

      <SubscriptionGate
        visible={showGate}
        actionLabel="saving agreements"
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
    backgroundColor: Colors.surfaceAlt,
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
