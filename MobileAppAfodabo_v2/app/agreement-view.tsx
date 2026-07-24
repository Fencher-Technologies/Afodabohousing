import { StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { CheckCircle, Clock, XCircle } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { PageHeader } from "@/src/components/PageHeader";
import { Card } from "@/src/components/Card";
import { Badge } from "@/src/components/Badge";
import { Button } from "@/src/components/Button";
import { LoadingState } from "@/src/components/LoadingState";
import { ErrorState } from "@/src/components/ErrorState";
import { AgreementRenderer } from "@/src/components/AgreementRenderer";
import {
  useAgreementContent,
  useConsentState,
} from "@/src/hooks/useAgreements";
import type { AgreementStatus } from "@/src/types";

const STATUS_CONFIG: Record<AgreementStatus, { label: string; tone: "success" | "warning" | "danger" | "info" | "muted" }> = {
  draft: { label: "Draft", tone: "muted" },
  awaiting_tenant_consent: { label: "Awaiting Tenant Consent", tone: "warning" },
  awaiting_manager_consent: { label: "Awaiting Manager Consent", tone: "warning" },
  executed: { label: "Executed", tone: "success" },
  superseded: { label: "Superseded", tone: "info" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export default function AgreementViewScreen() {
  const { leaseId } = useLocalSearchParams<{ leaseId: string }>();

  const {
    data: content,
    isLoading: contentLoading,
    isError: contentError,
  } = useAgreementContent(leaseId);

  const {
    data: consentState,
    isLoading: consentLoading,
    isError: consentError,
  } = useConsentState(leaseId);

  const isLoading = contentLoading && consentLoading;
  const displayContent = content || consentState?.content || null;

  if (isLoading) {
    return (
      <Screen>
        <PageHeader title="Agreement" onBack={() => router.back()} />
        <LoadingState message="Loading agreement…" />
      </Screen>
    );
  }

  if (!displayContent) {
    return (
      <Screen>
        <PageHeader title="Agreement" onBack={() => router.back()} />
        <ErrorState title="Could not load agreement" onRetry={() => router.back()} />
      </Screen>
    );
  }

  const status: AgreementStatus =
    (consentState?.current_document?.status as AgreementStatus) || "draft";
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;

  const tenantConsent = consentState?.tenant;
  const managerConsent = consentState?.manager;
  const tenantSigned = !!tenantConsent?.signed_name;
  const managerSigned = !!managerConsent?.signed_name;

  return (
    <Screen scroll>
      <PageHeader
        title={`Agreement #${displayContent.agreement_number || "—"}`}
        subtitle={`Version ${displayContent.version}`}
        onBack={() => router.back()}
      />

      <View style={styles.content}>
        <Card padding="md" style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status</Text>
            <Badge label={statusCfg.label} tone={statusCfg.tone} size="md" dot />
          </View>
        </Card>

        <Card padding="md">
          <Text style={styles.sectionTitle}>Signature Status</Text>

          <View style={styles.sigRow}>
            <View style={styles.sigIconWrap}>
              {tenantSigned ? (
                <CheckCircle size={20} color={Colors.success} />
              ) : (
                <Clock size={20} color={Colors.textMuted} />
              )}
            </View>
            <View style={styles.sigInfo}>
              <Text style={styles.sigLabel}>Tenant</Text>
              {tenantSigned ? (
                <Text style={styles.sigName}>{tenantConsent!.signed_name}</Text>
              ) : (
                <Text style={styles.sigPending}>Not yet signed</Text>
              )}
            </View>
            {tenantSigned && tenantConsent?.signed_at && (
              <Text style={styles.sigDate}>
                {new Date(tenantConsent.signed_at).toLocaleDateString()}
              </Text>
            )}
          </View>

          <View style={styles.sigDivider} />

          <View style={styles.sigRow}>
            <View style={styles.sigIconWrap}>
              {managerSigned ? (
                <CheckCircle size={20} color={Colors.success} />
              ) : (
                <Clock size={20} color={Colors.textMuted} />
              )}
            </View>
            <View style={styles.sigInfo}>
              <Text style={styles.sigLabel}>Manager</Text>
              {managerSigned ? (
                <Text style={styles.sigName}>{managerConsent!.signed_name}</Text>
              ) : (
                <Text style={styles.sigPending}>Not yet signed</Text>
              )}
            </View>
            {managerSigned && managerConsent?.signed_at && (
              <Text style={styles.sigDate}>
                {new Date(managerConsent.signed_at).toLocaleDateString()}
              </Text>
            )}
          </View>
        </Card>

        <Text style={styles.docTitle}>Agreement Document</Text>
        <AgreementRenderer content={displayContent} mode="view" />

        <View style={styles.historyLink}>
          <Button
            label="View Version History"
            variant="outline"
            onPress={() => router.push(`/agreement-history?leaseId=${leaseId}`)}
            fullWidth
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
  statusCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusLabel: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  sectionTitle: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
    color: Colors.accent,
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sigRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  sigIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  sigInfo: {
    flex: 1,
  },
  sigLabel: {
    fontSize: FontSize.micro,
    fontWeight: FontWeight.semibold,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sigName: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginTop: 1,
  },
  sigPending: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    fontStyle: "italic",
    marginTop: 1,
  },
  sigDate: {
    fontSize: FontSize.micro,
    color: Colors.textMuted,
  },
  sigDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
    marginLeft: 44,
  },
  docTitle: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
    color: Colors.accent,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  historyLink: {
    paddingTop: Spacing.sm,
  },
});
