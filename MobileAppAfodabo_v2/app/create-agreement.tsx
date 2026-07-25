import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View, Alert, Switch } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { FileText, Plus, X } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { PageHeader } from "@/src/components/PageHeader";
import { Card } from "@/src/components/Card";
import { Button } from "@/src/components/Button";
import { InputField } from "@/src/components/InputField";
import { LoadingState } from "@/src/components/LoadingState";
import { ErrorState } from "@/src/components/ErrorState";
import { useAgreementTemplate, useAgreementContent, useEditAgreement } from "@/src/hooks/useAgreements";
import { useTenancy } from "@/src/hooks/useTenancies";
import type {
  AgreementCustomClause,
  AgreementStandardClause,
  AgreementTemplateClause,
} from "@/src/types";

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return `UGX ${amount.toLocaleString("en-UG")}`;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-UG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function capitalize(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function CreateAgreementScreen() {
  const { leaseId, mode } = useLocalSearchParams<{ leaseId: string; mode?: string }>();
  const isEdit = mode === "edit";

  const { data: template, isLoading: templateLoading, isError: templateError } = useAgreementTemplate();
  const { data: lease, isLoading: leaseLoading, isError: leaseError } = useTenancy(leaseId || "");
  const { data: existingContent, isLoading: contentLoading } = useAgreementContent(isEdit ? leaseId : undefined);
  const editAgreement = useEditAgreement();

  const [standardClauses, setStandardClauses] = useState<AgreementStandardClause[]>([]);
  const [customClauses, setCustomClauses] = useState<AgreementCustomClause[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Pre-fill from existing content (edit mode) or template defaults (create mode)
  useEffect(() => {
    if (initialized) return;

    if (isEdit && existingContent) {
      setStandardClauses(
        existingContent.standard_clauses?.map((c: AgreementStandardClause) => ({
          key: c.key,
          title: c.title,
          content: c.content,
          enabled: c.enabled,
        })) ?? [],
      );
      setCustomClauses(
        existingContent.custom_clauses?.map((c: AgreementCustomClause) => ({
          title: c.title,
          content: c.content,
        })) ?? [],
      );
      setInitialized(true);
    } else if (isEdit && !contentLoading && !existingContent && template?.standard_clauses) {
      // Edit mode but content unavailable (404) — fallback to template
      setStandardClauses(
        template.standard_clauses.map((clause: AgreementTemplateClause) => ({
          key: clause.key,
          title: clause.title,
          content: clause.content,
          enabled: clause.optional ? clause.enabled_by_default : true,
        })),
      );
      setInitialized(true);
    } else if (!isEdit && template?.standard_clauses) {
      setStandardClauses(
        template.standard_clauses.map((clause: AgreementTemplateClause) => ({
          key: clause.key,
          title: clause.title,
          content: clause.content,
          enabled: clause.optional ? clause.enabled_by_default : true,
        })),
      );
      setInitialized(true);
    }
  }, [template, existingContent, initialized, isEdit, contentLoading]);

  const handleToggleClause = useCallback((key: string) => {
    setStandardClauses((prev) =>
      prev.map((c) => (c.key === key ? { ...c, enabled: !c.enabled } : c)),
    );
  }, []);

  const handleClauseContentChange = useCallback((key: string, content: string) => {
    setStandardClauses((prev) =>
      prev.map((c) => (c.key === key ? { ...c, content } : c)),
    );
  }, []);

  const handleAddCustomClause = useCallback(() => {
    setCustomClauses((prev) => [...prev, { title: "", content: "" }]);
  }, []);

  const handleRemoveCustomClause = useCallback((index: number) => {
    setCustomClauses((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleCustomClauseChange = useCallback(
    (index: number, field: "title" | "content", value: string) => {
      setCustomClauses((prev) =>
        prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
      );
    },
    [],
  );

  const handlePreview = useCallback(() => {
    if (!leaseId) {
      Alert.alert("Error", "No lease ID provided.");
      return;
    }

    const enabledClauses = standardClauses.filter((c) => c.enabled);
    if (enabledClauses.length === 0 && customClauses.length === 0) {
      Alert.alert("Missing Clauses", "Add at least one clause to the agreement.");
      return;
    }

    router.push({
      pathname: "/agreement-summary",
      params: {
        leaseId,
        mode: isEdit ? "edit" : undefined,
        standardClauses: JSON.stringify(enabledClauses),
        customClauses: JSON.stringify(customClauses),
      },
    });
  }, [leaseId, standardClauses, customClauses, isEdit]);

  const handleSaveChanges = useCallback(async () => {
    if (!leaseId) return;
    const enabledClauses = standardClauses.filter((c) => c.enabled);
    if (enabledClauses.length === 0 && customClauses.length === 0) {
      Alert.alert("Missing Clauses", "Add at least one clause to the agreement.");
      return;
    }
    try {
      await editAgreement.mutateAsync({
        leaseId,
        data: {
          standard_clauses: enabledClauses.map((c) => ({
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
      Alert.alert("Agreement Updated", "All signatures have been reset. Both parties must consent again.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      // handled by mutation
    }
  }, [leaseId, standardClauses, customClauses, editAgreement]);

  const isLoading = templateLoading || leaseLoading;

  if (isLoading) {
    return <LoadingState message="Loading agreement data…" />;
  }

  if (templateError || leaseError || !lease) {
    return (
      <Screen scroll>
        <PageHeader title={isEdit ? "Edit Agreement" : "Create Agreement"} onBack={() => router.back()} />
        <ErrorState
          title="Failed to load data"
          description="Could not load the tenancy or agreement template."
          onRetry={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <PageHeader title={isEdit ? "Edit Agreement" : "Create Agreement"} onBack={() => router.back()} />

      <View style={styles.content}>
        {/* ── Section 1: Auto-populated Tenancy Info ── */}
        <Text style={styles.sectionTitle}>1. Tenancy Information</Text>
        <Card padding="md" style={styles.cardSpacing}>
          <Text style={styles.cardSectionLabel}>Tenant</Text>
          <InfoRow label="Name" value={lease.tenant_name || "—"} />
          <InfoRow label="Email" value={lease.tenant_email || "—"} />
          <InfoRow label="Phone" value={lease.tenant_phone || "—"} />

          <View style={styles.divider} />

          <Text style={styles.cardSectionLabel}>Manager</Text>
          <InfoRow label="Name" value={lease.manager_name || "—"} />
          <InfoRow label="Email" value={lease.manager_email || "—"} />
        </Card>

        <Card padding="md" style={styles.cardSpacing}>
          <Text style={styles.cardSectionLabel}>Property</Text>
          <InfoRow label="Title" value={lease.property_title || "—"} />

          <View style={styles.divider} />

          <Text style={styles.cardSectionLabel}>Lease Terms</Text>
          <InfoRow
            label="Monthly Rent"
            value={formatCurrency(lease.rent_amount)}
          />
          <InfoRow
            label="Deposit"
            value={
              lease.deposit_amount != null
                ? formatCurrency(lease.deposit_amount)
                : "—"
            }
          />
          <InfoRow label="Start Date" value={formatDate(lease.rent_start_date)} />
          <InfoRow label="End Date" value={formatDate(lease.rent_end_date)} />
          <InfoRow
            label="Payment Frequency"
            value={capitalize(lease.rent_period || "monthly")}
          />
        </Card>

        {/* ── Section 2: Standard Clauses ── */}
        <Text style={styles.sectionTitle}>2. Standard Clauses</Text>
        {standardClauses.map((clause) => (
          <Card key={clause.key} padding="md" style={styles.cardSpacing}>
            <View style={styles.clauseHeader}>
              <Text style={styles.clauseTitle}>{clause.title}</Text>
              <Switch
                value={clause.enabled}
                onValueChange={() => handleToggleClause(clause.key)}
                trackColor={{ false: Colors.borderStrong, true: Colors.primaryMuted }}
                thumbColor={clause.enabled ? Colors.primary : Colors.textMuted}
              />
            </View>
            {clause.enabled && (
              <View style={styles.clauseInput}>
                <InputField
                  value={clause.content}
                  onChangeText={(v) => handleClauseContentChange(clause.key, v)}
                  multiline
                  numberOfLines={4}
                  placeholder="Edit clause content…"
                />
              </View>
            )}
          </Card>
        ))}

        {/* ── Section 3: Custom Clauses ── */}
        <Text style={styles.sectionTitle}>3. Custom Clauses</Text>

        {customClauses.map((clause, index) => (
          <Card key={index} padding="md" style={styles.cardSpacing}>
            <View style={styles.customClauseHeader}>
              <Text style={styles.clauseTitle}>Clause {index + 1}</Text>
              <Button
                label="Remove"
                variant="ghost"
                tone="danger"
                size="sm"
                leftIcon={<X size={16} color={Colors.danger} />}
                onPress={() => handleRemoveCustomClause(index)}
              />
            </View>
            <InputField
              label="Title"
              value={clause.title}
              onChangeText={(v) => handleCustomClauseChange(index, "title", v)}
              placeholder="Clause title"
            />
            <View style={{ height: Spacing.sm }} />
            <InputField
              label="Content"
              value={clause.content}
              onChangeText={(v) => handleCustomClauseChange(index, "content", v)}
              multiline
              numberOfLines={4}
              placeholder="Clause content"
            />
          </Card>
        ))}

        <Button
          label="Add Custom Clause"
          variant="outline"
          leftIcon={<Plus size={18} color={Colors.primary} />}
          onPress={handleAddCustomClause}
          fullWidth
          style={styles.addClauseBtn}
        />

        {/* ── Action Buttons ── */}
        <View style={styles.previewSection}>
          {isEdit ? (
            <View style={styles.editActions}>
              <Button
                label="Preview Changes"
                size="lg"
                variant="outline"
                fullWidth
                leftIcon={<FileText size={20} color={Colors.primary} />}
                onPress={handlePreview}
              />
              <View style={{ height: Spacing.sm }} />
              <Button
                label="Save Changes"
                size="lg"
                fullWidth
                loading={editAgreement.isPending}
                disabled={editAgreement.isPending}
                onPress={handleSaveChanges}
              />
            </View>
          ) : (
            <Button
              label="Preview Agreement"
              size="lg"
              fullWidth
              leftIcon={<FileText size={20} color={Colors.textOnPrimary} />}
              onPress={handlePreview}
            />
          )}
        </View>
      </View>

      <View style={{ height: 100 }} />
    </Screen>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.h2,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  cardSpacing: {
    marginBottom: Spacing.sm,
  },
  cardSectionLabel: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.primaryMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  infoLabel: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
    flex: 1.5,
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  clauseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clauseTitle: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  clauseInput: {
    marginTop: Spacing.sm,
  },
  customClauseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  addClauseBtn: {
    marginTop: Spacing.sm,
  },
  previewSection: {
    marginTop: Spacing.xxl,
  },
  editActions: {
    width: "100%",
  },
});
