import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { PageHeader } from "@/src/components/PageHeader";
import { Button } from "@/src/components/Button";
import { LoadingState } from "@/src/components/LoadingState";
import { ErrorState } from "@/src/components/ErrorState";
import { AgreementRenderer } from "@/src/components/AgreementRenderer";
import { useAgreementTemplate, useBuildAgreement } from "@/src/hooks/useAgreements";
import { useTenancy } from "@/src/hooks/useTenancies";
import type {
  AgreementContent,
  AgreementTenantInfo,
  AgreementManagerInfo,
  AgreementPropertyInfo,
  AgreementTenancyInfo,
} from "@/src/types";

export default function AgreementPreviewScreen() {
  const { leaseId } = useLocalSearchParams<{ leaseId: string }>();

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

  const isLoading = templateLoading || leaseLoading;

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

    const standardClauses = template.standard_clauses
      .filter((c) => c.enabled_by_default)
      .map((c) => ({
        key: c.key,
        title: c.title,
        content: c.content,
        enabled: true,
      }));

    return {
      agreement_number: "",
      version: 1,
      generated_at: null,
      tenant: tenantInfo,
      manager: managerInfo,
      property: propertyInfo,
      tenancy: tenancyInfo,
      standard_clauses: standardClauses,
      custom_clauses: [],
      signatures: {},
    };
  }, [template, lease]);

  const handleGenerate = async () => {
    if (!leaseId || !template) return;
    try {
      const standardClauses = template.standard_clauses
        .filter((c) => c.enabled_by_default)
        .map((c) => ({
          key: c.key,
          title: c.title,
          content: c.content,
          enabled: true,
        }));

      const result = await buildAgreement.mutateAsync({
        leaseId,
        data: {
          standard_clauses: standardClauses,
          custom_clauses: [],
        },
      });

      router.replace(`/tenancy-detail?leaseId=${leaseId}`);
    } catch {
      // error handled by mutation
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

  return (
    <Screen scroll>
      <PageHeader title="Agreement Preview" onBack={() => router.back()} subtitle="Unpublished draft" />

      <AgreementRenderer content={previewContent} mode="preview" />

      <View style={styles.footer}>
        <Button
          label="Generate & Save Agreement"
          onPress={handleGenerate}
          fullWidth
          size="lg"
          loading={buildAgreement.isPending}
          disabled={buildAgreement.isPending}
        />
      </View>

      <View style={{ height: Spacing.xxl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
  },
});
