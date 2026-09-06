import { useMemo, useState } from "react";
import { StyleSheet, View, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { PageHeader } from "@/src/components/PageHeader";
import { Button } from "@/src/components/Button";
import { LoadingState } from "@/src/components/LoadingState";
import { ErrorState } from "@/src/components/ErrorState";
import { AgreementRenderer } from "@/src/components/AgreementRenderer";
import { SubscriptionGate } from "@/src/components/SubscriptionGate";
import { useAgreementTemplate, useBuildAgreement, useEditAgreement } from "@/src/hooks/useAgreements";
import { useTenancy } from "@/src/hooks/useTenancies";
import { useAuth } from "@/src/context/auth-context";
import { getAgreementDraft } from "@/src/state/agreement-draft";
import type {
  AgreementContent,
  AgreementTenantInfo,
  AgreementManagerInfo,
  AgreementPropertyInfo,
  AgreementTenancyInfo,
  AgreementStandardClause,
  AgreementCustomClause,
} from "@/src/types";

export default function AgreementPreviewScreen() {
  const { leaseId, mode, standardClauses: rawClauses, customClauses: rawCustom } = useLocalSearchParams<{
    leaseId: string;
    mode?: string;
    standardClauses?: string;
    customClauses?: string;
  }>();
  const isEdit = mode === "edit";
  const { subscription } = useAuth();
  const isExpired = subscription?.status !== "active";
  const [showGate, setShowGate] = useState(false);

  const {
    data: template,
    isLoading: templateLoading,
    isError: templateError,
  } = useAgreementTemplate();
  const {
    data: lease,
    isLoading: leaseLoading,
    isError: leaseError,
  } = useTenancy(leaseId || "");

  const buildAgreement = useBuildAgreement();
  const editAgreement = useEditAgreement();

  const isLoading = templateLoading || leaseLoading;

  // Parse draft clauses from URL params if provided
  // The in-memory draft is authoritative; params remain only as a fallback.
  const draft = getAgreementDraft(leaseId);

  const draftStandardClauses = useMemo<AgreementStandardClause[] | null>(() => {
    if (draft) return draft.standardClauses;
    if (rawClauses) {
      try { return JSON.parse(rawClauses) as AgreementStandardClause[]; } catch { return null; }
    }
    return null;
  }, [draft, rawClauses]);

  const draftCustomClauses = useMemo<AgreementCustomClause[] | null>(() => {
    if (draft) return draft.customClauses;
    if (rawCustom) {
      try { return JSON.parse(rawCustom) as AgreementCustomClause[]; } catch { return null; }
    }
    return null;
  }, [draft, rawCustom]);

  const previewContent = useMemo<AgreementContent | null>(() => {
    if (!template || !lease) return null;

    const tenantInfo: AgreementTenantInfo = {
      full_name: lease.tenant_name || "Tenant",
      email: lease.tenant_email,
      phone: lease.tenant_phone,
    };

    const managerInfo: AgreementManagerInfo = {
      full_name: lease.manager_name || "Manager",
      email: lease.manager_email,
      phone: lease.manager_phone,
    };

    const propertyInfo: AgreementPropertyInfo = {
      title: lease.property_title || "Property",
      address: null,
      city: null,
      amenities: [],
    };

    const tenancyInfo: AgreementTenancyInfo = {
      monthly_rent: String(lease.monthly_rent),
      security_deposit: String(lease.security_deposit || 0),
      start_date: lease.start_date,
      end_date: lease.end_date,
      payment_frequency: "Monthly",
    };

    // Use draft clauses from params if provided (edit preview), else template defaults
    const standardClauses = draftStandardClauses ?? template.standard_clauses
      .filter((c) => (c.optional ? c.enabled_by_default : true))
      .map((c) => ({
        key: c.key,
        title: c.title,
        content: c.content,
        enabled: true,
      }));

    const customClauses = draftCustomClauses ?? [];

    return {
      agreement_number: "",
      version: 1,
      generated_at: null,
      tenant: tenantInfo,
      manager: managerInfo,
      property: propertyInfo,
      tenancy: tenancyInfo,
      standard_clauses: standardClauses,
      custom_clauses: customClauses,
      signatures: {},
    };
  }, [template, lease, draftStandardClauses, draftCustomClauses]);

  const handleGenerate = async () => {
    if (isExpired) {
      setShowGate(true);
      return;
    }
    if (!leaseId || !template) return;
    try {
      // Generate exactly what the manager assembled. This previously rebuilt
      // from template defaults, which silently reinstated clauses they had
      // switched off and discarded any edits to clause text.
      const standardClauses =
        draftStandardClauses ??
        template.standard_clauses
          .filter((c) => (c.optional ? c.enabled_by_default : true))
          .map((c) => ({
            key: c.key,
            title: c.title,
            content: c.content,
            enabled: true,
          }));

      await buildAgreement.mutateAsync({
        leaseId,
        data: {
          standard_clauses: standardClauses.filter((c) => c.enabled),
          custom_clauses: draftCustomClauses ?? [],
        },
      });

      router.replace(`/tenancy-detail?id=${leaseId}`);
    } catch {
      // error handled by mutation
    }
  };

  const handleSaveChanges = async () => {
    if (isExpired) {
      setShowGate(true);
      return;
    }
    if (!leaseId || !draftStandardClauses) return;
    try {
      await editAgreement.mutateAsync({
        leaseId,
        data: {
          standard_clauses: draftStandardClauses.map((c) => ({
            key: c.key,
            title: c.title,
            content: c.content,
            enabled: c.enabled,
          })),
          custom_clauses: (draftCustomClauses ?? []).map((c) => ({
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
  };

  if (isLoading) {
    return (
      <Screen>
        <PageHeader title="Agreement Preview" onBack={() => router.back()} />
        <LoadingState message="Loading agreement…" />
      </Screen>
    );
  }

  if (!previewContent || templateError || leaseError) {
    return (
      <Screen>
        <PageHeader title="Agreement Preview" onBack={() => router.back()} />
        <ErrorState title="Could not load agreement data" onRetry={() => router.back()} />
      </Screen>
    );
  }

  const mutation = isEdit ? editAgreement : buildAgreement;

  return (
    <Screen scroll>
      <PageHeader title="Agreement Preview" onBack={() => router.back()} subtitle={isEdit ? "Draft changes" : "Unpublished draft"} />

      <AgreementRenderer content={previewContent} mode="preview" />

      <View style={styles.footer}>
        {isEdit ? (
          <Button
            label="Save Changes"
            onPress={handleSaveChanges}
            fullWidth
            size="lg"
            loading={mutation.isPending}
            disabled={mutation.isPending}
          />
        ) : (
          <Button
            label="Generate & Save Agreement"
            onPress={handleGenerate}
            fullWidth
            size="lg"
            loading={mutation.isPending}
            disabled={mutation.isPending}
          />
        )}
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
  footer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
  },
});
