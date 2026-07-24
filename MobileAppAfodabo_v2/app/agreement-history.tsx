import { StyleSheet, Text, View, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { FileText, History, CheckCircle, Clock } from "lucide-react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Screen } from "@/src/components/Screen";
import { PageHeader } from "@/src/components/PageHeader";
import { Card } from "@/src/components/Card";
import { Badge } from "@/src/components/Badge";
import { Button } from "@/src/components/Button";
import { LoadingState } from "@/src/components/LoadingState";
import { EmptyState } from "@/src/components/EmptyState";
import { useAgreementVersionHistory } from "@/src/hooks/useAgreements";
import type { AgreementStatus, AgreementVersionMinimal } from "@/src/types";

const STATUS_CONFIG: Record<AgreementStatus, { label: string; tone: "success" | "warning" | "danger" | "info" | "muted" }> = {
  draft: { label: "Draft", tone: "muted" },
  awaiting_tenant_consent: { label: "Awaiting Tenant Consent", tone: "warning" },
  awaiting_manager_consent: { label: "Awaiting Manager Consent", tone: "warning" },
  executed: { label: "Executed", tone: "success" },
  superseded: { label: "Superseded", tone: "info" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

function VersionCard({
  version,
  isActive,
  onPress,
}: {
  version: AgreementVersionMinimal;
  isActive: boolean;
  onPress: () => void;
}) {
  const statusCfg = STATUS_CONFIG[version.status] || STATUS_CONFIG.draft;

  const cardStyle = isActive
    ? { ...styles.versionCard, ...styles.activeCard }
    : styles.versionCard;

  return (
    <Pressable onPress={onPress}>
      <Card padding="md" style={cardStyle}>
        <View style={styles.versionHeader}>
          <View style={styles.versionInfo}>
            <Text style={styles.versionNumber}>
              Version {version.version}
              {isActive && (
                <Text style={styles.activeLabel}> · Active</Text>
              )}
            </Text>
            {version.agreement_number && (
              <Text style={styles.agreementNumber}>
                No. {version.agreement_number}
              </Text>
            )}
          </View>
          <Badge label={statusCfg.label} tone={statusCfg.tone} size="sm" dot />
        </View>

        <View style={styles.sigRow}>
          <View style={styles.sigItem}>
            {version.tenant_signed ? (
              <CheckCircle size={14} color={Colors.success} />
            ) : (
              <Clock size={14} color={Colors.textMuted} />
            )}
            <Text style={styles.sigText}>
              Tenant{version.tenant_signed_name ? ` (${version.tenant_signed_name})` : ""}
            </Text>
          </View>
          <View style={styles.sigItem}>
            {version.manager_signed ? (
              <CheckCircle size={14} color={Colors.success} />
            ) : (
              <Clock size={14} color={Colors.textMuted} />
            )}
            <Text style={styles.sigText}>
              Manager{version.manager_signed_name ? ` (${version.manager_signed_name})` : ""}
            </Text>
          </View>
        </View>

        <Text style={styles.dateText}>
          Created: {new Date(version.created_at).toLocaleDateString()}
        </Text>
      </Card>
    </Pressable>
  );
}

export default function AgreementHistoryScreen() {
  const { leaseId } = useLocalSearchParams<{ leaseId: string }>();

  const {
    data: history,
    isLoading,
    isError,
  } = useAgreementVersionHistory(leaseId);

  if (isLoading) {
    return (
      <Screen>
        <PageHeader title="Version History" onBack={() => router.back()} />
        <LoadingState message="Loading version history…" />
      </Screen>
    );
  }

  if (isError || !history) {
    return (
      <Screen>
        <PageHeader title="Version History" onBack={() => router.back()} />
        <EmptyState
          icon={<History size={32} color={Colors.accent} />}
          title="Could not load version history"
          description="There was an error loading the agreement versions."
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  if (history.versions.length === 0) {
    return (
      <Screen>
        <PageHeader title="Version History" onBack={() => router.back()} />
        <EmptyState
          icon={<FileText size={32} color={Colors.accent} />}
          title="No Versions Found"
          description="No agreement versions exist for this lease."
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <PageHeader
        title="Version History"
        subtitle={`${history.versions.length} version${history.versions.length !== 1 ? "s" : ""}`}
        onBack={() => router.back()}
      />

      <View style={styles.content}>
        {history.versions.map((version) => (
          <VersionCard
            key={version.id}
            version={version}
            isActive={version.version === history.active_version}
            onPress={() =>
              router.push(`/agreement-view?leaseId=${leaseId}`)
            }
          />
        ))}
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
  versionCard: {
    gap: Spacing.sm,
  },
  activeCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  versionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  versionInfo: {
    flex: 1,
  },
  versionNumber: {
    fontSize: FontSize.h3,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  activeLabel: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    color: Colors.primary,
  },
  agreementNumber: {
    fontSize: FontSize.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  sigRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  sigItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sigText: {
    fontSize: FontSize.caption,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  dateText: {
    fontSize: FontSize.micro,
    color: Colors.textMuted,
  },
});
