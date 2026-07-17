/**
 * AgreementFlow — shared 3-stage tenancy-agreement workflow used by the
 * tenant (My Tenancy) and manager (Tenancy Detail / Dashboard) screens.
 *
 * Stages: Uploaded → Tenant Consented → Manager Consented.
 * Each stage is ticked independently and updates immediately after the
 * matching action. Consent is always tied to the active agreement version;
 * uploading a new version archives the previous one and resets consent.
 */

import { useState } from "react";
import { StyleSheet, Text, View, Pressable, Alert, Linking, ActivityIndicator } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import {
  FileText,
  FileCheck,
  CheckCircle,
  Circle,
  CircleDot,
  Upload,
  History,
  ChevronDown,
  ChevronRight,
} from "lucide-react-native";

import { Colors, FontSize, FontWeight, Radii, Spacing } from "@/constants/theme";
import { Card } from "@/src/components/Card";
import { Button } from "@/src/components/Button";
import { Badge } from "@/src/components/Badge";
import {
  useAgreementState,
  useAgreementVersions,
  useUploadAgreement,
  useConsentAgreement,
} from "@/src/hooks/useAgreements";

type Role = "tenant" | "manager";

interface AgreementFlowProps {
  leaseId: string;
  role: Role;
  managerName?: string | null;
  managerPhone?: string | null;
  managerEmail?: string | null;
  canUpload?: boolean;
  compact?: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  archived: "Archived",
  fully_executed: "Fully Executed",
  none: "No Agreement",
};

export function AgreementFlow({
  leaseId,
  role,
  managerName,
  managerPhone,
  managerEmail,
  canUpload = true,
  compact = false,
}: AgreementFlowProps) {
  const { data: state, isLoading } = useAgreementState(leaseId);
  const { data: versionsData } = useAgreementVersions(leaseId);
  const uploadAgreement = useUploadAgreement();
  const consentAgreement = useConsentAgreement();
  const [showHistory, setShowHistory] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const document = state?.document ?? null;
  const managerConsented = state?.manager_consented ?? false;
  const tenantConsented = state?.tenant_consented ?? false;
  const version = state?.version ?? 1;
  const status = state?.status ?? (document ? "active" : "none");

  // Lifecycle driven purely by concrete evidence.
  const uploaded = !!document;
  const tenantStage = uploaded && tenantConsented;
  const managerStage = uploaded && managerConsented;
  const lifecycle = !uploaded
    ? "pending"
    : !tenantConsented
    ? "uploaded"
    : !managerConsented
    ? "tenant_consented"
    : "fully_executed";

  const myConsent = role === "manager" ? managerConsented : tenantConsented;
  const otherConsented = role === "manager" ? tenantConsented : managerConsented;

  const handleViewAgreement = () => {
    const url = document?.agreement_url;
    if (!url) {
      Alert.alert("Agreement", "No agreement document is available yet.");
      return;
    }
    Linking.openURL(url).catch(() => {
      Alert.alert("Could not open", "Unable to open the agreement file.");
    });
  };

  const handleUpload = async () => {
    setUploadError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const asset = result.assets[0];
      const mimeType = asset.mimeType || "application/pdf";
      if (mimeType !== "application/pdf" && !mimeType.startsWith("image/")) {
        setUploadError("Only PDF or image files are supported.");
        return;
      }
      await uploadAgreement.mutateAsync({
        leaseId,
        fileUri: asset.uri,
        fileName: asset.name || `agreement_${leaseId}.pdf`,
        mimeType,
      });
      Alert.alert(
        "Uploaded",
        "A new agreement version was created. Both parties must review and consent again.",
      );
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Failed to upload agreement.");
    }
  };

  const handleConsent = () => {
    if (!uploaded) {
      Alert.alert("No agreement yet", "The agreement document has not been uploaded yet.");
      return;
    }
    if (myConsent) return;
    Alert.alert(
      "Consent to Agreement",
      "By consenting, you confirm you have read and agree to this tenancy agreement.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "I Consent",
          onPress: async () => {
            try {
              await consentAgreement.mutateAsync(leaseId);
              Alert.alert("Consent Recorded", "Your consent has been recorded.");
            } catch {
              Alert.alert("Error", "Could not record your consent.");
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <Card padding="md">
        <View style={styles.loadingRow}>
          <ActivityIndicator size={16} color={Colors.primary} />
          <Text style={styles.loadingText}>Loading agreement…</Text>
        </View>
      </Card>
    );
  }

  const versions = versionsData?.versions ?? [];

  return (
    <Card padding="md">
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconWrap}>
            <FileCheck size={18} color={Colors.info} />
          </View>
          <Text style={styles.title}>Tenancy Agreement</Text>
        </View>
        {uploaded && (
          <Badge
            label={STATUS_LABEL[status] ?? status}
            tone={status === "fully_executed" ? "success" : "info"}
            size="sm"
            dot={status !== "fully_executed"}
          />
        )}
      </View>

      {/* 3-stage stepper */}
      <View style={styles.stepper}>
        <Step
          icon={<Circle size={14} color={uploaded ? Colors.success : Colors.textMuted} />}
          label="Uploaded"
          done={uploaded}
          current={lifecycle === "pending"}
        />
        <StepConnector active={uploaded} />
        <Step
          icon={<CircleDot size={14} color={tenantStage ? Colors.success : Colors.textMuted} />}
          label="Tenant Consented"
          done={tenantStage}
          current={lifecycle === "uploaded"}
        />
        <StepConnector active={tenantStage} />
        <Step
          icon={<CheckCircle size={14} color={managerStage ? Colors.success : Colors.textMuted} />}
          label="Manager Consented"
          done={managerStage}
          current={lifecycle === "tenant_consented"}
        />
      </View>

      {uploaded && (
        <Text style={styles.versionText}>Version {version}</Text>
      )}

      {document && (
        <Pressable
          onPress={handleViewAgreement}
          style={styles.agreementLink}
          accessibilityRole="button"
          accessibilityLabel="View agreement"
        >
          <FileText size={18} color={Colors.info} />
          <Text style={styles.agreementLinkText} numberOfLines={1}>
            {document.file_name}
          </Text>
          <ChevronRight size={16} color={Colors.textMuted} />
        </Pressable>
      )}

      {/* Consent status — always visible when a document exists */}
      {uploaded && (
        <View style={styles.consentStatusWrap}>
          <View style={styles.consentStatusCol}>
            <Text style={styles.consentStatusLabel}>Tenant</Text>
            <Text style={[styles.consentStatusValue, tenantConsented && styles.consentDone]}>
              {tenantConsented ? "✓ Consented" : "— Awaiting"}
            </Text>
          </View>
          <View style={styles.consentStatusCol}>
            <Text style={styles.consentStatusLabel}>Manager</Text>
            <Text style={[styles.consentStatusValue, managerConsented && styles.consentDone]}>
              {managerConsented ? "✓ Consented" : "— Awaiting"}
            </Text>
          </View>
        </View>
      )}

      {/* Actions */}
      {canUpload && (
        <Button
          label={uploadAgreement.isPending ? "Uploading…" : uploaded ? "Upload New Version" : "Upload Agreement"}
          onPress={handleUpload}
          variant="outline"
          size="sm"
          disabled={uploadAgreement.isPending}
          leftIcon={
            uploadAgreement.isPending ? (
              <ActivityIndicator size={16} color={Colors.primary} />
            ) : (
              <Upload size={16} color={Colors.primary} />
            )
          }
        />
      )}

      {uploaded && !myConsent && (
        <Button
          label={consentAgreement.isPending ? "Consenting…" : role === "manager" ? "Consent as Manager" : "Consent as Tenant"}
          onPress={handleConsent}
          size="sm"
          disabled={consentAgreement.isPending}
          leftIcon={
            consentAgreement.isPending ? (
              <ActivityIndicator size={16} color={Colors.textOnPrimary} />
            ) : (
              <CheckCircle size={16} color={Colors.textOnPrimary} />
            )
          }
        />
      )}

      {uploaded && myConsent && !otherConsented && (
        <View style={styles.awaitingRow}>
          <Text style={styles.awaitingText}>
            {role === "manager" ? "Awaiting tenant consent" : "Awaiting manager consent"}
          </Text>
        </View>
      )}

      {uploadError && <Text style={styles.uploadError}>{uploadError}</Text>}

      {/* Version history */}
      {versions.length > 0 && (
        <View style={styles.historyWrap}>
          <Pressable
            onPress={() => setShowHistory((v) => !v)}
            style={styles.historyToggle}
            accessibilityRole="button"
            accessibilityLabel="Toggle version history"
          >
            <History size={16} color={Colors.textMuted} />
            <Text style={styles.historyToggleText}>Version History ({versions.length})</Text>
            {showHistory ? (
              <ChevronDown size={16} color={Colors.textMuted} />
            ) : (
              <ChevronRight size={16} color={Colors.textMuted} />
            )}
          </Pressable>
          {showHistory && (
            <View style={styles.historyList}>
              {versions.map((v) => (
                <Pressable
                  key={v.id}
                  onPress={() => {
                    if (v.agreement_url) Linking.openURL(v.agreement_url).catch(() => {});
                  }}
                  style={styles.historyItem}
                  accessibilityRole="button"
                  accessibilityLabel={`Version ${v.version}`}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyVersion}>Version {v.version}</Text>
                    <Text style={styles.historyMeta}>
                      {v.tenant_consented ? "Tenant ✓" : "Tenant —"} ·{" "}
                      {v.manager_consented ? "Manager ✓" : "Manager —"}
                    </Text>
                  </View>
                  <Badge
                    label={STATUS_LABEL[v.status] ?? v.status}
                    tone={v.status === "fully_executed" ? "success" : v.status === "archived" ? "muted" : "info"}
                    size="sm"
                  />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}
    </Card>
  );
}

function Step({
  icon,
  label,
  done,
  current,
}: {
  icon: React.ReactNode;
  label: string;
  done: boolean;
  current: boolean;
}) {
  return (
    <View style={styles.step}>
      {icon}
      <Text style={[styles.stepLabel, current && styles.stepLabelActive, done && styles.stepLabelDone]}>
        {label}
      </Text>
    </View>
  );
}

function StepConnector({ active }: { active: boolean }) {
  return <View style={[styles.stepConnector, active && styles.stepConnectorActive]} />;
}

const styles = StyleSheet.create({
  loadingRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  loadingText: { fontSize: FontSize.caption, color: Colors.textMuted },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: FontSize.body, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  stepper: { flexDirection: "row", alignItems: "center", marginTop: Spacing.md },
  step: { alignItems: "center", gap: 3, maxWidth: 92 },
  stepLabel: {
    fontSize: FontSize.micro,
    color: Colors.textMuted,
    fontWeight: FontWeight.medium,
    textAlign: "center",
  },
  stepLabelActive: { color: Colors.primary },
  stepLabelDone: { color: Colors.success },
  stepConnector: { flex: 1, height: 2, backgroundColor: Colors.border, marginHorizontal: 4 },
  stepConnectorActive: { backgroundColor: Colors.success },
  versionText: { fontSize: FontSize.caption, color: Colors.textMuted, marginTop: Spacing.xs },
  agreementLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  agreementLinkText: { flex: 1, fontSize: FontSize.body, color: Colors.info, fontWeight: FontWeight.semibold },
  awaitingRow: { marginTop: Spacing.sm },
  awaitingText: { fontSize: FontSize.caption, color: Colors.warning, fontWeight: FontWeight.semibold },
  uploadError: { fontSize: FontSize.caption, color: Colors.danger, marginTop: Spacing.xs },
  consentStatusWrap: {
    flexDirection: "row",
    gap: Spacing.xl,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  consentStatusCol: { gap: 2 },
  consentStatusLabel: { fontSize: FontSize.micro, color: Colors.textMuted, fontWeight: FontWeight.medium },
  consentStatusValue: { fontSize: FontSize.caption, color: Colors.textMuted, fontWeight: FontWeight.semibold },
  consentDone: { color: Colors.success },
  historyWrap: { marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm },
  historyToggle: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  historyToggleText: { flex: 1, fontSize: FontSize.caption, color: Colors.textSecondary, fontWeight: FontWeight.semibold },
  historyList: { gap: Spacing.sm, marginTop: Spacing.sm },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radii.card,
    padding: Spacing.sm,
  },
  historyVersion: { fontSize: FontSize.caption, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  historyMeta: { fontSize: FontSize.micro, color: Colors.textMuted, marginTop: 2 },
});
